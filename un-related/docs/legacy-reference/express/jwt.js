const jwt = require('jsonwebtoken');

function signToken(user) {
  // Keep the payload small — just enough for the middleware to enforce
  // role-based access and institute isolation on every request.
  return jwt.sign(
    {
      sub: user.id,
      institute_id: user.institute_id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
