import 'dotenv/config';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const backendDir = fileURLToPath(new URL('..', import.meta.url));
const TEST_SCHEMA_URL = process.env.DATABASE_URL!.replace(/schema=public/, 'schema=stickerclub_test');

test('Security Audit Area 1: Authentication bypass, forged admin prevention, artwork token isolation, and credential redaction in logs', { timeout: 90000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE, 'yes', 'Refusing to run tests without disposable database flag');

  const db = new PrismaClient({
    datasources: { db: { url: TEST_SCHEMA_URL } },
  });

  const port = 5098;
  const origin = 'http://localhost:5173';
  const base = `http://127.0.0.1:${port}`;
  const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_min_32_characters_long_for_security_suite';

  const proc = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: TEST_SCHEMA_URL,
      PORT: String(port),
      FRONTEND_ORIGIN: origin,
      NODE_ENV: 'test',
      JWT_SECRET: jwtSecret,
      DELIVERY_FEE: '50.00',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLogs = '';
  proc.stdout.on('data', (b) => { serverLogs += String(b); });
  proc.stderr.on('data', (b) => { serverLogs += String(b); });

  const api = async (path: string, opts: RequestInit = {}, token?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Origin: origin,
      ...((opts.headers as Record<string, string>) || {}),
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(base + path, {
      ...opts,
      headers,
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  };

  try {
    // 1. Wait for server readiness
    let online = false;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(base + '/api/health');
        if (r.ok) {
          online = true;
          break;
        }
      } catch {}
      await sleep(250);
    }
    assert.ok(online, `Backend server failed to start within timeout. Logs:\n${serverLogs}`);

    // 2. Setup baseline: genuine Customer and Admin accounts
    const customerEmail = `genuine-customer-${randomUUID()}@example.test`;
    const regCust = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Genuine Customer', email: customerEmail, password: 'SecureCustomer123!' }),
    });
    assert.equal(regCust.status, 201, 'Customer registration should succeed');
    const customerToken = regCust.body.accessToken as string;
    const customerId = regCust.body.user.id as string;

    const adminEmail = `genuine-admin-${randomUUID()}@example.test`;
    const regAdmin = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Genuine Admin', email: adminEmail, password: 'SecureAdminPassword123!' }),
    });
    assert.equal(regAdmin.status, 201);
    const adminId = regAdmin.body.user.id as string;

    // Promote admin account authoritatively in DB
    await db.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN' },
    });

    // Login as Admin to get genuine ADMIN token
    const loginAdmin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password: 'SecureAdminPassword123!' }),
    });
    assert.equal(loginAdmin.status, 200);
    const adminToken = loginAdmin.body.accessToken as string;

    // Verify valid customer & admin endpoints
    const meCust = await api('/api/me', {}, customerToken);
    assert.equal(meCust.status, 200, 'Valid customer token must access /api/me');
    assert.equal(meCust.body.id, customerId);

    const adminProbe = await api('/api/admin/customers', {}, adminToken);
    assert.equal(adminProbe.status, 200, 'Valid admin token must access /api/admin/customers');

    // =========================================================================
    // PROBE A: Forged Admin Token for a New ID
    // =========================================================================
    const fakeAdminId = `fabricated-attacker-${randomUUID()}`;
    const forgedAdminToken = jwt.sign(
      {
        sub: fakeAdminId,
        role: 'ADMIN',
        aud: 'authenticated',
        iss: 'https://iarclkcnxpbbxxpfwamd.supabase.co/auth/v1',
        app_metadata: { role: 'ADMIN' },
        user_metadata: { role: 'ADMIN', name: 'Attacker' },
      },
      'attacker_untrusted_signing_secret_9999999999999999',
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const forgedRes = await api('/api/admin/customers', {}, forgedAdminToken);
    assert.equal(forgedRes.status, 401, 'Forged admin token must be rejected with 401');

    // Assert absence of user creation in DB (no side effects)
    const forgedUserInDb = await db.user.findUnique({ where: { id: fakeAdminId } });
    assert.equal(forgedUserInDb, null, 'Forged token must not provision an account in database');

    // =========================================================================
    // PROBE B: Impersonation of an Existing Admin using forged/wrong-key token
    // =========================================================================
    const impersonateToken = jwt.sign(
      {
        sub: adminId, // Target genuine admin ID
        role: 'ADMIN',
        iss: 'https://iarclkcnxpbbxxpfwamd.supabase.co/auth/v1',
      },
      'attacker_secret_different_key_8888888888888888',
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const impRes = await api('/api/admin/customers', {}, impersonateToken);
    assert.equal(impRes.status, 401, 'Impersonation of admin with invalid signature must return 401');

    // =========================================================================
    // PROBE C: Expired Token
    // =========================================================================
    const expiredToken = jwt.sign(
      { sub: customerId, role: 'CUSTOMER', purpose: 'access' },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '-10s' }
    );
    const expRes = await api('/api/me', {}, expiredToken);
    assert.equal(expRes.status, 401, 'Expired token must return 401');

    // =========================================================================
    // PROBE D: Wrong Issuer / Audience Token
    // =========================================================================
    const wrongAudToken = jwt.sign(
      { sub: customerId, role: 'CUSTOMER', aud: 'wrong-audience', iss: 'https://malicious.example.com' },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    // Since purpose is not 'access', verifyLocalSessionToken rejects it
    const wrongAudRes = await api('/api/me', {}, wrongAudToken);
    assert.equal(wrongAudRes.status, 401, 'Wrong purpose/audience token must return 401');

    // =========================================================================
    // PROBE E: Artwork Token Isolation & Cross-File Replay Protection
    // =========================================================================
    // Upload two distinct artworks for customer
    const sharp = (await import('sharp')).default;
    const pngBuf = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } } }).png().toBuffer();

    const fd1 = new FormData();
    fd1.append('file', new Blob([pngBuf], { type: 'image/png' }), 'artA.png');
    const up1 = await fetch(base + '/api/uploads/artwork', {
      method: 'POST',
      headers: { Origin: origin, Authorization: 'Bearer ' + customerToken },
      body: fd1,
    });
    const artA = await up1.json();
    assert.equal(up1.status, 201);

    const fd2 = new FormData();
    fd2.append('file', new Blob([pngBuf], { type: 'image/png' }), 'artB.png');
    const up2 = await fetch(base + '/api/uploads/artwork', {
      method: 'POST',
      headers: { Origin: origin, Authorization: 'Bearer ' + customerToken },
      body: fd2,
    });
    const artB = await up2.json();
    assert.equal(up2.status, 201);

    // Get an artwork view token for Artwork A
    const tokRes = await api(`/api/uploads/artwork/${artA.id}/token`, {}, customerToken);
    assert.equal(tokRes.status, 200);
    const artworkAToken = tokRes.body.token as string;
    assert.ok(artworkAToken, 'Must return artwork view token');

    // 1. Artwork token accessing Artwork A file route (should succeed)
    const fileARes = await fetch(`${base}/api/uploads/artwork/${artA.id}/file?token=${artworkAToken}`, {
      headers: { Origin: origin },
    });
    assert.equal(fileARes.status, 200, 'Artwork token must permit accessing Artwork A');
    assert.equal(fileARes.headers.get('content-type'), 'image/png');
    assert.equal(fileARes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(fileARes.headers.get('cache-control'), 'private, no-transform, no-cache');

    // 2. Cross-file token replay: Token for Artwork A used to request Artwork B (must be rejected!)
    const replayRes = await fetch(`${base}/api/uploads/artwork/${artB.id}/file?token=${artworkAToken}`, {
      headers: { Origin: origin },
    });
    assert.equal(replayRes.status, 403, 'Artwork token for A must NOT be accepted for Artwork B (403 expected)');

    // 3. Artwork token used at general API endpoint (must be rejected!)
    const generalRes = await api('/api/me', {}, artworkAToken);
    assert.equal(generalRes.status, 401, 'Artwork token must be rejected at general endpoints (401 expected)');

    // 4. Artwork token used at admin endpoint (must be rejected!)
    const adminWithArtToken = await api('/api/admin/customers', {}, artworkAToken);
    assert.equal(adminWithArtToken.status, 401, 'Artwork token must be rejected at admin endpoints (401 expected)');

    // 5. Query token used on non-artwork route (must be rejected!)
    const queryGeneralRes = await fetch(`${base}/api/me?token=${artworkAToken}`, {
      headers: { Origin: origin },
    });
    assert.equal(queryGeneralRes.status, 401, 'Query token on non-artwork route must return 401');

    // =========================================================================
    // PROBE F: Verify Logs Never Contain the Synthetic Token
    // =========================================================================
    // Send a unique canary token in a request
    const canaryToken = `CANARY_SECRET_TOKEN_${randomUUID()}`;
    await fetch(`${base}/api/uploads/artwork/${artA.id}/file?token=${canaryToken}`, {
      headers: { Origin: origin },
    });
    await fetch(`${base}/api/me?token=${canaryToken}`, {
      headers: { Origin: origin, Authorization: `Bearer ${canaryToken}` },
    });

    await sleep(200); // Allow logger flush
    assert.equal(
      serverLogs.includes(canaryToken),
      false,
      'SERVER LOGS MUST NEVER CONTAIN THE SENSITIVE BEARER/QUERY TOKEN'
    );
    assert.equal(
      serverLogs.includes(artworkAToken),
      false,
      'SERVER LOGS MUST NEVER CONTAIN THE ARTWORK VIEW TOKEN'
    );

    console.log('✅ Security Audit Area 1 verified: Both authentication bypasses closed, forged tokens rejected, artwork tokens isolated, and logs sanitized.');
  } finally {
    proc.kill();
    await db.$disconnect();
  }
});
