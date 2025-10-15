import { pool } from '../config/database';
import { redisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';
import { ApiKey, CreateApiKeyRequest, UsageStats } from '../types';

export const createApiKey = async (
  data: CreateApiKeyRequest
): Promise<ApiKey> => {
  const key = `key_${uuidv4().replace(/-/g, '')}`;

  const result = await pool.query(
    `INSERT INTO api_keys (key, name, limit_per_minute, limit_per_day)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [key, data.name, data.limit_per_minute, data.limit_per_day]
  );

  return result.rows[0];
};

export const getAllApiKeys = async (): Promise<ApiKey[]> => {
  const result = await pool.query('SELECT * FROM api_keys ORDER BY created_at DESC');
  return result.rows;
};

export const deleteApiKey = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM api_keys WHERE id = $1', [id]);
};

export const getUsageStats = async (): Promise<UsageStats[]> => {
  const keys = await getAllApiKeys();
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const currentDay = new Date().toISOString().split('T')[0];

  const stats: UsageStats[] = [];

  for (const key of keys) {
    const minuteKey = `rate:${key.key}:minute:${currentMinute}`;
    const dayKey = `rate:${key.key}:day:${currentDay}`;

    const [minuteCount, dayCount] = await Promise.all([
      redisClient.get(minuteKey),
      redisClient.get(dayKey),
    ]);

    stats.push({
      api_key: key.key,
      name: key.name,
      requests_this_minute: parseInt(minuteCount || '0'),
      requests_today: parseInt(dayCount || '0'),
      limit_per_minute: key.limit_per_minute,
      limit_per_day: key.limit_per_day,
    });
  }

  return stats;
};
