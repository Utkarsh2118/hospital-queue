// Basic, dependency-free validators. Good enough to catch typos and
// obviously-fake input — not a substitute for verifying real ownership
// (that's what the OTP step during login does for phone numbers).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Accepts +91XXXXXXXXXX (E.164) or a plain 10-digit Indian mobile number.
// Normalizes to E.164 (+91XXXXXXXXXX) so Twilio always gets a clean value.
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

function normalizePhone(phone) {
  if (typeof phone !== 'string') return null;
  const trimmed = phone.trim().replace(/[\s-]/g, '');

  if (/^\+91[6-9]\d{9}$/.test(trimmed)) return trimmed;
  if (INDIAN_MOBILE_RE.test(trimmed)) return `+91${trimmed}`;

  return null; // invalid — caller should reject
}

module.exports = { isValidEmail, normalizePhone };
