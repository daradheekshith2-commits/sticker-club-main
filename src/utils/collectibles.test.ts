import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../data/products';
import { rarityTiers, series } from '../data/rarity';
import { messageCardSeries } from '../data/messageCards';
import { bonusGift } from '../config/bonusGift';
import { passportConfig } from '../config/passport';
import { getContents, getPackQuantity } from './catalogue';
import { mysteryPool, rarityGroups, seriesIdForVariant } from './collectibles';
import { passportProgress, validateIdea } from './community';

const mystery = products.find((p) => p.productType === 'mystery')!;

test('mystery pack: 5 guaranteed + 1 mystery, one theme per series', () => {
  assert.equal(mystery.mystery!.guaranteedCount, 5);
  assert.equal(mystery.mystery!.mysteryCount, 1);
  assert.equal(getPackQuantity(mystery), 6, 'pack size matches 5 + 1');
  assert.equal(mystery.variantLabel, 'Theme');
  assert.deepEqual(mystery.variants!.map((v) => seriesIdForVariant(v.id)), series.map((s) => s.id));
});

test('mystery pack: every theme has enough designs for the guarantee', () => {
  for (const s of series) {
    const pool = mysteryPool(s.id);
    assert.ok(pool.length >= mystery.mystery!.guaranteedCount, `${s.id} has only ${pool.length}`);
    assert.ok(pool.every((p) => p.rarity === 'common' || p.rarity === 'uncommon'));
  }
});

test('no invented odds, stock or edition numbers', () => {
  // Odds stay unconfigured until real special stock exists.
  assert.equal(mystery.mystery!.odds, null);
  assert.ok(mystery.mystery!.specialVariants.every((v) => !v.inventoryConfirmed));
  // Limited editions never carry an unconfirmed run size.
  for (const p of products.filter((x) => x.rarity === 'limited')) {
    assert.ok(p.edition, `${p.id} needs edition info`);
    assert.ok(p.edition!.confirmed || p.edition!.runSize === null, `${p.id} shows an unconfirmed run size`);
  }
});

test('rarity and series data are consistent', () => {
  const tierIds = new Set(rarityTiers.map((t) => t.id));
  const seriesIds = new Set(series.map((s) => s.id));
  for (const p of products) {
    if (p.rarity) assert.ok(tierIds.has(p.rarity), p.id);
    if (p.seriesId) assert.ok(seriesIds.has(p.seriesId), p.id);
  }
  const groups = rarityGroups();
  assert.deepEqual(groups.map((g) => g.tier.id), ['common', 'uncommon', 'rare', 'limited']);
  assert.ok(groups.every((g) => g.items.length > 0), 'every tier has at least one design');
});

test('duos are one product with two named parts', () => {
  const duos = products.filter((p) => p.productType === 'duo');
  assert.ok(duos.length >= 4);
  const pairings = new Set(duos.map((d) => d.duo!.pairing));
  for (const k of ['two-poses', 'complementary', 'halves', 'laptop-phone']) assert.ok(pairings.has(k as never), `missing ${k}`);
  for (const d of duos) {
    assert.equal(d.art.kind, 'duo');
    assert.equal(getPackQuantity(d), 2);
    assert.equal(getContents(d).length, 2);
  }
});

test('secret message products link to a real card series', () => {
  const secret = products.filter((p) => p.productType === 'secret');
  assert.ok(secret.length >= 5);
  for (const p of secret) {
    assert.ok(messageCardSeries.some((m) => m.id === p.messageCardId), p.id);
    assert.ok((p.messageCardCount ?? 0) >= 1);
    assert.ok(getContents(p).some((c) => /sealed message card/.test(c)));
  }
});

test('bonus gift stays planned, with no coupon promised', () => {
  assert.equal(bonusGift.status, 'planned');
  assert.ok(!bonusGift.components.find((c) => c.id === 'coupon')!.active, 'no coupon codes exist');
  assert.ok(bonusGift.components.filter((c) => !c.active).every((c) => c.inactiveReason));
});

test('passport progress caps at the goal', () => {
  assert.deepEqual(passportProgress(3, 8), { count: 3, goal: 8, percent: 38, complete: false });
  assert.equal(passportProgress(12, passportConfig.stampsGoal).count, passportConfig.stampsGoal);
  assert.ok(passportProgress(8, 8).complete);
  assert.equal(passportProgress(-2, 8).count, 0);
});

test('idea submissions are validated', () => {
  const ok = { proposalId: 'tech', idea: 'A tiny terminal that says good morning', name: '', originalConfirmed: true };
  assert.deepEqual(validateIdea(ok), {});
  assert.ok(validateIdea({ ...ok, proposalId: '' }).proposalId);
  assert.ok(validateIdea({ ...ok, idea: 'short' }).idea);
  assert.ok(validateIdea({ ...ok, idea: 'x'.repeat(281) }).idea);
  assert.ok(validateIdea({ ...ok, idea: 'like this https://pinterest.com/pin/1' }).idea);
  assert.ok(validateIdea({ ...ok, originalConfirmed: false }).originalConfirmed);
  assert.ok(validateIdea({ ...ok, name: 'n'.repeat(41) }).name);
});
