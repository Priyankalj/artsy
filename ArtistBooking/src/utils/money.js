export const MAX_INR_DIGITS = 9;
export const MAX_INR_AMOUNT = 999999999;

/**
 * Keep rupees as digits only (max 9). Accepts 8000, "8,000", "₹8,000.00".
 */
export function parseINRDigits(value, maxDigits = MAX_INR_DIGITS) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/₹/g, '').replace(/,/g, '').trim();
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return String(Math.trunc(Math.abs(Number(normalized)))).slice(0, maxDigits);
  }
  return normalized.replace(/[^0-9]/g, '').slice(0, maxDigits);
}

export function toMoneyNumber(value) {
  const digits = parseINRDigits(value);
  return digits ? Number(digits) : 0;
}

/** Grouping only, e.g. 1,50,000 — prefix ₹ in the field or a sibling label. */
export function formatINRInput(value, maxDigits = MAX_INR_DIGITS) {
  const digits = parseINRDigits(value, maxDigits);
  if (!digits) return '';
  return Number(digits).toLocaleString('en-IN');
}

export function formatINR(amount) {
  return `₹${toMoneyNumber(amount).toLocaleString('en-IN')}`;
}
