const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { Developer } = require('../models');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

async function developerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Missing JWT token');
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('JWT token has expired');
      }
      throw new UnauthorizedError('Invalid JWT token');
    }

    const developer = await Developer.findById(payload.sub).lean();
    if (!developer) {
      throw new UnauthorizedError('Developer not found');
    }

    if (developer.isBanned) {
      throw new ForbiddenError('Account is banned');
    }

    req.developer = {
      id: developer._id,
      discordId: developer.discordId,
      username: developer.username,
      globalName: developer.globalName,
      avatar: developer.avatar,
      email: developer.email,
      role: developer.role,
      plan: developer.plan,
      isBanned: developer.isBanned,
    };

    req.token = token;
    next();
  } catch (err) {
    if (err.status) {
      next(err);
    } else {
      logger.error({ err }, 'Developer auth error');
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.developer) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.developer.role)) {
      return next(new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { developerAuth, requireRole };
