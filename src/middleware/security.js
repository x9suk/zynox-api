const helmet = require('helmet');
const cors = require('cors');
const config = require('../config/env');

function securityMiddleware(app) {
  app.use(helmet());

  app.use(cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
    maxAge: 86400,
  }));

  app.disable('x-powered-by');
}

module.exports = securityMiddleware;
