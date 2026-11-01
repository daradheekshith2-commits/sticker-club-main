import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialForm, validate } from './checkout';

test('empty form reports name and contact errors', () => {
  const e = validate(initialForm);
  assert.ok(e.name && e.contact);
  assert.equal(e.address, undefined, 'address is only required for delivery');
});

test('accepts Indian mobile numbers and emails', () => {
  for (const contact of ['9876543210', '+91 98765 43210', '91-9876543210', 'a.student@college.edu']) {
    assert.deepEqual(validate({ ...initialForm, name: 'Asha', contact }), {}, contact);
  }
  for (const contact of ['12345', '1234567890', 'not-an-email', 'x@y']) {
    assert.ok(validate({ ...initialForm, name: 'Asha', contact }).contact, contact);
  }
});

test('delivery requires an address and a 6-digit PIN', () => {
  const base = { ...initialForm, name: 'Asha', contact: '9876543210', delivery: 'delivery' as const };
  const e = validate(base);
  assert.ok(e.address && e.pincode);
  assert.deepEqual(validate({ ...base, address: 'Hostel Block C, Room 12', pincode: '500075' }), {});
  assert.ok(validate({ ...base, address: 'Hostel Block C, Room 12', pincode: '050075' }).pincode);
});
