const { http, io, app } = require('./utils/app');
const db = require('./utils/db');
const { md5 } = require('./utils/utils');
const { login, register } = require('./utils/user');
const { verifyToken, closeToken } = require('./utils/auth');
const { forgetPassword } = require('./utils/forgetPassword');
const { logToFile, logWithTime, addLogEntry } = require('./utils/log');

const { socketAuth } = require('./sockets/socket-auth');





io.on('connection', (socket) => {
  logWithTime(`Socket ${socket.id} connected.`);
  socket.on('login', async (data) => {
    logWithTime(`Socket ${socket.id} sent a login request.`);
    const start = Date.now();
    try {
      const token = await login(data.email, data.password);
      addLogEntry('Socket', '/login', 200, Date.now() - start);
      socket.emit('loginResponse', { status: 'success', token: token });
    } catch (err) {        
      addLogEntry('Socket', '/login', 500, Date.now() - start);
      socket.emit('loginResponse', { status: 'error', message: err.message });
    }
  });

  socket.on('auth', (data) => {
    logWithTime(`Socket ${data.id} sent an auth request.`);
    
    socketAuth(data, (err) => {
      if (err) {
        logWithTime(`Socket ${socket.id} failed to authenticate.`);
        socket.emit('authResponse', { status: 'error', message: err.message });
      } else {
        logWithTime(`Socket ${socket.id} authenticated successfully.`);
        socket.emit('authResponse', { status: 'success' });
      }
    });
  });

  socket.on('logout', (data) => {
    const token = data;
    logWithTime(`Socket ${socket.id} sent a logout request.`);
    logWithTime(`Token: ${token}`);
    console.log(closeToken(token));
    const start = Date.now();
    const payload = verifyToken(token);
    if (payload) {
      const userId = payload.id;
      const sql = 'SELECT * FROM user WHERE id = ?';
      db.query(sql, [userId], (err, rows) => {
        if (err) {
          console.error('Error retrieving user from database: ', err);
          addLogEntry('Socket', '/logout', 500, Date.now() - start);
          socket.emit('logoutResponse', { status: 'error', message: 'Database error.' });
          return;
        }
        if (rows.length === 0) {
          addLogEntry('Socket', '/logout', 401, Date.now() - start);
          socket.emit('logoutResponse', { status: 'error', message: 'Invalid token.' });
        } else {
          closeToken(token);
          addLogEntry('Socket', '/logout', 200, Date.now() - start);
          socket.emit('logoutResponse', { status: 'success' });
        }
      });
    } else {
      addLogEntry('Socket', '/logout', 401, Date.now() - start);
      socket.emit('logoutResponse', { status: 'error', message: 'Invalid token.' });
    }
  });

  socket.on('register', async (data) => {
    logWithTime(`Socket ${socket.id} sent a register request.`);
    const start = Date.now();
    try {
      const token = await register(data.email, data.username, data.password);
      addLogEntry('Socket', '/register', 200, Date.now() - start);
      socket.emit('registerResponse', { status: 'success', token: token });
    } catch (err) {
      addLogEntry('Socket', '/register', 500, Date.now() - start);
      socket.emit('registerResponse', { status: 'error', message: err.message });
    }
  });

  socket.on('getServer', (token) => {
    logWithTime(`Socket ${socket.id} sent a getServer request.`);
    const start = Date.now();
    const payload = verifyToken(token);
    if (payload) {
      const userId = payload.id;
      const sql = 'SELECT * FROM user WHERE id = ?';
      db.query(sql, [userId], (err, rows) => {
        if (err) {
          console.error('Error retrieving user from database: ', err);
          addLogEntry('Socket', '/getServer', 500, Date.now() - start);
          socket.emit('getServerResponse', { status: 'error', message: 'Database error.' });
          return;
        }
        if (rows.length === 0) {
          addLogEntry('Socket', '/getServer', 401, Date.now() - start);
          socket.emit('getServerResponse', { status: 'error', message: 'Invalid token.' });
        } else {
          const sql = 'SELECT * FROM server join members on server.id = members.server_id WHERE members.member_name = ?';
          db.query(sql, [rows[0].id], (err, rows) => {
            if (err) {
              console.error('Error retrieving user from database: ', err);
              addLogEntry('Socket', '/getServer', 500, Date.now() - start);
              socket.emit('getServerResponse', { status: 'error', message: 'Database error.' });
              return;
            }
            if (rows.length === 0) {
              addLogEntry('Socket', '/getServer', 200, Date.now() - start);
              socket.emit('getServerResponse', { status: 'success', message: 'No server found.', server: rows })
            } else {
              addLogEntry('Socket', '/getServer', 200, Date.now() - start);
              socket.emit('getServerResponse', { status: 'success', server: rows })
              }
            });
        }
        });
    } else {
      addLogEntry('Socket', '/getServer', 401, Date.now() - start);
      socket.emit('getServerResponse', { status: 'error', message: 'Invalid token.' });
      }
    });

});





const PORT = process.env.PORT || 5000;

logWithTime('Starting server...');


http.listen(PORT, () => {
    logWithTime(`Server listening on port ${PORT}.`);
});


