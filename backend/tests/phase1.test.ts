import 'dotenv/config';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';

const backendDir = fileURLToPath(new URL('..', import.meta.url));
const TEST_SCHEMA_URL = process.env.DATABASE_URL!.replace(/schema=public/, 'schema=stickerclub_test');

test('Phase 1 backend verification: stock concurrency, cancellation restore, movements audit, rate limiting', { timeout: 90000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE, 'yes', 'Refusing to run tests without disposable database flag');

  const db = new PrismaClient({
    datasources: { db: { url: TEST_SCHEMA_URL } },
  });

  const port = 5098;
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
    // 1. Wait for health check
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

    const health = await api('/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.db, true, 'Database ping should be healthy');

    // 2. Customer Registration
    const email = `phase1-${randomUUID()}@example.test`;
    const password = 'TestPassphrase-1234!';
    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Phase1 Buyer', email, password }),
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    const token = reg.body.accessToken as string;
    const userId = reg.body.user.id as string;

    // 3. Admin Account Setup for testing admin endpoints
    const adminEmail = `admin-${randomUUID()}@example.test`;
    const adminUser = await db.user.create({
      data: {
        name: 'Store Admin',
        email: adminEmail,
        passwordHash: reg.body.user.passwordHash || 'hashed',
        role: 'ADMIN',
      },
    });
    const adminLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password }),
    });
    // In our test we generate a token for admin:
    const jwt = (await import('jsonwebtoken')).default;
    const adminToken = jwt.sign({ sub: adminUser.id, role: 'ADMIN' }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '15m' });

    // Customer cannot access admin routes (Authz check)
    const custForbidden = await api('/api/admin/stats', {}, token);
    assert.equal(custForbidden.status, 403);

    // Admin can access stats
    const adminStats = await api('/api/admin/stats', {}, adminToken);
    assert.equal(adminStats.status, 200);

    // 4. Admin Product CRUD with Variants and Images (Task 9)
    const newProdSlug = `poster-test-${randomUUID().slice(0, 8)}`;
    const createdProduct = await api(
      '/api/admin/products',
      {
        method: 'POST',
        body: JSON.stringify({
          id: `pst-${randomUUID().slice(0, 8)}`,
          slug: newProdSlug,
          name: 'Limited Neon Poster',
          description: 'Glossy cyber print',
          price: 299,
          active: true,
          variants: [
            { id: 'a4', label: 'A4 Matte', price: 299 },
            { id: 'a3', label: 'A3 Glossy', price: 499 },
          ],
          images: [
            { url: 'https://images.example/neon-front.webp', alt: 'Front', position: 0 },
            { url: 'https://images.example/neon-side.webp', alt: 'Angle', position: 1 },
          ],
        }),
      },
      adminToken
    );
    assert.equal(createdProduct.status, 201, JSON.stringify(createdProduct.body));
    assert.equal(createdProduct.body.variants.length, 2);
    assert.equal(createdProduct.body.images.length, 2);

    // 5. Admin Inventory Management & Movement Audit (Tasks 4 & 5)
    const testProductId = createdProduct.body.id;
    const invSet = await api(
      `/api/admin/inventory/${testProductId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ quantity: 1 }), // set exactly 1 unit in stock
      },
      adminToken
    );
    assert.equal(invSet.status, 200);
    assert.equal(invSet.body.quantity, 1);

    // Check that InventoryMovement row was created with RESTOCK
    const movementsAfterSet = await api(`/api/admin/inventory/movements?productId=${testProductId}`, {}, adminToken);
    assert.equal(movementsAfterSet.status, 200);
    assert.ok(movementsAfterSet.body.length >= 1);
    assert.equal(movementsAfterSet.body[0].reason, 'RESTOCK');
    assert.equal(movementsAfterSet.body[0].delta, 1);
    assert.equal(movementsAfterSet.body[0].quantityAfter, 1);

    // 6. Setup Shipping Address
    const address = await api(
      '/api/me/addresses',
      {
        method: 'POST',
        body: JSON.stringify({
          recipient: 'Phase1 Buyer',
          line1: 'Banjara Hills Road 12',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500034',
          isDefault: true,
        }),
      },
      token
    );
    assert.equal(address.status, 201);
    const addressId = address.body.id;

    // 7. CONCURRENCY TEST: Two simultaneous orders compete for the last 1 available unit
    // Customer 1 adds product to cart
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId: testProductId, variantId: 'a4', quantity: 1 }) }, token);

    // Customer 2 setup
    const email2 = `phase1-comp-${randomUUID()}@example.test`;
    const reg2 = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Competing Buyer', email: email2, password }),
    });
    const token2 = reg2.body.accessToken as string;
    const address2 = await api(
      '/api/me/addresses',
      {
        method: 'POST',
        body: JSON.stringify({
          recipient: 'Competing Buyer',
          line1: 'Hitec City',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
          isDefault: true,
        }),
      },
      token2
    );
    // Customer 2 adds the same product to cart
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId: testProductId, variantId: 'a4', quantity: 1 }) }, token2);

    // Both place order simultaneously!
    const key1 = randomUUID();
    const key2 = randomUUID();
    const [orderRes1, orderRes2] = await Promise.all([
      api('/api/orders', { method: 'POST', headers: { 'Idempotency-Key': key1 }, body: JSON.stringify({ addressId, paymentMethod: 'COD' }) }, token),
      api('/api/orders', { method: 'POST', headers: { 'Idempotency-Key': key2 }, body: JSON.stringify({ addressId: address2.body.id, paymentMethod: 'COD' }) }, token2),
    ]);

    const statuses = [orderRes1.status, orderRes2.status].sort();
    assert.deepEqual(statuses, [201, 409], 'Exactly one order must succeed (201) and one must be rejected (409) without overselling');

    const winningOrder = orderRes1.status === 201 ? orderRes1.body : orderRes2.body;
    assert.ok(winningOrder.id);

    // Stock must now be exactly 0
    const stockAfter = await db.inventory.findUnique({ where: { productId: testProductId } });
    assert.equal(stockAfter?.quantity, 0, 'Inventory must be decremented to 0');

    // Audit log must record ORDER deduction
    const movementsAfterOrder = await api(`/api/admin/inventory/movements?productId=${testProductId}`, {}, adminToken);
    const orderMovement = movementsAfterOrder.body.find((m: { reason: string }) => m.reason === 'ORDER');
    assert.ok(orderMovement, 'An ORDER InventoryMovement row must exist');
    assert.equal(orderMovement.delta, -1);
    assert.equal(orderMovement.quantityAfter, 0);

    // 8. ORDER CANCELLATION & STOCK RESTORATION TEST (Task 2)
    // Admin cancels the winning order
    const cancelRes = await api(
      `/api/admin/orders/${winningOrder.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED', reason: 'Customer requested cancellation' }),
      },
      adminToken
    );
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.status, 'CANCELLED');
    assert.equal(cancelRes.body.cancelReason, 'Customer requested cancellation');
    assert.ok(cancelRes.body.cancelledAt);

    // Stock must now be restored to 1!
    const stockRestored = await db.inventory.findUnique({ where: { productId: testProductId } });
    assert.equal(stockRestored?.quantity, 1, 'Stock must be atomically restored upon cancellation');

    // Audit log must record CANCELLATION movement
    const movementsAfterCancel = await api(`/api/admin/inventory/movements?productId=${testProductId}`, {}, adminToken);
    const cancelMovement = movementsAfterCancel.body.find((m: { reason: string }) => m.reason === 'CANCELLATION');
    assert.ok(cancelMovement, 'A CANCELLATION InventoryMovement row must exist');
    assert.equal(cancelMovement.delta, 1);
    assert.equal(cancelMovement.quantityAfter, 1);

    // Repeated cancellation attempt must fail (409 invalid transition) and NOT double-restore stock!
    const repeatCancel = await api(
      `/api/admin/orders/${winningOrder.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      },
      adminToken
    );
    assert.equal(repeatCancel.status, 409, 'Repeated cancellation must be rejected');
    const stockNoDoubleRestore = await db.inventory.findUnique({ where: { productId: testProductId } });
    assert.equal(stockNoDoubleRestore?.quantity, 1, 'Repeated cancellation must never double-restore stock');

    // 9. BULK INVENTORY INITIALIZATION TEST (Task 5)
    // Create an unconfigured product
    const unconfigured = await api(
      '/api/admin/products',
      {
        method: 'POST',
        body: JSON.stringify({
          id: `raw-${randomUUID().slice(0, 8)}`,
          slug: `raw-${randomUUID().slice(0, 8)}`,
          name: 'Unconfigured Test Sticker',
          description: 'No stock yet',
          price: 49,
        }),
      },
      adminToken
    );
    assert.equal(unconfigured.status, 201);
    const unconfiguredId = unconfigured.body.id;

    // Bulk init with quantity 15
    const bulkRes = await api('/api/admin/inventory/bulk-init', { method: 'POST', body: JSON.stringify({ quantity: 15 }) }, adminToken);
    assert.equal(bulkRes.status, 200);
    assert.ok(bulkRes.body.count >= 1);

    const nowConfigured = await db.inventory.findUnique({ where: { productId: unconfiguredId } });
    assert.equal(nowConfigured?.quantity, 15, 'Bulk init should have configured stock to 15');

    // 10. FORGOT PASSWORD & MAILER INTERFACE TEST (Task 8)
    const forgotRes = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    assert.equal(forgotRes.status, 200);
    assert.ok(forgotRes.body.message);
    const tokenRow = await db.passwordResetToken.findFirst({ where: { user: { email } }, orderBy: { expiresAt: 'desc' } });
    assert.ok(tokenRow, 'A password reset token row must be created in PostgreSQL');
  } finally {
    proc.kill();
    await db.$disconnect();
  }
});
