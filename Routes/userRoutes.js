const express = require("express");
const Router = express.Router();
const userService = require("../services/userService");

Router.post("/login", userService.userLogin);
Router.post("/register", userService.userRegister);
Router.post("/token", userService.userVerify);
Router.post("/changePassword", userService.changePassword);
Router.post("/resetPassword", userService.resetPasswordSend);
Router.post("/reset", userService.resetPassword);

module.exports = Router;
