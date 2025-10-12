require('dotenv').config();
module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  timezone: process.env.TZ || 'Europe/Paris',
  cutoffHour: 21, // 21:00 local
};
