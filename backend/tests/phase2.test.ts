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

test('Phase 2 backend verification: UPI, COD, UTR submission, admin verify/reject, idempotency, shipping guard, revenue calculation', { timeout: 90000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE, 'yes', 'Refusing to run tests without disposable database flag');

  const db = new PrismaClient({
    datasources: { db: { url: TEST_SCHEMA_URL } },
  });

  const port = 5097;
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
      UPI_ID: 'stickerclub@upi',
      UPI_QR_URL: 'https://example.test/qr.png',
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

    // 2. Check Payment Config Endpoint
    const configRes = await api('/api/payment/config');
    assert.equal(configRes.status, 200);
    assert.equal(configRes.body.deliveryFee, '50.00');
    assert.equal(configRes.body.upiId, 'stickerclub@upi');

    // 3. Setup Customer and Admin
    const email = `phase2-${randomUUID()}@example.test`;
    const password = 'TestPassphrase-1234!';
    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Phase2 Shopper', email, password }),
    });
    assert.equal(reg.status, 201);
    const token = reg.body.accessToken as string;
    const userId = reg.body.user.id as string;

    const jwt = (await import('jsonwebtoken')).default;
    const adminUser = await db.user.create({
      data: {
        name: 'Phase2 Admin',
        email: `admin2-${randomUUID()}@example.test`,
        passwordHash: 'dummy',
        role: 'ADMIN',
      },
    });
    const adminToken = jwt.sign({ sub: adminUser.id, role: 'ADMIN' }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '15m' });

    // Customer shipping address
    const addr = await api('/api/me/addresses', {
      method: 'POST',
      body: JSON.stringify({
        recipient: 'Phase2 Shopper',
        line1: 'Road 36 Jubilee Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500033',
        isDefault: true,
      }),
    }, token);
    assert.equal(addr.status, 201);
    const addressId = addr.body.id;

    // Create a product with stock for tests
    const prod = await api('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        id: `p2-${randomUUID().slice(0, 8)}`,
        slug: `prod-p2-${randomUUID().slice(0, 8)}`,
        name: 'Phase 2 Holographic Sticker',
        description: 'Waterproof vinyl sticker',
        price: 100,
        active: true,
      }),
    }, adminToken);
    assert.equal(prod.status, 201);
    const productId = prod.body.id;
    await api(`/api/admin/inventory/${productId}`, { method: 'PUT', body: JSON.stringify({ quantity: 10 }) }, adminToken);

    // Initial stats revenue
    const statsBefore = await api('/api/admin/stats', {}, adminToken);
    const initialRev = Number(statsBefore.body.totalRevenue);

    // ==========================================
    // TEST 4: IDEMPOTENCY & ORDER CREATION
    // ==========================================
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity: 2 }) }, token);

    // Missing Idempotency-Key header must return 400
    const noKey = await api('/api/orders', { method: 'POST', body: JSON.stringify({ addressId, paymentMethod: 'UPI' }) }, token);
    assert.equal(noKey.status, 400);

    const idempotencyKey = randomUUID();
    // Valid order placement with UPI
    const order1 = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ addressId, paymentMethod: 'UPI' }),
    }, token);
    assert.equal(order1.status, 201);
    assert.equal(order1.body.paymentMethod, 'UPI');
    assert.equal(Number(order1.body.subtotal), 200); // 2 * 100
    assert.equal(Number(order1.body.deliveryFee), 50);
    assert.equal(Number(order1.body.total), 250); // 200 + 50
    assert.equal(order1.body.paymentStatus, 'PENDING');
    assert.equal(order1.body.payment.status, 'AWAITING');

    const upiOrderId = order1.body.id;
    const paymentId = order1.body.payment.id;

    // Stock should be decremented from 10 to 8
    const stockAfter1 = await db.inventory.findUnique({ where: { productId } });
    assert.equal(stockAfter1?.quantity, 8);

    // REPLAY SAME KEY: Must return 200 with same order and NEVER deduct stock twice
    const replay = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ addressId, paymentMethod: 'UPI' }),
    }, token);
    assert.equal(replay.status, 200, 'Replay should return HTTP 200');
    assert.equal(replay.body.id, upiOrderId);
    const stockAfterReplay = await db.inventory.findUnique({ where: { productId } });
    assert.equal(stockAfterReplay?.quantity, 8, 'Stock must not be deducted again on replay');

    // ==========================================
    // TEST 5: UPI UTR SUBMISSION & VERIFICATION FLOW
    // ==========================================
    // Malformed UTR rejected (too short)
    const badUtr = await api(`/api/orders/${upiOrderId}/payment/utr`, { method: 'POST', body: JSON.stringify({ utr: '12' }) }, token);
    assert.equal(badUtr.status, 400);

    // Customer submits valid UTR
    const utrValue = `UTR${Date.now()}11`;
    const utrSubmit = await api(`/api/orders/${upiOrderId}/payment/utr`, { method: 'POST', body: JSON.stringify({ utr: utrValue }) }, token);
    assert.equal(utrSubmit.status, 200, JSON.stringify(utrSubmit.body));
    assert.equal(utrSubmit.body.payment.status, 'SUBMITTED');
    assert.equal(utrSubmit.body.payment.utr, utrValue);

    // VERIFY CRITICAL RULE: Payment status must NEVER become PAID upon UTR submission!
    const orderCheck = await db.order.findUnique({ where: { id: upiOrderId } });
    assert.equal(orderCheck?.paymentStatus, 'PENDING', 'Order paymentStatus must remain PENDING after UTR submission');

    // Duplicate UTR rejected on a second order
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) }, token);
    const orderDup = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ addressId, paymentMethod: 'UPI' }),
    }, token);
    assert.equal(orderDup.status, 201);
    const dupUtrRes = await api(`/api/orders/${orderDup.body.id}/payment/utr`, { method: 'POST', body: JSON.stringify({ utr: utrValue }) }, token);
    assert.equal(dupUtrRes.status, 409, 'Duplicate UTR must be rejected across orders');

    // Customer cannot verify own payment (403 Forbidden)
    const custVerify = await api(`/api/admin/payments/${paymentId}/verify`, { method: 'POST' }, token);
    assert.equal(custVerify.status, 403, 'Customer cannot verify payments');

    // Admin rejects payment first with reason
    const rejectRes = await api(`/api/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'UTR not found in bank statement', note: 'Please verify the last 4 digits' }),
    }, adminToken);
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.payment.status, 'REJECTED');
    assert.equal(rejectRes.body.payment.rejectionReason, 'UTR not found in bank statement');

    // Customer resubmits corrected UTR
    const correctedUtr = `UTR${Date.now()}22`;
    const resubmit = await api(`/api/orders/${upiOrderId}/payment/utr`, { method: 'POST', body: JSON.stringify({ utr: correctedUtr }) }, token);
    assert.equal(resubmit.status, 200, JSON.stringify(resubmit.body));
    assert.equal(resubmit.body.payment.status, 'SUBMITTED');

    // Admin verifies payment
    const verifyRes = await api(`/api/admin/payments/${paymentId}/verify`, { method: 'POST' }, adminToken);
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.payment.status, 'VERIFIED');
    assert.equal(verifyRes.body.order.paymentStatus, 'PAID');
    assert.equal(verifyRes.body.order.status, 'CONFIRMED');

    // Audit log must exist for the verification
    const auditRecord = await db.auditLog.findFirst({ where: { entityId: paymentId, action: 'PAYMENT_VERIFIED' } });
    assert.ok(auditRecord, 'AuditLog entry must be recorded for admin payment verification');
    assert.equal(auditRecord.actor, adminUser.id);

    // Revenue must now reflect the paid order (+250.00)
    const statsAfterUpi = await api('/api/admin/stats', {}, adminToken);
    assert.equal(Number(statsAfterUpi.body.totalRevenue), initialRev + 250);

    // ==========================================
    // TEST 6: COD WORKFLOW & SHIPPING GUARD
    // ==========================================
    // Customer places COD order
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) }, token);
    const codOrder = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ addressId, paymentMethod: 'COD' }),
    }, token);
    assert.equal(codOrder.status, 201);
    assert.equal(codOrder.body.paymentMethod, 'COD');
    assert.equal(codOrder.body.paymentStatus, 'PENDING');
    assert.equal(codOrder.body.payment.status, 'AWAITING');
    const codOrderId = codOrder.body.id;

    // Customer cannot collect COD (403)
    const custCollect = await api(`/api/admin/orders/${codOrderId}/cod-collected`, { method: 'POST' }, token);
    assert.equal(custCollect.status, 403);

    // COD order transitions: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED
    await api(`/api/admin/orders/${codOrderId}`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) }, adminToken);
    await api(`/api/admin/orders/${codOrderId}`, { method: 'PATCH', body: JSON.stringify({ status: 'PROCESSING' }) }, adminToken);
    const shipCod = await api(`/api/admin/orders/${codOrderId}`, { method: 'PATCH', body: JSON.stringify({ status: 'SHIPPED' }) }, adminToken);
    assert.equal(shipCod.status, 200, 'COD order should be allowed to ship while payment is pending');

    // Admin marks COD collected upon delivery
    const collectRes = await api(`/api/admin/orders/${codOrderId}/cod-collected`, { method: 'POST' }, adminToken);
    assert.equal(collectRes.status, 200);
    assert.equal(collectRes.body.order.paymentStatus, 'PAID');
    assert.equal(collectRes.body.payment.status, 'COLLECTED');

    // Revenue now includes COD order (+150.00: 100 subtotal + 50 delivery)
    const statsAfterCod = await api('/api/admin/stats', {}, adminToken);
    assert.equal(Number(statsAfterCod.body.totalRevenue), initialRev + 250 + 150);

    // ==========================================
    // TEST 7: SHIPPING GUARD FOR UNPAID UPI ORDER
    // ==========================================
    await api('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) }, token);
    const unpaidUpiOrder = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ addressId, paymentMethod: 'UPI' }),
    }, token);
    assert.equal(unpaidUpiOrder.status, 201);

    await api(`/api/admin/orders/${unpaidUpiOrder.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) }, adminToken);
    await api(`/api/admin/orders/${unpaidUpiOrder.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PROCESSING' }) }, adminToken);
    
    // Attempting to ship unpaid UPI order MUST be rejected with 400
    const badShip = await api(`/api/admin/orders/${unpaidUpiOrder.body.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'SHIPPED' }) }, adminToken);
    assert.equal(badShip.status, 400, 'Unpaid UPI order must not be allowed to ship');
    assert.match(badShip.body.error, /Cannot ship unpaid UPI order/i);

    // ==========================================
    // TEST 8: ADMIN PAYMENTS QUEUE ENDPOINT
    // ==========================================
    const paymentsQueue = await api('/api/admin/payments', {}, adminToken);
    assert.equal(paymentsQueue.status, 200);
    assert.ok(Array.isArray(paymentsQueue.body));
    assert.ok(paymentsQueue.body.length >= 2);
  } finally {
    proc.kill();
    await db.$disconnect();
  }
});
