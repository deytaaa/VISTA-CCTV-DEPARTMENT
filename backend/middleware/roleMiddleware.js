// Simple role middleware helpers. Relies on `req.user` being set by `authMiddleware`.
function requireAnyRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!Array.isArray(roles) || roles.length === 0) return next();
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  return next();
}

module.exports = { requireAnyRole, isAdmin };
