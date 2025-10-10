const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DEFAULT_BCRYPT_ROUNDS = 10;

function resolveSaltRounds() {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || `${DEFAULT_BCRYPT_ROUNDS}`, 10);
  return Number.isNaN(rounds) || rounds < 4 ? DEFAULT_BCRYPT_ROUNDS : rounds;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(resolveSaltRounds()));
}

function verifyPassword(password, hashed) {
  if (!hashed) {
    return false;
  }

  if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$') || hashed.startsWith('$2y$')) {
    return bcrypt.compareSync(password, hashed);
  }

  const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
  return legacyHash === hashed;
}

module.exports = { hashPassword, verifyPassword };

