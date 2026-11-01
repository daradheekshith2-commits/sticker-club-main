import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, type FormState } from './checkout';

const utrRegex = /^[A-Za-z0-9_-]{6,30}$/;

function validateUtr(utr: string): { valid: boolean; error?: string } {
  const trimmed = utr.trim();
  if (trimmed.length < 6) return { valid: false, error: 'UTR must be at least 6 characters' };
  if (trimmed.length > 30) return { valid: false, error: 'UTR must be at most 30 characters' };
  if (!utrRegex.test(trimmed)) return { valid: false, error: 'UTR contains invalid characters' };
  return { valid: true };
}

function calculateOrderBreakdown(lines: Array<{ price: number; quantity: number }>, deliveryFee: number) {
  const subtotal = lines.reduce((acc, l) => acc + l.price * l.quantity, 0);
  const total = subtotal + deliveryFee;
  return { subtotal, deliveryFee, total };
}

test('UTR validation accepts valid UPI reference formats and rejects malformed inputs', () => {
  const validUtrs = [
    '123456789012',
    'UTR_2026_001',
    'SBI-9988776655',
    'PAYTM123456',
    'hdfc_ref_889900',
  ];

  for (const utr of validUtrs) {
    const res = validateUtr(utr);
    assert.equal(res.valid, true, `Expected valid UTR for "${utr}"`);
    assert.equal(res.error, undefined);
  }

  const invalidUtrs = [
    '',
    '123',
    'abc',
    'UTR with spaces',
    'UTR@SPECIAL!',
    'UTR<script>alert(1)</script>',
    'A'.repeat(31),
  ];

  for (const utr of invalidUtrs) {
    const res = validateUtr(utr);
    assert.equal(res.valid, false, `Expected invalid UTR for "${utr}"`);
    assert.ok(res.error);
  }
});

test('Delivery and pickup form validation rules', () => {
  // Pickup only requires name and contact
  const pickupForm: FormState = {
    name: 'Rohan Sharma',
    contact: '9876543210',
    delivery: 'pickup',
    address: '',
    pincode: '',
    notes: 'Will pick up at campus',
  };
  assert.deepEqual(validate(pickupForm), {});

  // Delivery requires address (min 8 chars) and 6-digit Indian PIN
  const deliveryForm: FormState = {
    ...pickupForm,
    delivery: 'delivery',
  };
  const errors = validate(deliveryForm);
  assert.ok(errors.address, 'Address should be required for delivery');
  assert.ok(errors.pincode, 'Pincode should be required for delivery');

  const validDelivery: FormState = {
    ...deliveryForm,
    address: 'Plot 42, Hitech City Main Road, Madhapur',
    pincode: '500081',
  };
  assert.deepEqual(validate(validDelivery), {});
});

test('Order subtotal and delivery fee calculations', () => {
  const lines = [
    { price: 49, quantity: 2 }, // 98
    { price: 99, quantity: 1 }, // 99
    { price: 25, quantity: 4 }, // 100
  ];
  const breakdown = calculateOrderBreakdown(lines, 50);
  assert.equal(breakdown.subtotal, 297);
  assert.equal(breakdown.deliveryFee, 50);
  assert.equal(breakdown.total, 347);

  const freeDeliveryBreakdown = calculateOrderBreakdown(lines, 0);
  assert.equal(freeDeliveryBreakdown.subtotal, 297);
  assert.equal(freeDeliveryBreakdown.deliveryFee, 0);
  assert.equal(freeDeliveryBreakdown.total, 297);
});
