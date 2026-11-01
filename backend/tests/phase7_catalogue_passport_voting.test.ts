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

test('Phase 7 verification: catalogue management, quotes preservation, live voting, passport stamps & redemptions', { timeout: 90000 }, async () => {
  assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE, 'yes', 'Refusing to run tests without disposable database flag');

  const db = new PrismaClient({
    datasources: { db: { url: TEST_SCHEMA_URL } },
  });

  const port = 5093;
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
        const h = await fetch(base + '/api/health');
        if (h.ok) {
          ready = true;
          break;
        }
      } catch {}
      await sleep(250);
    }
    assert.equal(ready, true, 'Server failed to become healthy on port ' + port + ': ' + logs);

    // 2. Setup Admin and Customer accounts
    const suffix = randomUUID().slice(0, 8);
    const adminEmail = `admin_p7_${suffix}@example.com`;
    const custEmail = `cust_p7_${suffix}@example.com`;
    const password = 'Password@123456';

    const regAdmin = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Admin Seven', email: adminEmail, password }),
    });
    assert.equal(regAdmin.status, 201);
    await db.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

    const adminLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail, password }),
    });
    const adminToken = adminLogin.body.accessToken;

    const regCust = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Customer Seven', email: custEmail, password }),
    });
    assert.equal(regCust.status, 201);
    const custToken = regCust.body.accessToken;
    const custUser = regCust.body.user;

    // 3. Category Management & ID 'quotes' Protection
    const categoriesRes = await api('/api/categories');
    assert.equal(categoriesRes.status, 200);
    assert.ok(Array.isArray(categoriesRes.body));
    const quotesCat = categoriesRes.body.find((c: any) => c.id === 'quotes');
    assert.ok(quotesCat, "Internal ID 'quotes' for Cars & Bikes must exist");
    assert.equal(quotesCat.name, 'Cars & Bikes', "Internal ID 'quotes' must map to Cars & Bikes");

    // Create a new category
    const catId = `cyberpunk-${suffix}`;
    const createCatRes = await api(
      '/api/admin/categories',
      {
        method: 'POST',
        body: JSON.stringify({
          id: catId,
          name: 'Cyberpunk Neon',
          blurb: 'Futuristic night vibes',
          motif: 'sparkle',
          displayOrder: 20,
        }),
      },
      adminToken
    );
    assert.equal(createCatRes.status, 201);
    const newCatId = createCatRes.body.id;

    // Verify categories list reflects the new category
    const categoriesAfterRes = await api('/api/categories');
    assert.ok(categoriesAfterRes.body.some((c: any) => c.id === newCatId));

    // 4. Authoritative Product CRUD & Storefront Filtering
    const productSlug = `test-sticker-${suffix}`;
    const productId = `prod-${suffix}`;
    const createProductRes = await api(
      '/api/admin/products',
      {
        method: 'POST',
        body: JSON.stringify({
          id: productId,
          name: 'Cyber Blade Hologram',
          slug: productSlug,
          description: 'Holographic cyberpunk sticker',
          price: 59,
          productType: 'single',
          category: 'stickers',
          categories: ['quotes', newCatId],
          status: 'PUBLISHED',
          stock: 40,
          packQuantity: 1,
          dimensions: '7.5 × 7.5 cm',
          finish: 'Holographic',
          rarity: 'RARE',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400',
              alt: 'Cyber Blade front',
              isPrimary: true,
              position: 0,
            },
          ],
        }),
      },
      adminToken
    );
    assert.equal(createProductRes.status, 201);
    const newProductId = createProductRes.body.id;
    assert.equal(createProductRes.body.slug, productSlug);

    // Verify product is visible in public storefront
    const publicProductsRes = await api('/api/products?type=stickers&category=quotes');
    assert.equal(publicProductsRes.status, 200);
    const publicItem = publicProductsRes.body.find((p: any) => p.id === newProductId);
    assert.ok(publicItem, 'New product must be visible in public shop without code edit');
    assert.equal(Number(publicItem.price), 59);

    // Hide product
    const hideProductRes = await api(
      `/api/admin/products/${newProductId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'HIDDEN' }),
      },
      adminToken
    );
    assert.equal(hideProductRes.status, 200);

    // Verify product is now hidden from public shop
    const publicAfterHideRes = await api('/api/products');
    assert.ok(!publicAfterHideRes.body.some((p: any) => p.id === newProductId));

    // Archive product
    const archiveProductRes = await api(
      `/api/admin/products/${newProductId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ARCHIVED' }),
      },
      adminToken
    );
    assert.equal(archiveProductRes.status, 200);
    assert.equal(archiveProductRes.body.status, 'ARCHIVED');

    // 5. Community Voting & Ideas
    const proposalsRes = await api('/api/proposals');
    assert.equal(proposalsRes.status, 200);
    assert.ok(Array.isArray(proposalsRes.body));
    assert.ok(proposalsRes.body.length > 0, 'Should have seeded active proposals');

    const targetProposal = proposalsRes.body[0];
    assert.ok(targetProposal.directions.length >= 2, 'Proposal should have at least 2 directions');
    const dirA = targetProposal.directions[0].id;
    const dirB = targetProposal.directions[1].id;

    // Cast vote for direction A
    const voteRes1 = await api(
      `/api/proposals/${targetProposal.id}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ directionId: dirA }),
      },
      custToken
    );
    assert.equal(voteRes1.status, 200);

    // Change vote to direction B (One-vote-per-account rule)
    const voteRes2 = await api(
      `/api/proposals/${targetProposal.id}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ directionId: dirB }),
      },
      custToken
    );
    assert.equal(voteRes2.status, 200);

    // Submit customer drop idea
    const ideaRes = await api(
      '/api/ideas',
      {
        method: 'POST',
        body: JSON.stringify({
          idea: 'Retro Arcade Vinyl Stickers: a series of neon 80s arcade cabinet stickers',
          originalConfirmed: true,
        }),
      },
      custToken
    );
    assert.equal(ideaRes.status, 201);
    const ideaId = ideaRes.body.id;

    // Admin reviews and approves idea
    const approveIdeaRes = await api(
      `/api/admin/ideas/${ideaId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      },
      adminToken
    );
    assert.equal(approveIdeaRes.status, 200);
    assert.equal(approveIdeaRes.body.status, 'APPROVED');

    // 6. Collector Passport Stamp Workflow
    // Initial passport: 0 available stamps
    const passportRes1 = await api('/api/me/passport', {}, custToken);
    assert.equal(passportRes1.status, 200);
    assert.equal(passportRes1.body.availableStamps, 0);

    // Customer adds shipping address
    const addrRes = await api(
      '/api/me/addresses',
      {
        method: 'POST',
        body: JSON.stringify({
          recipient: 'Phase 7 Shopper',
          line1: '123 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          isDefault: true,
        }),
      },
      custToken
    );
    assert.equal(addrRes.status, 201);
    const addressId = addrRes.body.id;

    // Customer adds in-stock item to cart
    const activeProducts = await api('/api/products?type=stickers');
    assert.equal(activeProducts.status, 200);
    const orderProduct = activeProducts.body[0];
    assert.ok(orderProduct);

    const cartRes = await api(
      '/api/cart/items',
      {
        method: 'POST',
        body: JSON.stringify({ productId: orderProduct.id, quantity: 1 }),
      },
      custToken
    );
    assert.equal(cartRes.status, 201);

    const placeOrderRes = await api(
      '/api/orders',
      {
        method: 'POST',
        headers: { 'Idempotency-Key': randomUUID() },
        body: JSON.stringify({
          addressId,
          paymentMethod: 'COD',
        }),
      },
      custToken
    );
    assert.equal(placeOrderRes.status, 201);
    const orderId = placeOrderRes.body.id;

    // Check passport: unpaid/uncompleted order should NOT grant stamps yet
    const passportRes2 = await api('/api/me/passport', {}, custToken);
    assert.equal(passportRes2.body.availableStamps, 0);

    // Admin collects COD payment
    const codRes = await api(`/api/admin/orders/${orderId}/cod-collected`, { method: 'POST' }, adminToken);
    assert.equal(codRes.status, 200);

    // Verify passport stamps awarded automatically upon COD collection!
    const passportRes3 = await api('/api/me/passport', {}, custToken);
    assert.ok(passportRes3.body.availableStamps >= 1, 'Passport stamp must be awarded upon COD collection');

    // Admin manual stamp adjustment with mandatory reason
    const adjustRes = await api(
      '/api/admin/passport/stamps',
      {
        method: 'POST',
        body: JSON.stringify({
          userId: custUser.id,
          count: 10,
          reason: 'Promotional anniversary stamp grant',
        }),
      },
      adminToken
    );
    assert.equal(adjustRes.status, 200);

    const passportAfterAdjust = await api('/api/me/passport', {}, custToken);
    assert.ok(passportAfterAdjust.body.availableStamps >= 8);

    // Customer redeems reward (requires stampsGoal stamps)
    const redeemRes = await api(
      '/api/me/passport/redeem',
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      custToken
    );
    assert.equal(redeemRes.status, 201);
    const redemptionId = redeemRes.body.redemption.id;

    // Verify passport stamps balance deducted
    const passportRes4 = await api('/api/me/passport', {}, custToken);
    assert.equal(passportRes4.body.availableStamps, passportAfterAdjust.body.availableStamps - passportAfterAdjust.body.stampsGoal);

    // Admin fulfills reward redemption
    const fulfillRes = await api(
      `/api/admin/passport/redemptions/${redemptionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'FULFILLED',
          notes: 'Shipped via priority airmail',
        }),
      },
      adminToken
    );
    assert.equal(fulfillRes.status, 200);
    assert.equal(fulfillRes.body.status, 'FULFILLED');

    console.log('✅ Phase 7 end-to-end integration test passed successfully.');
  } finally {
    proc.kill('SIGINT');
    await db.$disconnect();
  }
});
