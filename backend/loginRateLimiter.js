// ./backend/loginRateLimiter.js
const logger = require('./logger');

const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS_PER_WINDOW = 5;

const attemptStore = new Map();

function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  let attempts = attemptStore.get(ip) || [];
  // Filter out old attempts
  attempts = attempts.filter(timestamp => now - timestamp < ATTEMPT_WINDOW_MS);

  if (attempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
    const windowMinutes = ATTEMPT_WINDOW_MS / 60000;
    logger.warn(`登录尝试过多：${ip} 在 ${windowMinutes} 分钟内尝试次数超过限制`, { ip });
    return res.status(429).json({ error: '登录尝试次数过多，请稍后再试' });
  }

  attempts.push(now);
  attemptStore.set(ip, attempts);
  next();
}

loginRateLimiter.reset = () => attemptStore.clear();
loginRateLimiter.WINDOW_MS = ATTEMPT_WINDOW_MS;
loginRateLimiter.MAX_ATTEMPTS = MAX_ATTEMPTS_PER_WINDOW;

module.exports = loginRateLimiter;
