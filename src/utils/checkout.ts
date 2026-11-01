/** Checkout preview form: types and validation (pure functions, unit-tested). */

export type Delivery = 'pickup' | 'delivery';

export interface FormState {
  name: string;
  contact: string;
  delivery: Delivery;
  address: string;
  pincode: string;
  notes: string;
}

export type Errors = Partial<Record<keyof FormState, string>>;

export const initialForm: FormState = { name: '', contact: '', delivery: 'pickup', address: '', pincode: '', notes: '' };

const indianMobile = /^(?:\+?91[\s-]?)?[6-9]\d{9}$/;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pincode = /^[1-9]\d{5}$/;

/** Returns an error message for every invalid field (empty object = valid). */
export function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = 'Please enter your name.';
  const contact = f.contact.replace(/\s/g, '');
  if (!contact) e.contact = 'Please enter a phone number or email.';
  else if (!indianMobile.test(contact) && !email.test(contact)) e.contact = 'Enter a 10-digit Indian mobile number or a valid email.';
  if (f.delivery === 'delivery') {
    if (f.address.trim().length < 8) e.address = 'Please enter a delivery address.';
    if (!pincode.test(f.pincode.trim())) e.pincode = 'Enter a 6-digit PIN code.';
  }
  return e;
}
