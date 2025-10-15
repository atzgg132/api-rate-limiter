import { pool } from '../config/database';
import { ProtectedApi, CreateProtectedApiRequest, ApiKeyEndpoint, CreateApiKeyEndpointRequest, EndpointUsageStats } from '../types';
import { redisClient } from '../config/redis';

// Create a new protected API
export const createProtectedApi = async (
  data: CreateProtectedApiRequest
): Promise<ProtectedApi> => {
  const {
    name,
    slug,
    target_url,
    description,
    http_methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    default_headers = {},
    requires_auth = false,
  } = data;

  const result = await pool.query(
    `INSERT INTO protected_apis
     (name, slug, target_url, description, http_methods, default_headers, requires_auth)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, slug, target_url, description, http_methods, JSON.stringify(default_headers), requires_auth]
  );

  return result.rows[0];
};

// Get all protected APIs
export const getAllProtectedApis = async (): Promise<ProtectedApi[]> => {
  const result = await pool.query(
    'SELECT * FROM protected_apis WHERE is_active = true ORDER BY created_at DESC'
  );
  return result.rows;
};

// Get protected API by slug
export const getProtectedApiBySlug = async (slug: string): Promise<ProtectedApi | null> => {
  const result = await pool.query(
    'SELECT * FROM protected_apis WHERE slug = $1 AND is_active = true',
    [slug]
  );
  return result.rows[0] || null;
};

// Get protected API by ID
export const getProtectedApiById = async (id: number): Promise<ProtectedApi | null> => {
  const result = await pool.query(
    'SELECT * FROM protected_apis WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

// Update protected API
export const updateProtectedApi = async (
  id: number,
  data: Partial<CreateProtectedApiRequest>
): Promise<ProtectedApi> => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name) {
    fields.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.slug) {
    fields.push(`slug = $${paramCount++}`);
    values.push(data.slug);
  }
  if (data.target_url) {
    fields.push(`target_url = $${paramCount++}`);
    values.push(data.target_url);
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramCount++}`);
    values.push(data.description);
  }
  if (data.http_methods) {
    fields.push(`http_methods = $${paramCount++}`);
    values.push(data.http_methods);
  }
  if (data.default_headers) {
    fields.push(`default_headers = $${paramCount++}`);
    values.push(JSON.stringify(data.default_headers));
  }
  if (data.requires_auth !== undefined) {
    fields.push(`requires_auth = $${paramCount++}`);
    values.push(data.requires_auth);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await pool.query(
    `UPDATE protected_apis SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  return result.rows[0];
};

// Delete protected API (soft delete)
export const deleteProtectedApi = async (id: number): Promise<void> => {
  await pool.query(
    'UPDATE protected_apis SET is_active = false WHERE id = $1',
    [id]
  );
};

// Link API key to a protected API with specific limits
export const linkApiKeyToEndpoint = async (
  data: CreateApiKeyEndpointRequest
): Promise<ApiKeyEndpoint> => {
  const result = await pool.query(
    `INSERT INTO api_key_endpoints
     (api_key_id, protected_api_id, limit_per_minute, limit_per_day)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (api_key_id, protected_api_id)
     DO UPDATE SET
       limit_per_minute = $3,
       limit_per_day = $4
     RETURNING *`,
    [data.api_key_id, data.protected_api_id, data.limit_per_minute, data.limit_per_day]
  );

  return result.rows[0];
};

// Get all APIs accessible by an API key
export const getApiKeyEndpoints = async (apiKeyId: number): Promise<any[]> => {
  const result = await pool.query(
    `SELECT
       ake.*,
       pa.name as api_name,
       pa.slug as api_slug,
       pa.target_url,
       pa.description
     FROM api_key_endpoints ake
     JOIN protected_apis pa ON ake.protected_api_id = pa.id
     WHERE ake.api_key_id = $1 AND pa.is_active = true
     ORDER BY ake.created_at DESC`,
    [apiKeyId]
  );
  return result.rows;
};

// Get endpoint limits for a specific API key and protected API
export const getEndpointLimits = async (
  apiKeyId: number,
  protectedApiId: number
): Promise<ApiKeyEndpoint | null> => {
  const result = await pool.query(
    `SELECT * FROM api_key_endpoints
     WHERE api_key_id = $1 AND protected_api_id = $2`,
    [apiKeyId, protectedApiId]
  );
  return result.rows[0] || null;
};

// Remove API key from endpoint
export const unlinkApiKeyFromEndpoint = async (
  apiKeyId: number,
  protectedApiId: number
): Promise<void> => {
  await pool.query(
    'DELETE FROM api_key_endpoints WHERE api_key_id = $1 AND protected_api_id = $2',
    [apiKeyId, protectedApiId]
  );
};

// Get usage stats for all endpoints
export const getEndpointUsageStats = async (): Promise<EndpointUsageStats[]> => {
  const result = await pool.query(
    `SELECT
       ak.key as api_key,
       ak.name as api_key_name,
       pa.id as protected_api_id,
       pa.name as protected_api_name,
       pa.slug as protected_api_slug,
       ake.limit_per_minute,
       ake.limit_per_day
     FROM api_key_endpoints ake
     JOIN api_keys ak ON ake.api_key_id = ak.id
     JOIN protected_apis pa ON ake.protected_api_id = pa.id
     WHERE pa.is_active = true
     ORDER BY ak.name, pa.name`
  );

  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const currentDay = new Date().toISOString().split('T')[0];

  const stats: EndpointUsageStats[] = [];

  for (const row of result.rows) {
    const minuteKey = `rate:${row.api_key}:api:${row.protected_api_id}:minute:${currentMinute}`;
    const dayKey = `rate:${row.api_key}:api:${row.protected_api_id}:day:${currentDay}`;

    const [minuteCount, dayCount] = await Promise.all([
      redisClient.get(minuteKey),
      redisClient.get(dayKey),
    ]);

    stats.push({
      api_key: row.api_key,
      api_key_name: row.api_key_name,
      protected_api_id: row.protected_api_id,
      protected_api_name: row.protected_api_name,
      protected_api_slug: row.protected_api_slug,
      requests_this_minute: parseInt(minuteCount || '0'),
      requests_today: parseInt(dayCount || '0'),
      limit_per_minute: row.limit_per_minute,
      limit_per_day: row.limit_per_day,
    });
  }

  return stats;
};
