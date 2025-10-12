// utils/auth.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Hash sécurisé par défaut (bcrypt).
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

/**
 * Vérifie un mot de passe contre un hash bcrypt OU ancien SHA-256.
 * - Si le hash commence par "$2" => c'est bcrypt.
 * - Sinon, on compare en SHA-256 (compat legacy).
 */
function verifyPassword(password, hashed) {
  if (!hashed) return false;

  if (typeof hashed === 'string' && hashed.startsWith('$2')) {
    try {
      return bcrypt.compareSync(password, hashed);
    } catch {
      return false;
    }
  }
  const sha = crypto.createHash('sha256').update(password).digest('hex');
  return sha === hashed;
}

module.exports = { hashPassword, verifyPassword };
