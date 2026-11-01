import 'dotenv/config';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';

const backendDir = fileURLToPath(new URL('..', import.meta.url));
const TEST_SCHEMA_URL = process.env.DATABASE_URL!.replace(/schema=public/, 'schema=stickerclub_test');

test('Phase 3 verification: catalogue database source of truth, price match, customer cancel request, admin customers and filters', { timeout: 90000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE, 'yes', 'Refusing to run tests without disposable database flag');

  const db = new PrismaClient({
    datasources: { db: { url: TEST_SCHEMA_URL } },
  });

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
      DELIVERY_FEE: '40.00',
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

  try {
    // 1. Health check
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (proc.exitCode !== null) throw Error('Backend process exited early: ' + logs);
      try {
        const r = await fetch(`${base}/api/health`);
        if (r.ok) { ready = true; break; }
      } catch {}
      await sleep(250);
    }
    assert.ok(ready, 'API failed health check: ' + logs);

    // 2. Setup Customer and Admin
    const email = `phase3-${randomUUID()}@example.test`;
    const password = 'TestPassphrase-1234!';
    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Phase3 Shopper', email, password }),
    });
    assert.equal(reg.status, 201);
    const token = reg.body.accessToken as string;
    const userId = reg.body.user.id as string;

    const jwt = (await import('jsonwebtoken')).default;
    const adminUser = await db.user.create({
      data: {
        name: 'Phase3 Admin',
        email: `admin3-${randomUUID()}@example.test`,
        passwordHash: 'dummy',
        role: 'ADMIN',
      },
    });
    const adminToken = jwt.sign({ sub: adminUser.id, role: 'ADMIN' }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '15m' });

    // Customer shipping address
    const addr = await api('/api/me/addresses', {
      method: 'POST',
      body: JSON.stringify({
        recipient: 'Phase3 Shopper',
        line1: 'Banjara Hills Road 10',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500034',
        isDefault: true,
      }),
    }, token);
    assert.equal(addr.status, 201);
    const addressId = addr.body.id;

    // ==========================================
    // TEST 1: CATALOGUE AS SOURCE OF TRUTH & NO PRICE MISMATCH
    // ==========================================
    // Admin creates product in DB with explicit price 175.00 and variant 225.00
    const testProdSlug = `phase3-art-${randomUUID().slice(0, 6)}`;
    const newProd = await api('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        id: `p3-${randomUUID().slice(0, 8)}`,
        slug: testProdSlug,
        name: 'Phase 3 Glossy Art Print',
        description: 'PostgreSQL authoritative product',
        price: 175.00,
        active: true,
        variants: [
          { id: 'v1', label: 'Standard A4', price: 175.00 },
          { id: 'v2', label: 'Laminated A3', price: 225.00 },
        ],
      }),
    }, adminToken);
    assert.equal(newProd.status, 201);
    const prodId = newProd.body.id;
    await api(`/api/admin/inventory/${prodId}`, { method: 'PUT', body: JSON.stringify({ quantity: 5 }) }, adminToken);

    // Public /api/products returns this database item with exact price
    const catalogueRes = await api(`/api/products?q=${testProdSlug}`);
    assert.equal(catalogueRes.status, 200);
    assert.equal(catalogueRes.body.length, 1);
    const dbItem = catalogueRes.body[0];
    assert.equal(Number(dbItem.price), 175.00);
    assert.equal(dbItem.variants.length, 2);
    assert.equal(Number(dbItem.variants.find((v: any) => v.id === 'v2').price), 225.00);

    // Customer adds variant v2 (225.00) to cart
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId: prodId, variantId: 'v2', quantity: 2 }) }, token);

    // Place order: server calculates subtotal = 2 * 225 = 450, deliveryFee = 40, total = 490
    const orderRes = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ addressId, paymentMethod: 'COD' }),
    }, token);
    assert.equal(orderRes.status, 201);
    assert.equal(Number(orderRes.body.subtotal), 450.00, 'Subtotal must match authoritative DB variant price (2 * 225.00)');
    assert.equal(Number(orderRes.body.deliveryFee), 40.00);
    assert.equal(Number(orderRes.body.total), 490.00);
    const orderId = orderRes.body.id;

    // Stock decremented from 5 to 3
    const stockAfterOrder = await db.inventory.findUnique({ where: { productId: prodId } });
    assert.equal(stockAfterOrder?.quantity, 3);

    // ==========================================
    // TEST 2: CUSTOMER ORDER CANCELLATION & STOCK RESTORATION
    // ==========================================
    // Customer cancels their own pending order
    const cancelRes = await api(`/api/me/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Changed my mind before processing' }),
    }, token);
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.status, 'CANCELLED');
    assert.equal(cancelRes.body.cancelReason, 'Changed my mind before processing');

    // Stock must be restored from 3 back to 5!
    const stockRestored = await db.inventory.findUnique({ where: { productId: prodId } });
    assert.equal(stockRestored?.quantity, 5, 'Stock must be returned upon customer cancellation');

    // Customer attempting to cancel already cancelled order returns 400
    const reCancel = await api(`/api/me/orders/${orderId}/cancel`, { method: 'POST' }, token);
    assert.equal(reCancel.status, 400);

    // Create another order, admin moves to CONFIRMED, customer cannot cancel
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId: prodId, variantId: 'v1', quantity: 1 }) }, token);
    const order2 = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ addressId, paymentMethod: 'COD' }),
    }, token);
    assert.equal(order2.status, 201);
    const order2Id = order2.body.id;

    // Admin confirms order
    await api(`/api/admin/orders/${order2Id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) }, adminToken);

    // Customer attempt to cancel confirmed order is rejected
    const cancelConfirmed = await api(`/api/me/orders/${order2Id}/cancel`, { method: 'POST' }, token);
    assert.equal(cancelConfirmed.status, 400, 'Customer cannot cancel orders that have progressed beyond PENDING');

    // ==========================================
    // TEST 3: ADMIN CUSTOMERS DIRECTORY
    // ==========================================
    const customersRes = await api('/api/admin/customers', {}, adminToken);
    assert.equal(customersRes.status, 200);
    assert.ok(Array.isArray(customersRes.body));
    const shopperRecord = customersRes.body.find((c: any) => c.email === email);
    assert.ok(shopperRecord, 'Customer record must be present in admin directory');
    assert.equal(shopperRecord.name, 'Phase3 Shopper');
    assert.ok(shopperRecord._count.orders >= 2, 'Customer order count must reflect placed orders');

    // Customer cannot access customers list (403)
    const custForbidden = await api('/api/admin/customers', {}, token);
    assert.equal(custForbidden.status, 403);
  } finally {
    proc.kill();
    await db.$disconnect();
  }
});

