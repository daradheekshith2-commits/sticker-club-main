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

test('Phase 6: Comprehensive Auth lifecycle, token rotation & reuse detection, RBAC authorization matrix, and IDOR prevention', { timeout: 90000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE, 'yes', 'Refusing to run tests without disposable database flag');

  const db = new PrismaClient({
    datasources: { db: { url: TEST_SCHEMA_URL } },
  });

  const port = 5094;
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

  const api = async (path: string, opts: RequestInit = {}, token?: string, cookies?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(opts.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (cookies) headers['Cookie'] = cookies;

    const result = await fetch(base + path, {
      ...opts,
      headers,
    });
    const body = await result.json().catch(() => null);
    const setCookie = result.headers.get('set-cookie');
    return { status: result.status, body, headers: result.headers, setCookie };
  };

  try {
    // 1. Wait for server health & DB ping
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (proc.exitCode !== null) throw Error('Backend process exited early: ' + logs);
      try {
        const r = await fetch(`${base}/api/health`);
        if (r.ok) {
          const h = await r.json();
          if (h.ok && h.db) { ready = true; break; }
        }
      } catch {}
      await sleep(250);
    }
    assert.ok(ready, 'API failed health and DB ping check: ' + logs);

    // ==========================================
    // 2. AUTH LIFECYCLE: REGISTER, LOGIN, REFRESH, REUSE DETECTION, LOGOUT
    // ==========================================
    const userEmail = `auth-test-${randomUUID()}@example.test`;
    const userPassword = 'InitialSecurePassword123!';

    // Register
    const regRes = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Auth Tester', email: userEmail, password: userPassword }),
    });
    assert.equal(regRes.status, 201, 'Registration must return 201');
    assert.equal(regRes.body.user.role, 'CUSTOMER');
    const userAId = regRes.body.user.id as string;

    // Login
    const loginRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, password: userPassword }),
    });
    assert.equal(loginRes.status, 200, 'Login must succeed with 200');
    assert.ok(loginRes.body.accessToken, 'Login must issue access token');
    assert.ok(loginRes.setCookie, 'Login must set sc_refresh cookie');
    const rawCookie1 = loginRes.setCookie.split(';')[0]; // sc_refresh=xyz
    const tokenA = loginRes.body.accessToken;

    // Refresh Token Rotation (1st rotation: using cookie1 -> yields cookie2)
    const refreshRes1 = await api('/api/auth/refresh', { method: 'POST' }, undefined, rawCookie1);
    assert.equal(refreshRes1.status, 200, 'Refresh must succeed');
    assert.ok(refreshRes1.body.accessToken);
    assert.ok(refreshRes1.setCookie, 'Refresh must issue rotated cookie');
    const rawCookie2 = refreshRes1.setCookie.split(';')[0];
    assert.notEqual(rawCookie1, rawCookie2, 'Refresh cookie must rotate');

    // REFRESH TOKEN REUSE DETECTION:
    // Attacker or replay attempts to use already-revoked rawCookie1!
    const reuseAttempt = await api('/api/auth/refresh', { method: 'POST' }, undefined, rawCookie1);
    assert.equal(reuseAttempt.status, 401, 'Reuse of rotated token must be rejected with 401');

    // Because reuse was detected, ALL active refresh tokens in the family must have been revoked!
    // Attempting to use the legitimate rawCookie2 should now fail because all sessions were invalidated!
    const invalidAfterReuse = await api('/api/auth/refresh', { method: 'POST' }, undefined, rawCookie2);
    assert.equal(invalidAfterReuse.status, 401, 'All sessions must be invalidated upon reuse detection');

    // Customer logs in again
    const reLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, password: userPassword }),
    });
    assert.equal(reLogin.status, 200);
    const validCookie = reLogin.setCookie!.split(';')[0];

    // Logout
    const logoutRes = await api('/api/auth/logout', { method: 'POST' }, undefined, validCookie);
    assert.equal(logoutRes.status, 200);

    // Refresh after logout fails
    const refreshAfterLogout = await api('/api/auth/refresh', { method: 'POST' }, undefined, validCookie);
    assert.equal(refreshAfterLogout.status, 401);

    // ==========================================
    // 3. PASSWORD RESET FLOW
    // ==========================================
    const forgotRes = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail }),
    });
    assert.equal(forgotRes.status, 200);

    // Retrieve the reset token record from database
    const resetRecord = await db.passwordResetToken.findFirst({
      where: { userId: userAId, usedAt: null },
      orderBy: { expiresAt: 'desc' },
    });
    assert.ok(resetRecord, 'Password reset token row must exist');

    // Set a known token hash in DB to test reset endpoint
    const crypto = await import('node:crypto');
    const rawResetToken = crypto.randomBytes(32).toString('base64url');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await db.passwordResetToken.create({
      data: {
        userId: userAId,
        tokenHash: hashedResetToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const newPassword = 'NewSecretPassword9876!';
    const resetRes = await api('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawResetToken, password: newPassword }),
    });
    assert.equal(resetRes.status, 200, 'Password reset must succeed');

    // Login with old password must fail
    const oldLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, password: userPassword }),
    });
    assert.equal(oldLogin.status, 401, 'Old password must fail after reset');

    // Login with new password must succeed
    const newLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail, password: newPassword }),
    });
    assert.equal(newLogin.status, 200, 'New password must succeed');
    const freshCustomerToken = newLogin.body.accessToken;

    // Reset token cannot be reused
    const reuseReset = await api('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: rawResetToken, password: 'AnotherPassword123!' }),
    });
    assert.equal(reuseReset.status, 400, 'Used reset token must be rejected');

    // ==========================================
    // 4. RBAC AUTHORIZATION MATRIX (CUSTOMER MUST GET 403 ON EVERY ADMIN ROUTE)
    // ==========================================
    const adminRoutes = [
      { method: 'GET', path: '/api/admin/stats' },
      { method: 'GET', path: '/api/admin/customers' },
      { method: 'GET', path: '/api/admin/orders' },
      { method: 'GET', path: '/api/admin/orders/fake-id' },
      { method: 'PATCH', path: '/api/admin/orders/fake-id', body: { status: 'CONFIRMED' } },
      { method: 'POST', path: '/api/admin/orders/fake-id/cod-collected' },
      { method: 'GET', path: '/api/admin/payments' },
      { method: 'POST', path: '/api/admin/payments/fake-id/verify' },
      { method: 'POST', path: '/api/admin/payments/fake-id/reject', body: { rejectionReason: 'test' } },
      { method: 'GET', path: '/api/admin/products' },
      { method: 'POST', path: '/api/admin/products', body: { id: 'x', slug: 'x', name: 'x', description: 'x', price: '10' } },
      { method: 'PATCH', path: '/api/admin/products/fake-id', body: { price: '20' } },
      { method: 'DELETE', path: '/api/admin/products/fake-id' },
      { method: 'PUT', path: '/api/admin/inventory/fake-id', body: { quantity: 10 } },
      { method: 'POST', path: '/api/admin/inventory/bulk-init', body: { quantity: 10 } },
      { method: 'GET', path: '/api/admin/inventory/movements' },
      { method: 'POST', path: '/api/admin/uploads/cleanup' },
    ];

    for (const route of adminRoutes) {
      const res = await api(
        route.path,
        {
          method: route.method,
          ...(route.body ? { body: JSON.stringify(route.body) } : {}),
        },
        freshCustomerToken
      );
      assert.equal(
        res.status,
        403,
        `Customer accessing ${route.method} ${route.path} must receive 403 Forbidden (got ${res.status})`
      );
    }

    // ==========================================
    // 5. IDOR CHECKS BETWEEN CUSTOMERS
    // ==========================================
    // Register Customer B
    const emailB = `customer-b-${randomUUID()}@example.test`;
    const regB = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Customer B', email: emailB, password: 'SecurePassword123!' }),
    });
    const tokenB = regB.body.accessToken as string;

    // Create an address and order for Customer A
    const addrA = await api('/api/me/addresses', {
      method: 'POST',
      body: JSON.stringify({ recipient: 'Alice', line1: '123 St', city: 'Hyd', state: 'TS', postalCode: '500001' }),
    }, freshCustomerToken);
    const addressAId = addrA.body.id as string;

    // Create an order for Customer A with a custom sticker
    // First upload valid PNG for Alice
    const sharp = (await import('sharp')).default;
    const pngBuf = await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } } }).png().toBuffer();
    const formData = new FormData();
    formData.append('file', new Blob([pngBuf], { type: 'image/png' }), 'alice.png');
    const upRes = await fetch(base + '/api/uploads/artwork', {
      method: 'POST',
      headers: { Origin: origin, Authorization: 'Bearer ' + freshCustomerToken },
      body: formData,
    });
    const artworkA = await upRes.json();

    const orderA = await api('/api/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({
        addressId: addressAId,
        paymentMethod: 'UPI',
        customLines: [
          {
            type: 'custom-sticker',
            artworkId: artworkA.id,
            sizeId: 'small',
            finishId: 'standard',
            shape: 'circle',
            quantity: 1,
          },
        ],
      }),
    }, freshCustomerToken);
    assert.equal(orderA.status, 201);
    const orderAId = orderA.body.id as string;

    // IDOR Check 1: Customer B attempts to view Customer A's order
    const viewOrderB = await api(`/api/me/orders/${orderAId}`, {}, tokenB);
    assert.equal(viewOrderB.status, 404, 'Customer B must not be able to view Customer A order (expected 404)');

    // IDOR Check 2: Customer B attempts to cancel Customer A's order
    const cancelOrderB = await api(`/api/me/orders/${orderAId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Malicious cancellation' }),
    }, tokenB);
    assert.equal(cancelOrderB.status, 404, 'Customer B must not be able to cancel Customer A order (expected 404)');

    // IDOR Check 3: Customer B attempts to submit UTR for Customer A's order (should be 404 or 403)
    const utrOrderB = await api(`/api/orders/${orderAId}/payment/utr`, {
      method: 'POST',
      body: JSON.stringify({ utr: `UTR${Date.now()}99` }),
    }, tokenB);
    assert.equal(utrOrderB.status, 404, 'Customer B must not be able to submit payment for Customer A order (expected 404)');

    // IDOR Check 4: Customer B attempts to fetch Customer A's artwork file
    const artFileB = await fetch(`${base}/api/uploads/artwork/${artworkA.id}/file`, {
      headers: { Origin: origin, Authorization: 'Bearer ' + tokenB },
    });
    assert.equal(artFileB.status, 403, 'Customer B must not be able to download Customer A artwork (expected 403)');

    console.log('✅ Phase 6 comprehensive auth, RBAC, and IDOR tests passed successfully.');
  } finally {
    proc.kill();
    await db.$disconnect();
  }
});
