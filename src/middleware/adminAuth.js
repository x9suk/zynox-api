const { ForbiddenError } = require('../utils/errors');

function adminAuth(req, res, next) {
  if (!req.developer) {
    return next(new ForbiddenError('Authentication required'));
  }
  if (req.developer.role !== 'admin' && req.developer.role !== 'superadmin') {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
}

module.exports = { adminAuth };
