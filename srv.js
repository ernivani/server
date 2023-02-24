const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').createServer(app);
const crypto = require('crypto');

const jwt = require('jsonwebtoken');

const SECRET_KEY = 'ernicani'

const mysql = require('mysql');
const cookieParser = require('cookie-parser');
const db = mysql.createConnection({
  host: 'localhost',
  user: 'chatuser',
  password: 'tnSW6SsvX%BPHzvS',
  database: 'chatdb'
});


app.use(cors(), cookieParser());

const io = require('socket.io')(http, {
  cors: {
    origin: 'http://213.32.89.28:8080',
    methods: ['GET', 'POST'],
  },
});

function md5(password) {
  let md5 = crypto.createHash('md5');
  md5.update(password);
  return md5.digest('hex');
}

io.on('connection', (socket) => {
  console.log(`Socket ${socket.id} connected.`);

  socket.on('login', (data) => {
    console.log(`Socket ${socket.id} sent a login request.`);

    // mettre dans une const le mail
    const email = data.email;
    // mettre dans une const le password encoder avec la fonction md5
    const password = md5(data.password);


    // faire une requete sql pour verifier si le mail et le password sont correct
    // si oui, on envoie un message de succes

    const sql = 'SELECT * FROM user WHERE user_email = ? AND user_password = ?';
    db.query(sql, [email, password], (err, rows) => {
      if (err) {
        console.error('Error retrieving messages from database: ', err);
        return;
      }
      if (rows.length > 0) {
        //todo: on envoie un message de succes et on envoie le token grace a jwt auth et on envoie le token dans le cookie en httpOnly
        const user = rows[0];
        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '30d' });
        socket.emit('loginResponse', { status: 'success', token: token });
        console.log(token);
      } 
      else {
        // on envoie un message d'erreur
        socket.emit('loginResponse', { status: 'error', message: 'Invalid email or password.' });
      }

    });
      
  });

    
  socket.on('auth', (token) => {
    try {
      const payload = jwt.verify(token, SECRET_KEY);
      const userId = payload.id;

      const sql = 'SELECT * FROM user WHERE id = ?';
      db.query(sql, [userId], (err, rows) => {
        if (err) {
          console.error('Error retrieving user from database: ', err);
          socket.emit('authResponse', { status: 'error', message: 'Database error.' });
          return;
        }
        if (rows.length === 0) {
          socket.emit('authResponse', { status: 'error', message: 'Invalid token.' });
        } else {
          socket.emit('authResponse', { status: 'success' });
        }
        });
      } catch (err) {
        socket.emit('authResponse', { status: 'error', message: 'Invalid token.' });
      }
    });

    socket.on('logout', () => {
      socket.emit('logoutResponse', { status: 'success' });
    });


  socket.on('register', (data) => {
    console.log(`Socket ${socket.id} sent a register request.`);
    const email = data.email;
    const username = data.username;
    const password = md5(data.password);

    // Check if the email is already registered
    const checkEmailSql = 'SELECT * FROM user WHERE user_email = ?';
    db.query(checkEmailSql, [email], (checkEmailErr, checkEmailRows) => {
      if (checkEmailErr) {
        console.error('Error retrieving user from database: ', checkEmailErr);
        socket.emit('registerResponse', { status: 'error', message: 'Database error.' });
        return;
      }
      if (checkEmailRows.length > 0) {
        // Email already registered
        socket.emit('registerResponse', { status: 'error', message: 'Email already registered.' });
        return;
      }
      // Email not registered, create a new user
      const createUserSql = 'INSERT INTO user (user_email, user_password, user_name) VALUES (?, ?, ?)';
      db.query(createUserSql, [email, password, username], (createUserErr, createUserRows) => {
        if (createUserErr) {
          console.error('Error creating user in database: ', createUserErr);
          socket.emit('registerResponse', { status: 'error', message: 'Database error.' });
          return;
        }

        // User created successfully, send success response
        const token = jwt.sign({ id: createUserRows.insertId }, SECRET_KEY, { expiresIn: '30d' });
        socket.emit('registerResponse', { status: 'success', token: token });
        console.log(`User registered successfully with ID ${createUserRows.insertId}.`);
      });
    });
  });





  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected.`);
  });
});





// Start the server
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}.`);
});