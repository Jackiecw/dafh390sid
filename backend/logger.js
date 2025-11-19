// ./backend/logger.js

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

module.exports = {
  info: (msg) => console.log(formatMessage('INFO', msg)),
  warn: (msg) => console.warn(formatMessage('WARN', msg)),
  error: (msg, err) => {
    if (err) {
      console.error(formatMessage('ERROR', `${msg} - ${err.stack || err}`));
    } else {
      console.error(formatMessage('ERROR', msg));
    }
  },
  http: (msg) => console.log(formatMessage('HTTP', msg)),
};
