import 'dotenv/config';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { LocalStorageDriver, cleanupOrphanedUploads } from '../src/storage.js';
import {
  calculateCustomStickerUnitPrice,
  calculateCustomPackUnitPrice,
  calculateCustomWallUnitPrice,
} from '../src/pricing.js';

const backendDir = fileURLToPath(new URL('..', import.meta.url));
const TEST_SCHEMA_URL = process.env.DATABASE_URL!.replace(/schema=public/, 'schema=stickerclub_test');

test('Phase 4: Custom artwork infrastructure, storage, upload validation, custom orders, server pricing, and cleanup', { timeout: 90000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE, 'yes', 'Refusing to run tests without disposable database flag');

  const db = new PrismaClient({
    datasources: { db: { url: TEST_SCHEMA_URL } },
  });

  // Test 1: Unit test for Storage Driver
  const storage = new LocalStorageDriver('uploads/test-artwork');
  const testBuf = Buffer.from('unit-test-data');
  const testFile = `test-${randomUUID()}.txt`;
  await storage.save(testBuf, testFile, 'text/plain');
  assert.ok(await storage.exists(testFile), 'File should exist after saving');
  const readBack = await storage.read(testFile);
  assert.equal(readBack.toString(), 'unit-test-data', 'Read buffer should match saved buffer');
  await storage.delete(testFile);
  assert.equal(await storage.exists(testFile), false, 'File should not exist after deletion');
  assert.throws(() => {
    // Path traversal check
    (storage as any).resolveSafePath('../../etc/passwd');
  }, /Path traversal attempt detected/);

  // Test 2: Unit test for Server-side Pricing calculations
  // Sticker pricing: small (25) + gloss (5) = 30
  const stickerPrice = calculateCustomStickerUnitPrice('small', 'gloss');
  assert.equal(stickerPrice.toNumber(), 30);
  // Large (49) + standard (0) = 49
  assert.equal(calculateCustomStickerUnitPrice('large', 'standard').toNumber(), 49);

  // Pack pricing: 5 pack (109) + standard (0) = 109; 10 pack (199)
  const packPrice5 = calculateCustomPackUnitPrice(5, 'standard');
  assert.equal(packPrice5.toNumber(), 109);
  const packPrice10 = calculateCustomPackUnitPrice(10, 'standard');
  assert.equal(packPrice10.toNumber(), 199);
  assert.throws(() => {
    calculateCustomPackUnitPrice(5, 'gloss');
  }, /currently unavailable/);

  // Wall pricing: compact (1 A3 [149] + 4 A5 [4 * 59 = 236]) = 385
  const wallPrice = calculateCustomWallUnitPrice('compact');
  assert.equal(wallPrice.toNumber(), 385);

  // Test 3: Integration tests via Express server
  const port = 5096;
  const origin = 'http://localhost:5173';
  const base = `http://127.0.0.1:${port}`;

  const proc = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: TEST_SCHEMA_URL,
      PORT: String(port),
      FRONTEND_ORIGIN: origin,
      NODE_ENV: 'test',
      DELIVERY_FEE: '50.00',
      MAX_UPLOAD_SIZE_MB: '5',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  proc.stdout.on('data', (b) => { logs += String(b); });
  proc.stderr.on('data', (b) => { logs += String(b); });

  const api = async (path: string, opts: RequestInit = {}, token?: string) => {
    const result = await fetch(base + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        ...opts.headers,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    const body = await result.json().catch(() => null);
    return { status: result.status, body, headers: result.headers };
  };

  const uploadFile = async (filename: string, buffer: Buffer, mime: string, token: string) => {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mime }), filename);
    const result = await fetch(base + '/api/uploads/artwork', {
      method: 'POST',
      headers: {
        Origin: origin,
        Authorization: 'Bearer ' + token,
      },
      body: formData,
    });
    const body = await result.json().catch(() => null);
    return { status: result.status, body };
  };

  try {
    // Wait for server health
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (proc.exitCode !== null) throw Error('Backend process exited early: ' + logs);
      try {
        const r = await fetch(`${base}/api/payment/config`);
        if (r.ok) { ready = true; break; }
      } catch {}
      await sleep(250);
    }
    assert.ok(ready, 'API failed boot check: ' + logs);

    // Register User A (Customer)
    const emailA = `custom-user-a-${randomUUID()}@example.test`;
    const regA = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice Customer', email: emailA, password: 'Password123!' }),
    });
    assert.equal(regA.status, 201);
    const tokenA = regA.body.accessToken as string;
    const userAId = regA.body.user.id as string;

    // Register User B (Customer - for IDOR check)
    const emailB = `custom-user-b-${randomUUID()}@example.test`;
    const regB = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob Intruder', email: emailB, password: 'Password123!' }),
    });
    assert.equal(regB.status, 201);
    const tokenB = regB.body.accessToken as string;

    // Create Admin
    const jwt = (await import('jsonwebtoken')).default;
    const adminUser = await db.user.create({
      data: {
        name: 'Phase 4 Admin',
        email: `admin-p4-${randomUUID()}@example.test`,
        passwordHash: 'dummy',
        role: 'ADMIN',
      },
    });
    const adminToken = jwt.sign({ sub: adminUser.id, role: 'ADMIN' }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '15m' });

    // Customer shipping address
    const addr = await api('/api/me/addresses', {
      method: 'POST',
      body: JSON.stringify({
        recipient: 'Alice',
        line1: '123 Art Street',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500081',
      }),
    }, tokenA);
    assert.equal(addr.status, 201);
    const addressId = addr.body.id as string;

    // --- UPLOAD TEST MATRIX ---
    // 1. Valid PNG
    const validPng = await sharp({
      create: { width: 40, height: 40, channels: 4, background: { r: 255, g: 100, b: 50, alpha: 1 } },
    }).png().toBuffer();
    const upPng = await uploadFile('my-artwork.png', validPng, 'image/png', tokenA);
    assert.equal(upPng.status, 201);
    assert.ok(upPng.body.id);
    assert.ok(upPng.body.fileName.endsWith('.png'));
    assert.notEqual(upPng.body.fileName, 'my-artwork.png', 'Server must generate random filename');
    assert.equal(upPng.body.originalName, 'my-artwork.png');
    const artworkAId = upPng.body.id as string;

    // 2. Valid JPEG
    const validJpg = await sharp({
      create: { width: 40, height: 40, channels: 3, background: { r: 50, g: 150, b: 200 } },
    }).jpeg().toBuffer();
    const upJpg = await uploadFile('photo.jpg', validJpg, 'image/jpeg', tokenA);
    assert.equal(upJpg.status, 201);
    assert.ok(upJpg.body.fileName.endsWith('.jpg'));

    // 3. Valid WebP
    const validWebp = await sharp({
      create: { width: 40, height: 40, channels: 4, background: { r: 10, g: 200, b: 50, alpha: 1 } },
    }).webp().toBuffer();
    const upWebp = await uploadFile('sticker.webp', validWebp, 'image/webp', tokenA);
    assert.equal(upWebp.status, 201);
    assert.ok(upWebp.body.fileName.endsWith('.webp'));

    // 4. Renamed .exe (PE header) -> Rejected
    const fakeExe = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00' + 'MALWAREPAYLOAD');
    const upExe = await uploadFile('innocent.png', fakeExe, 'image/png', tokenA);
    assert.equal(upExe.status, 400, 'Must reject PE executable disguised as PNG');

    // 5. SVG / XML / HTML Polyglot -> Rejected
    const svgPolyglot = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>');
    const upSvg = await uploadFile('badge.svg', svgPolyglot, 'image/svg+xml', tokenA);
    assert.equal(upSvg.status, 400, 'Must reject SVG/XML vector uploads');

    // 6. Oversized file (> 5MB configured) -> Rejected
    const bigBuf = Buffer.alloc(6 * 1024 * 1024, 0x89); // 6 MB
    const upBig = await uploadFile('huge.png', bigBuf, 'image/png', tokenA);
    assert.equal(upBig.status, 400, 'Must reject oversized file exceeding limit');

    // --- ARTWORK ACCESS & IDOR MATRIX ---
    // Owner can fetch artwork
    const ownerFetch = await fetch(`${base}/api/uploads/artwork/${artworkAId}/file`, {
      headers: { Authorization: 'Bearer ' + tokenA, Origin: origin },
    });
    assert.equal(ownerFetch.status, 200, 'Owner must be able to view their artwork');
    assert.equal(ownerFetch.headers.get('content-type'), 'image/png');

    // Admin can fetch artwork
    const adminFetch = await fetch(`${base}/api/uploads/artwork/${artworkAId}/file`, {
      headers: { Authorization: 'Bearer ' + adminToken, Origin: origin },
    });
    assert.equal(adminFetch.status, 200, 'Admin must be able to view customer artwork for fulfillment');

    // Bob (another customer) is blocked from fetching Alice's artwork
    const intruderFetch = await fetch(`${base}/api/uploads/artwork/${artworkAId}/file`, {
      headers: { Authorization: 'Bearer ' + tokenB, Origin: origin },
    });
    assert.equal(intruderFetch.status, 403, 'Non-owner non-admin must receive 403 Forbidden');

    // Unauthenticated user is blocked
    const anonFetch = await fetch(`${base}/api/uploads/artwork/${artworkAId}/file`, {
      headers: { Origin: origin },
    });
    assert.equal(anonFetch.status, 401, 'Anonymous user must receive 401 Unauthorized');

    // --- ORDER PLACEMENT WITH CUSTOM LINES & SERVER PRICING ---
    // IDOR Check: Bob tries to place an order using Alice's artwork
    const addrB = await api('/api/me/addresses', {
      method: 'POST',
      body: JSON.stringify({ recipient: 'Bob', line1: '456 Hack Rd', city: 'Hyd', state: 'TS', postalCode: '500001' }),
    }, tokenB);
    const idorOrder = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({
        addressId: addrB.body.id,
        paymentMethod: 'COD',
        customLines: [
          {
            type: 'custom-sticker',
            artworkId: artworkAId, // Belongs to Alice!
            sizeId: 'medium',
            finishId: 'standard',
            shape: 'rounded',
            quantity: 3,
          },
        ],
      }),
    }, tokenB);
    assert.equal(idorOrder.status, 403, 'Placing order with unowned artwork must fail with 403');

    // Valid Custom Order by Alice:
    // Custom Sticker: 2 x (medium [35] + gloss [5]) = 2 * 40 = 80
    // Delivery fee = 50.00 -> Total = 130.00
    const aliceOrder = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({
        addressId,
        paymentMethod: 'UPI',
        customLines: [
          {
            type: 'custom-sticker',
            artworkId: artworkAId,
            sizeId: 'medium',
            finishId: 'gloss',
            shape: 'rounded',
            quantity: 2,
          },
        ],
      }),
    }, tokenA);

    assert.equal(aliceOrder.status, 201, 'Custom order creation should succeed');
    assert.equal(Number(aliceOrder.body.subtotal), 80, 'Server-side subtotal must match exact formula');
    assert.equal(Number(aliceOrder.body.deliveryFee), 50);
    assert.equal(Number(aliceOrder.body.total), 130);
    assert.equal(aliceOrder.body.customOrders.length, 1);
    assert.equal(aliceOrder.body.customOrders[0].artworkId, artworkAId);
    assert.equal(aliceOrder.body.customOrders[0].artwork.originalName, 'my-artwork.png');

    // Admin order query includes customOrders with artwork
    const adminOrderQuery = await api(`/api/admin/orders/${aliceOrder.body.id}`, {}, adminToken);
    assert.equal(adminOrderQuery.status, 200);
    assert.equal(adminOrderQuery.body.customOrders.length, 1);
    assert.equal(adminOrderQuery.body.customOrders[0].artworkId, artworkAId);

    // --- ORPHANED UPLOADS CLEANUP TEST ---
    // Alice's artworkAId is now linked to an order -> It should NOT be cleaned up!
    // Let's create an orphaned artwork row artificially backdated > 25 hours
    const backdatedTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const orphanArt = await db.customArtwork.create({
      data: {
        userId: userAId,
        mimeType: 'image/png',
        originalName: 'orphan.png',
        fileName: `orphan-${randomUUID()}.png`,
        createdAt: backdatedTime,
      },
    });

    // Run cleanup routine for age > 24h
    const cleanupRes = await cleanupOrphanedUploads(db, 24);
    assert.ok(cleanupRes.deletedIds.includes(orphanArt.id), 'Orphaned artwork must be cleaned up');
    assert.ok(!cleanupRes.deletedIds.includes(artworkAId), 'Ordered artwork must NOT be deleted');

    // Admin cleanup route test
    const adminCleanup = await api('/api/admin/uploads/cleanup', {
      method: 'POST',
      body: JSON.stringify({ maxAgeHours: 24 }),
    }, adminToken);
    assert.equal(adminCleanup.status, 200);
    assert.equal(adminCleanup.body.success, true);

    // Customer calling cleanup route receives 403
    const customerCleanup = await api('/api/admin/uploads/cleanup', {
      method: 'POST',
      body: JSON.stringify({ maxAgeHours: 24 }),
    }, tokenA);
    assert.equal(customerCleanup.status, 403);

    console.log('✅ Phase 4 backend integration tests completed successfully.');
  } finally {
    proc.kill();
    await db.$disconnect();
  }
});
