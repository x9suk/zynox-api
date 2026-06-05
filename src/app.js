const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const logger = require('./utils/logger');
const securityMiddleware = require('./middleware/security');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const routes = require('./routes');

const app = express();

securityMiddleware(app);

app.use(compression());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan('combined', { stream: morganStream }));

app.use(rateLimiter);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
