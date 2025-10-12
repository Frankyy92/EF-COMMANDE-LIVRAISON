// config.js
require('dotenv').config();
const path = require('path');

const config = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'change-me',
  simpleLogin: String(process.env.SIMPLE_LOGIN).toLowerCase() === 'true',
  allowedUsers: (process.env.ALLOWED_USERS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data', 'app.db'),
  timezone: process.env.TZ || 'Europe/Paris'
};

module.exports = config;
