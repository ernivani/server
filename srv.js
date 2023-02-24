const { http, io, app } = require('./app');
const db = require('./db');
const { md5 } = require('./utils');
const { login, register } = require('./user');
const { verifyToken } = require('./auth');

io.on('connection', (socket) => {
  console.log(`Socket ${socket.id} connected.`);

  socket.on('login', async (data) => {
    console.log(`Socket ${socket.id} sent a login request.`);
    try {
      const token = await login(data.email, data.password);
      socket.emit('loginResponse', { status: 'success', token: token });
    } catch (err) {
      socket.emit('loginResponse', { status: 'error', message: err.message });
    }
  });

  socket.on('auth', (token) => {
    const payload = verifyToken(token);
    if (payload) {
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
    } else {
      socket.emit('authResponse', { status: 'error', message: 'Invalid token.' });
    }
  });

  socket.on('logout', () => {
    socket.emit('logoutResponse', { status: 'success' });
  });

  socket.on('register', async (data) => {
    console.log(`Socket ${socket.id} sent a register request.`);
    try {
      const token = await register(data.email, data.username, data.password);
      socket.emit('registerResponse', { status: 'success', token: token });
    } catch (err) {
      socket.emit('registerResponse', { status: 'error', message: err.message });
    }
  });

  socket.on('getServer', (token) => {
    console.log(`Socket ${socket.id} sent a getServer request.`);
    const payload = verifyToken(token);
    if (payload) {
      const userId = payload.id;
      const sql = 'SELECT * FROM user WHERE id = ?';
      db.query(sql, [userId], (err, rows) => {
        if (err) {
          console.error('Error retrieving user from database: ', err);
          socket.emit('getServerResponse', { status: 'error', message: 'Database error.' });
          return;
        }
        if (rows.length === 0) {
          socket.emit('getServerResponse', { status: 'error', message: 'Invalid token.' });
        } else {
          const sql = 'SELECT * FROM server join members on server.id = members.server_id WHERE members.member_name = ?';
          db.query(sql, [rows[0].id], (err, rows) => {
            if (err) {
              console.error('Error retrieving user from database: ', err);
              socket.emit('getServerResponse', { status: 'error', message: 'Database error.' });
              return;
            }
            if (rows.length === 0) {
              socket.emit('getServerResponse', { status: 'error', message: 'No server found.', server: rows })
            } else {
                socket.emit('getServerResponse', { status: 'success', server: rows })
                }
            });
        }
        });
    } else {
        socket.emit('getServerResponse', { status: 'error', message: 'Invalid token.' });
        }
    });

});

const PORT = process.env.PORT || 5000;

console.log('Starting server...');
console.log(process.env.DB_HOST);

http.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
});


