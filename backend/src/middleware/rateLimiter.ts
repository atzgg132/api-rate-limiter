import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { pool } from '../config/database';

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // Get API key details from database
    const keyResult = await pool.query(
      'SELECT * FROM api_keys WHERE key = $1',
      [apiKey]
    );

    if (keyResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const keyData = keyResult.rows[0];
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const currentDay = new Date().toISOString().split('T')[0];

    // Redis keys for tracking
    const minuteKey = `rate:${apiKey}:minute:${currentMinute}`;
    const dayKey = `rate:${apiKey}:day:${currentDay}`;

    // Get current counts
    const [minuteCount, dayCount] = await Promise.all([
      redisClient.get(minuteKey),
      redisClient.get(dayKey),
    ]);

    const requestsThisMinute = parseInt(minuteCount || '0');
    const requestsToday = parseInt(dayCount || '0');

    // Check limits
    if (requestsThisMinute >= keyData.limit_per_minute) {
      // Log the rejected request
      await pool.query(
        'INSERT INTO request_logs (api_key_id, endpoint, status_code) VALUES ($1, $2, $3)',
        [keyData.id, req.path, 429]
      );

      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: keyData.limit_per_minute,
        window: 'per minute',
        retry_after: 60 - (Math.floor(now / 1000) % 60),
      });
    }

    if (requestsToday >= keyData.limit_per_day) {
      // Log the rejected request
      await pool.query(
        'INSERT INTO request_logs (api_key_id, endpoint, status_code) VALUES ($1, $2, $3)',
        [keyData.id, req.path, 429]
      );

      return res.status(429).json({
        error: 'Daily rate limit exceeded',
        limit: keyData.limit_per_day,
        window: 'per day',
      });
    }

    // Increment counters
    const pipeline = redisClient.multi();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 60);
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 86400);
    await pipeline.exec();

    // Log successful request
    await pool.query(
      'INSERT INTO request_logs (api_key_id, endpoint, status_code) VALUES ($1, $2, $3)',
      [keyData.id, req.path, 200]
    );

    // Attach key data to request for later use
    (req as any).apiKeyData = keyData;

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
