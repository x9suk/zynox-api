const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { sha256, timingSafeEqual };
