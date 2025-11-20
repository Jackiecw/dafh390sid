// ./backend/logger.js

const serializeError = (error) => {
  if (!error) return undefined;
  return {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };
};

const normalizeMeta = (meta) => {
  if (!meta) return undefined;
  if (meta instanceof Error) {
    return { error: serializeError(meta) };
  }
  if (typeof meta !== 'object') {
    return { data: meta };
  }
  const normalized = {};
  Object.entries(meta).forEach(([key, value]) => {
    if (value instanceof Error) {
      normalized[key] = serializeError(value);
    } else {
      normalized[key] = value;
    }
  });
  return Object.keys(normalized).length ? normalized : undefined;
};

const LEVEL_ORDER = ['ERROR', 'WARN', 'INFO', 'HTTP', 'DEBUG'];
const configuredLevel = (() => {
  const raw = process.env.LOG_LEVEL ? process.env.LOG_LEVEL.toUpperCase() : 'INFO';
  return LEVEL_ORDER.includes(raw) ? raw : 'INFO';
})();

const shouldLog = (level) => {
  const normalizedLevel = level.toUpperCase();
  const levelIndex = LEVEL_ORDER.indexOf(normalizedLevel);
  const thresholdIndex = LEVEL_ORDER.indexOf(configuredLevel);
  if (levelIndex === -1) return true;
  return levelIndex <= thresholdIndex;
};

const log = (level, message, meta) => {
  if (!shouldLog(level)) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  const normalizedMeta = normalizeMeta(meta);
  if (normalizedMeta) {
    payload.meta = normalizedMeta;
  }
  const output = JSON.stringify(payload);
  if (level === 'ERROR') {
    console.error(output);
  } else if (level === 'WARN') {
    console.warn(output);
  } else {
    console.log(output);
  }
};

module.exports = {
  info: (msg, meta) => log('INFO', msg, meta),
  warn: (msg, meta) => log('WARN', msg, meta),
  error: (msg, errOrMeta) => log('ERROR', msg, errOrMeta),
  http: (msg, meta) => log('HTTP', msg, meta),
  debug: (msg, meta) => log('DEBUG', msg, meta),
};
