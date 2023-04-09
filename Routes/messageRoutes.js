const express = require('express');
const Router = express.Router();
const messageService = require('../services/messageService');

Router.post('/send', messageService.sendMessage);
ROuter.post('/get', messageService.getMessages);
Router.post('/delete', messageService.deleteMessage);

module.exports = Router;