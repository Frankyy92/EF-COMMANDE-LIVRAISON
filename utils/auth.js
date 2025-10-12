// utils/auth.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Hash sécurisé par défaut (bcrypt)
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Vérifie un mot de passe contre un hash bcrypt OU ancien SHA-256
function verifyPassword(password, hashed) {
  if (!hashed) return false;
  // Bcrypt ?
  if (typeof hashed === 'string' && hashed.startsWith('$2')) {
    return bcrypt.compareSync(password, hashed);
  }
  // Fallback legacy SHA-256 (pour les anciennes bases)
  const sha = crypto.createHash('sha256').update(password).digest('hex');
  return sha === hashed;
}

module.exports = { hashPassword, verifyPassword };
