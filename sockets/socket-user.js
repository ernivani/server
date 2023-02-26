const db = require('./db');
const { verifyToken } = require('./auth');

function getUserInfo(socket, token) {
  const payload = verifyToken(token);
  if (payload) {
    const userId = payload.id;
    const sql = 'SELECT id, email, username FROM user WHERE id = ?';
    db.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error('Error retrieving user from database: ', err);
        socket.emit('userInfoResponse', { status: 'error', message: 'Database error.' });
      } else if (rows.length === 0) {
        socket.emit('userInfoResponse', { status: 'error', message: 'Invalid user ID.' });
      } else {
        socket.emit('userInfoResponse', { status: 'success', user: rows[0] });
      }
    });
  } else {
    socket.emit('userInfoResponse', { status: 'error', message: 'Invalid token.' });
  }
}

function updateUserPassword(socket, token, currentPassword, newPassword) {
  const payload = verifyToken(token);
  if (payload) {
    const userId = payload.id;
    const sql = 'SELECT * FROM user WHERE id = ?';
    db.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error('Error retrieving user from database: ', err);
        socket.emit('updatePasswordResponse', { status: 'error', message: 'Database error.' });
      } else if (rows.length === 0) {
        socket.emit('updatePasswordResponse', { status: 'error', message: 'Invalid user ID.' });
      } else if (rows[0].password !== md5(currentPassword)) {
        socket.emit('updatePasswordResponse', { status: 'error', message: 'Current password is incorrect.' });
      } else {
        const sql = 'UPDATE user SET password = ? WHERE id = ?';
        db.query(sql, [md5(newPassword), userId], (err, result) => {
          if (err) {
            console.error('Error updating password in database: ', err);
            socket.emit('updatePasswordResponse', { status: 'error', message: 'Database error.' });
          } else {
            socket.emit('updatePasswordResponse', { status: 'success' });
          }
        });
      }
    });
  } else {
    socket.emit('updatePasswordResponse', { status: 'error', message: 'Invalid token.' });
  }
}

module.exports = {
  getUserInfo,
  updateUserPassword,
};
