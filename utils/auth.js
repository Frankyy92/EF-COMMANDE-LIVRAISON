// utils/auth.js — utilisé par le script de seed uniquement
const bcrypt = require('bcryptjs');

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  // plus vraiment utile sans login, gardé pour compatibilité
  return bcrypt.compareSync(password, hash);
}

module.exports = { hashPassword, verifyPassword };
