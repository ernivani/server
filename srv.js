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
  }else {
    console.log('Connected to MySQL database');
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

  const sql = 'SELECT * FROM messages ORDER BY date_message DESC LIMIT 20';
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
    console.log('client logged in');
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
    
    const sql = 'SELECT * FROM user WHERE user_email = ? AND user_password = ?';
    const values = [email, md5(password)];
    db.query(sql, values, (err, rows) => {
      // if we connect then create a token and send it back to the client
      if (err) {
        console.error('Error retrieving user from database: ', err);
        return;
      }
      if (rows.length === 0) {
        socket.emit('login', {status: 'error', message: 'Invalid username or password'});
        console.log('Invalid username or password');
      } else {
        // create a token
        const token = generateToken();
        // update the token in the database
        const sql = 'INSERT INTO user_token(token,user_id) VALUES (?, ?)';
        const values = [token, rows[0].id];
        db.query(sql, values, (err, result) => {
          if (err) {
            console.error('Error updating token in database: ', err);
            return;
          }
          socket.emit('login', {status: 'success',message: 'Login successful', token: token, username: rows[0].username});
        });
      }
    });
    


    //   if (err) {
    //     console.error('Error retrieving users from database: ', err);
    //     return;
    //   }
    //   if (rows.length === 0) {
    //     socket.emit('login', {status: 'error', message: 'Invalid username or password'});
    //     console.log('Invalid username or password');
    //   } else {
    //     socket.emit('login', {status: 'success',message: 'Login successful', token: rows[0].token, username: rows[0].username});
    //   }
    // });
  });
  
  socket.on('register', (user) => {
    const { email, username, password } = user;
    const token = generateToken();

    // verify if user already exists
    let sql = 'SELECT * FROM user WHERE email = ?';
    let values = [email];


    db.query(sql, values, (err, rows) => {
        if (err) {
            console.error('Error retrieving user from database: ', err);
            return;
        }
        if (rows.length > 0) {
            socket.emit('register', {status: 'error', message: 'Email already exists'});
        } else {
            sql = 'INSERT INTO user (email, username, password, token) VALUES (?, ?, ?, ?)';
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

// optimised code : 
    db.query('select * from user_token where token = ?', [token], (err, rows) => {
        if (err) {
            console.error('Error retrieving user from database: ', err);
            return;
        }
        if (rows.length === 0) {
          socket.emit('getServer', {status: 'error', message: 'Invalid id'});
        } else {
            db.query('select server_name,server.id from server inner join members on server.id = members.server_id where members.member_name = ?', [rows[0].user_id], (err, rows) => {
                if (err) {
                    console.error('Error retrieving server from database: ', err);
                    return;
                }
                const serverList = rows.map((row) => ({
                    id: row.id,
                    name: row.server_name,
                }));
                socket.emit('getServer', {status: 'success', message: 'Server list', serverList: serverList});
            });
        }
    });
  });




  socket.on('createServer', (server) => {
    const { name, token } = server;

    // insert into server (server_name,owner_id,member_id) values ("test",(SELECT id FROM user WHERE user_name = 'ernicani'),(SELECT id from user where user_name = 'ernicani'));
    let sql = 'SELECT user_id FROM user_token WHERE token = ?'

    db.query(sql, [token], (err, rows) => {
      if (err) {
        console.error('Error retrieving user from database: ', err);
        return;
      }
      if (rows.length === 0) {
        socket.emit('createServer', {status: 'error', message: 'Invalid id'});
      } else {
        let id = rows[0].user_id;
        sql = 'INSERT INTO server (server_name,owner_id,member_id) VALUES (?, ?, ?)';
        let values = [name,id,id];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.error('Error inserting server into database: ', err);
            return;
          }else {
            sql = 'INSERT INTO members (member_name,server_id) VALUES (?,?)';
            values = [id,result.insertId];
            db.query(sql, values, (err, result) => {
              if (err) {
                console.error('Error inserting server into database: ', err);
                return;
              }
              socket.emit('createServer', {status: 'success', message: 'Server created'});
            });
          }
          
        });
      }
    });

  });

  socket.on('getChannel', (channel) => {
    const { serverId, token } = channel;
    console.log(channel);
  });
  

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });


});


http.listen(5000, () => {
  console.log('listening on *:5000');
});
 