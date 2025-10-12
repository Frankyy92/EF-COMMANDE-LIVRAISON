require('dotenv').config();
module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  timezone: process.env.TZ || 'Europe/Paris',
  cutoffHour: 21, // 21:00 local
  ,
  simpleLogin: (process.env.SIMPLE_LOGIN || 'false').toLowerCase() === 'true',
  allowedUsers: (process.env.ALLOWED_USERS || '').split(',').map(s=>s.trim()).filter(Boolean),
  dbPath: process.env.DB_PATH || null,
};

