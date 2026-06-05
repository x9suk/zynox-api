const config = require('../config/env');

const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

const currentLevel = LOG_LEVELS[config.logging.level] ?? LOG_LEVELS.info;

function serializeError(err) {
  const obj = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
  if (err.code) obj.code = err.code;
  if (err.status) obj.status = err.status;
  if (err.statusCode) obj.statusCode = err.statusCode;
  for (const key of Object.getOwnPropertyNames(err)) {
    if (!['name', 'message', 'stack', 'code', 'status', 'statusCode'].includes(key)) {
      obj[key] = err[key];
    }
  }
  return obj;
}

function deepSerialize(val) {
  if (val instanceof Error) return serializeError(val);
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) return val.map(deepSerialize);
  if (typeof val === 'object') {
    const result = {};
    for (const key of Object.keys(val)) {
      result[key] = deepSerialize(val[key]);
    }
    return result;
  }
  return val;
}

function formatMessage(level, msg, extra) {
  const timestamp = new Date().toISOString();
  const base = { timestamp, level };
  if (typeof msg === 'object' && msg !== null) {
    Object.assign(base, deepSerialize(msg));
    if (!base.message) base.message = level;
  } else {
    base.message = msg;
  }
  if (extra && typeof extra === 'object') {
    Object.assign(base, deepSerialize(extra));
  } else if (extra !== undefined) {
    base.extra = extra;
  }
  return base;
}

const logger = {
  trace(msg, extra) {
    if (currentLevel <= LOG_LEVELS.trace) console.trace(JSON.stringify(formatMessage('trace', msg, extra)));
  },
  debug(msg, extra) {
    if (currentLevel <= LOG_LEVELS.debug) console.debug(JSON.stringify(formatMessage('debug', msg, extra)));
  },
  info(msg, extra) {
    if (currentLevel <= LOG_LEVELS.info) console.info(JSON.stringify(formatMessage('info', msg, extra)));
  },
  warn(msg, extra) {
    if (currentLevel <= LOG_LEVELS.warn) console.warn(JSON.stringify(formatMessage('warn', msg, extra)));
  },
  error(msg, extra) {
    if (currentLevel <= LOG_LEVELS.error) console.error(JSON.stringify(formatMessage('error', msg, extra)));
  },
  fatal(msg, extra) {
    if (currentLevel <= LOG_LEVELS.fatal) console.error(JSON.stringify(formatMessage('fatal', msg, extra)));
  },
};

module.exports = logger;
