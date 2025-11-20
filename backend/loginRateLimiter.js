// ./backend/loginRateLimiter.js

const logger = require('./logger');

const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 分钟
const MAX_ATTEMPTS_PER_WINDOW = 5;

const attemptStore = new Map();

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of attemptStore.entries()) {
    if (now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      attemptStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, ATTEMPT_WINDOW_MS).unref();

function loginRateLimiter(req, res, next) {
  const identifier =
    req.ip ||
    req.headers['x-forwarded-for'] ||
    `${req.connection.remoteAddress || ''}:${req.headers['user-agent'] || ''}`;

  const now = Date.now();
  const entry = attemptStore.get(identifier);

  if (!entry || now - entry.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    attemptStore.set(identifier, { count: 1, firstAttemptAt: now });
    return next();
  }

  entry.count += 1;

  if (entry.count > MAX_ATTEMPTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil(
      (ATTEMPT_WINDOW_MS - (now - entry.firstAttemptAt)) / 1000
    );
    logger.warn(
      `登录尝试过多：${identifier} 在 ${ATTEMPT_WINDOW_MS / 60000} 分钟内触发了速率限制`
    );
    return res.status(429).json({
      error: '登录尝试过多，请稍后再试',
      retryAfterSeconds,
    });
  }

  return next();
}

loginRateLimiter.reset = () => attemptStore.clear();
loginRateLimiter.WINDOW_MS = ATTEMPT_WINDOW_MS;
loginRateLimiter.MAX_ATTEMPTS = MAX_ATTEMPTS_PER_WINDOW;

module.exports = loginRateLimiter;
