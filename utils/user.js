const db = require('./db');
const { generateToken } = require('./auth');
const { md5 } = require('./utils');


function login(email, password) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM user WHERE user_email = ? AND user_password = ?';
    db.query(sql, [email, md5(password)], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      if (rows.length > 0) {
        const user = rows[0];
        const token = generateToken(user.id);
        resolve({token, username: user.user_name});
      } else {
        reject(new Error('Invalid email or password.'));
      }
    });
  });
}

function register(email, username, password) {
  return new Promise((resolve, reject) => {
    const checkEmailSql = 'SELECT * FROM user WHERE user_email = ?';
    db.query(checkEmailSql, [email], (checkEmailErr, checkEmailRows) => {
      if (checkEmailErr) {
        reject(checkEmailErr);
        return;
      }
      if (checkEmailRows.length > 0) {
        reject(new Error('Email already registered.'));
        return;
      }
      const createUserSql = 'INSERT INTO user (user_email, user_password, user_name) VALUES (?, ?, ?)';
      db.query(createUserSql, [email, md5(password), username], (createUserErr, createUserRows) => {
        if (createUserErr) {
          reject(createUserErr);
          return;
        }
        const token = generateToken(createUserRows.insertId);
        resolve({token: token, username: username});
      });
    });
  });
}

module.exports = { login, register };
