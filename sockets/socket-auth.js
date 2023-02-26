const { verifyToken } = require('../utils/auth');
const { logWithTime, addLogEntry } = require('../utils/log');
const  db  = require('../utils/db');

function socketAuth(token, next) {
  const start = Date.now();
  const payload = verifyToken(token);
  if (payload) {
    const userId = payload.id;
    const sql = 'SELECT * FROM user WHERE id = ?';
    db.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error('Error retrieving user from database: ', err);
        addLogEntry('Socket', '/auth', 500, Date.now() - start);
        next(new Error('Database error.'));
        return;
      }
      if (rows.length === 0) {
        addLogEntry('Socket', '/auth', 401, Date.now() - start);
        next(new Error('Invalid token.'));
      } else {
        addLogEntry('Socket', '/auth', 200, Date.now() - start);
        next();
      }
    });
  } else {
    addLogEntry('Socket', '/auth', 401, Date.now() - start);
    next(new Error('Invalid token.'));
  }
}

module.exports = { socketAuth };
