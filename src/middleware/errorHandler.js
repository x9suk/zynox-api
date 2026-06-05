const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    logger.error({ err, method: req.method, url: req.originalUrl }, message);
  } else {
    logger.warn({ err, method: req.method, url: req.originalUrl }, message);
  }

  const body = {
    error: true,
    message: status >= 500 ? 'Internal Server Error' : message,
    ...(err.errors && { errors: err.errors }),
  };

  if (process.env.NODE_ENV === 'development' && status >= 500) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
