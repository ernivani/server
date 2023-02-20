const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').createServer(app);

const mysql = require('mysql');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'chatuser',
  password: 'tnSW6SsvX%BPHzvS',
  database: 'chatdb'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database: ', err);
    return;
  }
});

app.use(cors());

const io = require('socket.io')(http, {
  cors: {
    origin: 'http://213.32.89.28:8080',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {

  const sql = 'SELECT * FROM messages ORDER BY timestamp DESC LIMIT 20';
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Error retrieving messages from database: ', err);
      return;
    }
    const messages = rows.reverse().map((row) => ({
      id: row.id,
      username: row.username,
      text: row.text,
      timestamp: row.timestamp.toISOString().slice(0, 19).replace('T', ' '),
    }));
    socket.emit('history', messages);
  });

  socket.on('message', (message) => {

    const { username, text, timestamp } = message;

    const sql = 'INSERT INTO messages (username, text, timestamp) VALUES (?, ?, ?)';

    const values = [username, text, timestamp];
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error inserting message into database: ', err);
        return;
      }
      message.id = result.insertId;
      socket.broadcast.emit('message', message);
    });
  });

  socket.on('disconnect', () => {
  });
});

http.listen(5000, () => {
  console.log('listening on *:5000');
});
 