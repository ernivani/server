const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').createServer(app);
const cookieParser = require('cookie-parser');

app.use(cors(), cookieParser());

const io = require('socket.io')(http, {
  cors: {
    origin: 'http://213.32.89.28:8080',
    methods: ['GET', 'POST'],
  },
});




module.exports = { app, http, io };