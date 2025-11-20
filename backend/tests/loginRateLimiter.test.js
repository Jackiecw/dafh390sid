// ./backend/tests/loginRateLimiter.test.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import loginRateLimiter from '../loginRateLimiter';

const createReq = () => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'vitest' },
  connection: { remoteAddress: '127.0.0.1' },
});

const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('loginRateLimiter', () => {
  beforeEach(() => {
    loginRateLimiter.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('allows attempts within the rate limit window', () => {
    const next = vi.fn();
    const req = createReq();
    const res = createRes();
    for (let i = 0; i < loginRateLimiter.MAX_ATTEMPTS; i += 1) {
      loginRateLimiter(req, res, next);
    }
    expect(next).toHaveBeenCalledTimes(loginRateLimiter.MAX_ATTEMPTS);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks requests after exceeding the limit', () => {
    const next = vi.fn();
    const req = createReq();
    const res = createRes();

    for (let i = 0; i < loginRateLimiter.MAX_ATTEMPTS; i += 1) {
      loginRateLimiter(req, res, next);
    }

    loginRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ retryAfterSeconds: expect.any(Number) })
    );
  });

  it('allows attempts again after the window expires', () => {
    const next = vi.fn();
    const req = createReq();
    const res = createRes();

    for (let i = 0; i < loginRateLimiter.MAX_ATTEMPTS; i += 1) {
      loginRateLimiter(req, res, next);
    }

    loginRateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    vi.advanceTimersByTime(loginRateLimiter.WINDOW_MS + 1000);
    res.status.mockClear();
    res.json.mockClear();
    next.mockClear();

    loginRateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
