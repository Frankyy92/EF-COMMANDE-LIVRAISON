const crypto = require('crypto');

/**
 * Génère un hash SHA-256 pour un mot de passe.
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Vérifie qu'un mot de passe en clair correspond au hash stocké.
 * @param {string} password
 * @param {string} hashed
 * @returns {boolean}
 */
function verifyPassword(password, hashed) {
  return hashPassword(password) === hashed;
}

module.exports = { hashPassword, verifyPassword };