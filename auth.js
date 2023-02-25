const jwt = require('jsonwebtoken');



function generateToken(userId) {
  return jwt.sign({ id: userId }, 
    process.env.SECRET_KEY,{ expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.SECRET_KEY);
  } catch (err) {
    return null;
  }
}

function closeToken(token) {
  try {
    return jwt.verify(token, process.env.SECRET_KEY);
  } catch (err) {
    return null;
  }
}

module.exports = { generateToken, verifyToken, closeToken };
