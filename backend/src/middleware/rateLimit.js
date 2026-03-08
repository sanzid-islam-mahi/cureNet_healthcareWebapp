const buckets = new Map();

function cleanupBucket(map, now, windowMs) {
  for (const [key, value] of map) {
    if (now - value.start > windowMs) {
      map.delete(key);
    }
  }
}

export function createRateLimiter({ windowMs, limit, keyFn }) {
  const getKey = keyFn || ((req) => req.ip || req.headers['x-forwarded-for'] || 'unknown');

  return function rateLimit(req, res, next) {
    const now = Date.now();
    cleanupBucket(buckets, now, windowMs);
    const key = `${req.baseUrl || ''}:${req.path || ''}:${getKey(req)}`;
    const record = buckets.get(key);

    if (!record || now - record.start > windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }

    if (record.count >= limit) {
      const retryAfter = Math.ceil((windowMs - (now - record.start)) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }

    record.count += 1;
    buckets.set(key, record);
    return next();
  };
}

