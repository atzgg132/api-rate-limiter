import { Request, Response } from 'express';
import { pool } from '../config/database';
import { redisClient } from '../config/redis';
import { getProtectedApiBySlug, getEndpointLimits } from '../services/protectedApiService';

export const proxyHandler = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const apiSlug = req.params.apiSlug;

  // Extract the path after /proxy/:apiSlug/
  // req.originalUrl will be like: /proxy/myapi/some/path?query=1
  // req.baseUrl will be: /proxy
  // req.path will be: /myapi/some/path
  const pathAfterSlug = req.path.replace(`/${apiSlug}`, '').replace(/^\//, '');
  const apiPath = pathAfterSlug;

  const apiKey = req.headers['x-api-key'] as string;

  try {
    // 1. Validate API key
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    const keyResult = await pool.query(
      'SELECT * FROM api_keys WHERE key = $1',
      [apiKey]
    );

    if (keyResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const keyData = keyResult.rows[0];

    // 2. Get protected API configuration
    const protectedApi = await getProtectedApiBySlug(apiSlug);

    if (!protectedApi) {
      return res.status(404).json({ error: 'Protected API not found' });
    }

    // 3. Check if API key has access to this endpoint
    const endpointLimits = await getEndpointLimits(keyData.id, protectedApi.id);

    if (!endpointLimits) {
      return res.status(403).json({
        error: 'API key does not have access to this endpoint',
      });
    }

    // 4. Check rate limits (per-endpoint)
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const currentDay = new Date().toISOString().split('T')[0];

    const minuteKey = `rate:${apiKey}:api:${protectedApi.id}:minute:${currentMinute}`;
    const dayKey = `rate:${apiKey}:api:${protectedApi.id}:day:${currentDay}`;

    const [minuteCount, dayCount] = await Promise.all([
      redisClient.get(minuteKey),
      redisClient.get(dayKey),
    ]);

    const requestsThisMinute = parseInt(minuteCount || '0');
    const requestsToday = parseInt(dayCount || '0');

    // Check if limits exceeded
    if (requestsThisMinute >= endpointLimits.limit_per_minute) {
      await logProxyRequest(keyData.id, protectedApi.id, req, 429, Date.now() - startTime, true);

      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: endpointLimits.limit_per_minute,
        window: 'per minute',
        retry_after: 60 - (Math.floor(now / 1000) % 60),
      });
    }

    if (requestsToday >= endpointLimits.limit_per_day) {
      await logProxyRequest(keyData.id, protectedApi.id, req, 429, Date.now() - startTime, true);

      return res.status(429).json({
        error: 'Daily rate limit exceeded',
        limit: endpointLimits.limit_per_day,
        window: 'per day',
      });
    }

    // 5. Increment rate limit counters
    const pipeline = redisClient.multi();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 60);
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 86400);
    await pipeline.exec();

    // 6. Forward request to third-party API
    const targetUrl = new URL(protectedApi.target_url);
    // Remove trailing slash from pathname to avoid double slashes
    const basePath = targetUrl.pathname.replace(/\/$/, '');
    const fullPath = apiPath ? `/${apiPath}` : '';
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const fullUrl = `${targetUrl.origin}${basePath}${fullPath}${queryString}`;

    // Prepare headers
    const headers: Record<string, string> = {
      ...protectedApi.default_headers,
    };

    // Forward relevant headers from original request
    const headersToForward = ['content-type', 'accept', 'user-agent', 'authorization'];
    headersToForward.forEach(headerName => {
      const value = req.headers[headerName];
      if (value && typeof value === 'string') {
        headers[headerName] = value;
      }
    });

    // Make request to third-party API
    const response = await fetch(fullUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const responseBody = await response.text();
    const responseTime = Date.now() - startTime;

    // 7. Log the proxied request
    await logProxyRequest(
      keyData.id,
      protectedApi.id,
      req,
      response.status,
      responseTime,
      false,
      responseBody.substring(0, 5000) // Limit stored response body
    );

    // 8. Return third-party API response
    res.status(response.status);

    // Forward response headers
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Try to parse as JSON, otherwise send as text
    try {
      const jsonBody = JSON.parse(responseBody);
      res.json(jsonBody);
    } catch {
      res.send(responseBody);
    }

  } catch (error: any) {
    console.error('Proxy error:', error);

    // Log error
    const keyResult = await pool.query(
      'SELECT id FROM api_keys WHERE key = $1',
      [apiKey]
    );

    if (keyResult.rows.length > 0) {
      const protectedApi = await getProtectedApiBySlug(apiSlug);
      if (protectedApi) {
        await pool.query(
          `INSERT INTO proxy_request_logs
           (api_key_id, protected_api_id, method, path, response_status, response_time_ms, rate_limited, error_message)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [keyResult.rows[0].id, protectedApi.id, req.method, apiPath, 500, Date.now() - startTime, false, error.message]
        );
      }
    }

    res.status(500).json({
      error: 'Proxy error occurred',
      message: error.message,
    });
  }
};

// Helper function to log proxy requests
async function logProxyRequest(
  apiKeyId: number,
  protectedApiId: number,
  req: Request,
  statusCode: number,
  responseTime: number,
  rateLimited: boolean,
  responseBody?: string
) {
  try {
    const apiSlug = req.params.apiSlug;
    const pathAfterSlug = req.path.replace(`/${apiSlug}`, '').replace(/^\//, '');
    const apiPath = pathAfterSlug;
    const queryParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';

    await pool.query(
      `INSERT INTO proxy_request_logs
       (api_key_id, protected_api_id, method, path, query_params, request_headers, request_body, response_status, response_time_ms, rate_limited)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        apiKeyId,
        protectedApiId,
        req.method,
        apiPath,
        queryParams,
        JSON.stringify(req.headers),
        req.body ? JSON.stringify(req.body).substring(0, 5000) : null,
        statusCode,
        responseTime,
        rateLimited,
      ]
    );
  } catch (error) {
    console.error('Error logging proxy request:', error);
  }
}
