const { cp } = require('fs');
const jwt = require('jsonwebtoken');

const secret = process.env.SECRET_KEY || 'wow trop secret';

function generateToken(userId) {
  return jwt.sign({ id: userId }, 
    secret,{ expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    console.error('Error verifying token: ', err);
    return null;
  }
}

function closeToken(token) {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

module.exports = { generateToken, verifyToken, closeToken };
