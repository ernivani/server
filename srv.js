const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').createServer(app);
const crypto = require('crypto');

const mysql = require('mysql');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'chatuser',
  password: 'tnSW6SsvX%BPHzvS',
  database: 'chatdb'
});

function md5(password) {
  let md5 = crypto.createHash('md5');
  md5.update(password);
  return md5.digest('hex');
}

// genereate a random token
function generateToken() {
  return crypto.randomBytes(20).toString('hex');
}


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

  socket.on('login', (user) => {
    const { email, password } = user;
    
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    const values = [email, md5(password)];
    db.query(sql, values, (err, rows) => {
      if (err) {
        console.error('Error retrieving users from database: ', err);
        return;
      }
      if (rows.length === 0) {
        socket.emit('login', {status: 'error', message: 'Invalid username or password'});
        console.log('Invalid username or password');
      } else {
        socket.emit('login', {status: 'success',message: 'Login successful', token: rows[0].token, username: rows[0].username});
      }
    });
  });
  
  socket.on('register', (user) => {
    const { email, username, password } = user;
    const token = generateToken();

    // verify if user already exists
    let sql = 'SELECT * FROM users WHERE email = ?';
    let values = [email];


    db.query(sql, values, (err, rows) => {
        if (err) {
            console.error('Error retrieving users from database: ', err);
            return;
        }
        if (rows.length > 0) {
            socket.emit('register', {status: 'error', message: 'Email already exists'});
        } else {
            sql = 'INSERT INTO users (email, username, password, token) VALUES (?, ?, ?, ?)';
            values = [email,username,md5(password),token];
            db.query(sql, values, (err, result) => {
                if (err) {
                    console.error('Error inserting user into database: ', err);
                    return;
                }
                socket.emit('register', {status: 'success', message: 'Registration successful', token: token});
            });
        }
    });
  });

  socket.on('getServer', (server) => {

    const token = server;

    // verify if user already exists
    let sql = 'select * from users where token = ?';


    db.query(sql, [token], (err, rows) => {
        if (err) {
            console.error('Error retrieving users from database: ', err);
            return;
        }
        if (rows.length === 0) {
          socket.emit('getServer', {status: 'error', message: 'Invalid id'});
        } else {
            // get the server list
            sql = 'SELECT * FROM servers';
            db.query(sql, (err, rows) => {
                if (err) {
                    console.error('Error retrieving servers from database: ', err);
                    return;
                }
                const serverList = rows.map((row) => ({
                    id: row.id,
                    name: row.name,
                }));
                console.log(serverList);
                socket.emit('getServer', {status: 'aaa', message: 'Server list', list: serverList});
            });

        }
    });

    });

  socket.on('createServer', (server) => {
    const { name, token } = server;

    let sql = 'Insert into servers (name, owner, members) values (?, ?, ?)';

    let values = [name, token, token];

    console.log(values);
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error inserting server into database: ', err);
        return;
      }
      socket.emit('createServer', {status: 'success', message: 'Server created'});
    });
  });

    

    

  socket.on('disconnect', () => {
  });


});


http.listen(5000, () => {
  console.log('listening on *:5000');
});
 