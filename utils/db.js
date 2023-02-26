const mysql = require('mysql');

const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'chatuser',
//   password: 'tnSW6SsvX%BPHzvS',
//   database: 'chatdb'
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

module.exports = db;
