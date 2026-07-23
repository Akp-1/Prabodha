const { verifyToken } = require('../utils/jwt');

// Attaches req.user = { id, institute_id, role } if the token is valid.
// Every protected route in every future module (attendance, batches, etc.)
// will use this — that's how "a user can only see their own institute's
// data" gets enforced everywhere, in one place.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      institute_id: payload.institute_id,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Usage: requireRole('admin') or requireRole('admin', 'teacher')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
