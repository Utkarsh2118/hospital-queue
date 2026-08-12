const crypto = require('crypto');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  // 6-digit numeric code, zero-padded (e.g. "042817")
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const expires = new Date(Date.now() + OTP_TTL_MS);
  return { code, codeHash, expires };
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

module.exports = { generateOtp, hashOtp };
