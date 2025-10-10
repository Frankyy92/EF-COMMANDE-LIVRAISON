const bcrypt = require('bcryptjs');

/**
 * Génère un hash sécurisé (bcrypt) pour un mot de passe.
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

/**
 * Vérifie qu'un mot de passe en clair correspond au hash stocké.
 * @param {string} password
 * @param {string} hashed
 * @returns {boolean}
 */
function verifyPassword(password, hashed) {
  if (!hashed) return false;
  return bcrypt.compareSync(password, hashed);
}

module.exports = { hashPassword, verifyPassword };
