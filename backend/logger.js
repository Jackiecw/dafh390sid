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

const log = (level, message, meta) => {
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
};
