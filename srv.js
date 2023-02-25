const { http, io, app } = require('./app');
const db = require('./db');
const { md5 } = require('./utils');
const { login, register } = require('./user');
const { verifyToken, closeToken } = require('./auth');
const { forgetPassword } = require('./forgetPassword');

const logs = [];

function logWithTime(msg) {
  const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  console.log(`[${currentDate}] ${msg}`);
}

function addLogEntry(method, url, status, responseTime) {
  const logEntry = {
    method,
    url,
    status,
    responseTime,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  logs.push(logEntry);
  console.log(logEntry);
}


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

  socket.on('auth', (token) => {
    logWithTime(`Socket ${socket.id} sent an auth request.`);
    const start = Date.now();
    const payload = verifyToken(token);
    if (payload) {
      const userId = payload.id;
      const sql = 'SELECT * FROM user WHERE id = ?';
      db.query(sql, [userId], (err, rows) => {
        if (err) {
          console.error('Error retrieving user from database: ', err);
          addLogEntry('Socket', '/auth', 500, Date.now() - start);
          socket.emit('authResponse', { status: 'error', message: 'Database error.' });
          return;
        }
        if (rows.length === 0) {
          addLogEntry('Socket', '/auth', 401, Date.now() - start);
          socket.emit('authResponse', { status: 'error', message: 'Invalid token.' });
        } else {
          addLogEntry('Socket', '/auth', 200, Date.now() - start);
          socket.emit('authResponse', { status: 'success' });
        }
      });
    } else {
      addLogEntry('Socket', '/auth', 401, Date.now() - start);
      socket.emit('authResponse', { status: 'error', message: 'Invalid token.' });
    }
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

  socket.on('getServerList', (token) => {
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
          socket.emit('getServerListResponse', { status: 'error', message: 'Database error.' });
          return;
        }
        if (rows.length === 0) {
          addLogEntry('Socket', '/getServer', 401, Date.now() - start);
          socket.emit('getServerListResponse', { status: 'error', message: 'Invalid token.' });
        } else {
          const sql = 'SELECT * FROM server join members on server.id = members.server_id WHERE members.member_name = ?';
          db.query(sql, [rows[0].id], (err, rows) => {
            if (err) {
              console.error('Error retrieving user from database: ', err);
              addLogEntry('Socket', '/getServer', 500, Date.now() - start);
              socket.emit('getServerListResponse', { status: 'error', message: 'Database error.' });
              return;
            }
            if (rows.length === 0) {
              addLogEntry('Socket', '/getServer', 401, Date.now() - start);
              socket.emit('getServerListResponse', { status: 'error', message: 'No server found.', server: rows })
            } else {
              addLogEntry('Socket', '/getServer', 200, Date.now() - start);
              socket.emit('getServerListResponse', { status: 'success', server: rows })
              }
            });
        }
        });
    } else {
      addLogEntry('Socket', '/getServer', 401, Date.now() - start);
      socket.emit('getServerResponse', { status: 'error', message: 'Invalid token.' });
      }
    });



    // socket.emit('serverListUpdate', { status: 'success', server: rows });


    socket.on('getLogs', (token) => {
      logWithTime(`Socket ${socket.id} sent a getLogs request.`);
      const start = Date.now();
      const payload = verifyToken(token);
      if (payload) {
        const userId = payload.id;
        const sql = 'SELECT * FROM user WHERE id = ?';
        db.query(sql, [userId], (err, rows) => {
          if (err) {
            console.error('Error retrieving user from database: ', err);
            addLogEntry('Socket', '/getLogs', 500, Date.now() - start);
            socket.emit('getLogsResponse', { status: 'error', message: 'Database error.' });
            return;
          }
          if (rows.length === 0) {
            addLogEntry('Socket', '/getLogs', 401, Date.now() - start);
            socket.emit('getLogsResponse', { status: 'error', message: 'Invalid token.' });
          } else {
            addLogEntry('Socket', '/getLogs', 200, Date.now() - start);
            socket.emit('getLogsResponse', { status: 'success', logs: logs });
          }
        });
      } else {
        addLogEntry('Socket', '/getLogs', 401, Date.now() - start);
        socket.emit('getLogsResponse', { status: 'error', message: 'Invalid token.' });
      }
    });


    socket.on('disconnect', (socket) => {
      logWithTime(`Socket ${socket.id} disconnected.`);
    });

});

const PORT = process.env.PORT || 5000;

logWithTime('Starting server...');
logWithTime(process.env.DB_HOST);


http.listen(PORT, () => {
    logWithTime(`Server listening on port ${PORT}.`);
});


