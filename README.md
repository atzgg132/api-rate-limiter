# API Rate Limiter & Monitoring Service

A complete web application for managing API rate limits and monitoring usage in real-time. Now with **Proxy Gateway** functionality to protect third-party APIs! Built with React, Node.js, Express, PostgreSQL, and Redis.

## Features

- **API Key Management**: Create, view, and delete API keys with custom rate limits
- **Proxy Gateway**: Act as a reverse proxy to third-party APIs with rate limiting
- **Per-Endpoint Limits**: Configure different rate limits for each protected API endpoint
- **Rate Limiting**: Automatic enforcement of per-minute and per-day limits
- **Real-time Monitoring**: Dashboard with live usage statistics that auto-refreshes every 5 seconds
- **Request Forwarding**: Seamlessly proxy requests to third-party APIs
- **429 Responses**: Automatic rate limit enforcement with proper HTTP status codes
- **Visual Dashboard**: Color-coded progress bars showing usage levels (green/yellow/red)
- **Comprehensive Logging**: Track all proxied requests with response times and status codes

## Project Structure

```
api-rate-limiter/
├── backend/                 # Express + TypeScript backend
│   ├── src/
│   │   ├── config/         # Database and Redis configuration
│   │   ├── middleware/     # Rate limiting middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Main application file
│   └── package.json
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx         # Main dashboard component
│   │   ├── App.css         # Styling
│   │   └── types.ts        # TypeScript types
│   └── package.json
├── docker-compose.yml      # PostgreSQL and Redis services
├── test-rate-limiter.js    # Automated test script
└── README.md
```

## Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL and Redis)
- npm or yarn

## Quick Start

### 1. Start Database Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

### 2. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

The backend will start on `http://localhost:3001`

### 3. Start Frontend Dashboard

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### 4. Run Tests

In a new terminal, run the automated test script:

```bash
node test-rate-limiter.js
```

This will:
1. Create 2 API keys with different rate limits
2. Simulate burst requests
3. Verify 429 responses when limits are exceeded
4. Display usage statistics
5. Test proxy gateway functionality with third-party API
6. Verify per-endpoint rate limiting

## API Endpoints

### Management Endpoints

#### API Key Management

- `POST /api/keys` - Create a new API key
  ```json
  {
    "name": "Mobile App",
    "limit_per_minute": 50,
    "limit_per_day": 1000
  }
  ```

- `GET /api/keys` - Get all API keys
- `DELETE /api/keys/:id` - Delete an API key
- `GET /api/keys/stats` - Get usage statistics for all keys

#### Protected API Management

- `POST /api/protected-apis` - Create a protected API endpoint
  ```json
  {
    "name": "JSONPlaceholder API",
    "slug": "jsonplaceholder",
    "target_url": "https://jsonplaceholder.typicode.com",
    "description": "Free fake API for testing",
    "http_methods": ["GET", "POST"],
    "default_headers": {},
    "requires_auth": false
  }
  ```

- `GET /api/protected-apis` - Get all protected APIs
- `GET /api/protected-apis/:id` - Get specific protected API
- `PUT /api/protected-apis/:id` - Update a protected API
- `DELETE /api/protected-apis/:id` - Delete a protected API (soft delete)
- `POST /api/protected-apis/link` - Link API key to protected API with custom limits
  ```json
  {
    "api_key_id": 1,
    "protected_api_id": 1,
    "limit_per_minute": 5,
    "limit_per_day": 100
  }
  ```
- `GET /api/protected-apis/key/:keyId/endpoints` - Get all endpoints accessible by an API key
- `DELETE /api/protected-apis/link/:keyId/:apiId` - Unlink API key from protected API
- `GET /api/protected-apis/stats/endpoints` - Get usage statistics for all endpoints

#### System Endpoints

- `GET /health` - Health check endpoint

### Protected Endpoints (Rate Limited)

These endpoints require the `x-api-key` header:

- `GET /api/protected/data` - Example protected endpoint
- `POST /api/protected/action` - Example protected endpoint

Example request:

```bash
curl -H "x-api-key: key_abc123..." http://localhost:3001/api/protected/data
```

### Proxy Gateway Endpoints

The proxy gateway allows you to route requests through the rate limiter to third-party APIs:

**Format**: `/proxy/:apiSlug/*`

Example:
```bash
# First, create a protected API with slug "jsonplaceholder"
# Then link an API key to it with custom limits

# Make proxied requests
curl -H "x-api-key: key_abc123..." http://localhost:3001/proxy/jsonplaceholder/posts/1
curl -H "x-api-key: key_abc123..." http://localhost:3001/proxy/jsonplaceholder/users
```

The proxy will:
1. Validate your API key
2. Check if the key has access to the protected API
3. Check per-endpoint rate limits
4. Forward the request to the third-party API
5. Return the response from the third-party API
6. Log the request with response time and status

## Rate Limiting Logic

The rate limiter uses Redis to track request counts with two modes:

### Global Rate Limiting (Legacy)
For direct protected endpoints (`/api/protected/*`), limits are enforced globally per API key.

### Per-Endpoint Rate Limiting (Proxy Gateway)
For proxied requests (`/proxy/:apiSlug/*`), limits are enforced per-endpoint:

- Each API key can have different limits for different protected APIs
- Redis keys format: `rate:{apiKey}:api:{protectedApiId}:minute:{currentMinute}`
- **Per-minute tracking**: Keys expire after 60 seconds
- **Per-day tracking**: Keys expire after 86400 seconds
- **429 Response**: Returns when limits are exceeded with retry information
- **Automatic cleanup**: Redis handles expiration automatically

### Rate Limit Response

When rate limited, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "limit": 50,
  "window": "per minute",
  "retry_after": 45
}
```

## Dashboard Features

The web dashboard provides:

- **Create API Keys**: Form to create new keys with custom limits
- **View All Keys**: List of all API keys with copy-to-clipboard functionality
- **Real-time Usage**: Live statistics showing:
  - Requests this minute / minute limit
  - Requests today / daily limit
  - Color-coded progress bars (green < 70%, yellow < 90%, red ≥ 90%)
- **Auto-refresh**: Statistics update every 5 seconds
- **Delete Keys**: Remove API keys with confirmation

## Using the Proxy Gateway

The proxy gateway is the core feature that allows you to protect third-party APIs with rate limiting:

### Step 1: Create a Protected API

```bash
curl -X POST http://localhost:3001/api/protected-apis \
  -H "Content-Type: application/json" \
  -d '{
    "name": "JSONPlaceholder API",
    "slug": "jsonplaceholder",
    "target_url": "https://jsonplaceholder.typicode.com",
    "description": "Free fake API for testing",
    "http_methods": ["GET", "POST"],
    "default_headers": {},
    "requires_auth": false
  }'
```

### Step 2: Create an API Key

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application",
    "limit_per_minute": 10,
    "limit_per_day": 1000
  }'
```

### Step 3: Link API Key to Protected API

```bash
curl -X POST http://localhost:3001/api/protected-apis/link \
  -H "Content-Type: application/json" \
  -d '{
    "api_key_id": 1,
    "protected_api_id": 1,
    "limit_per_minute": 5,
    "limit_per_day": 100
  }'
```

### Step 4: Make Proxied Requests

```bash
# Replace with your actual API key
API_KEY="key_abc123..."

# Make requests through the proxy
curl -H "x-api-key: $API_KEY" http://localhost:3001/proxy/jsonplaceholder/posts/1
curl -H "x-api-key: $API_KEY" http://localhost:3001/proxy/jsonplaceholder/users
curl -H "x-api-key: $API_KEY" http://localhost:3001/proxy/jsonplaceholder/comments?postId=1
```

The proxy will:
- Validate your API key
- Check per-endpoint rate limits
- Forward requests to `https://jsonplaceholder.typicode.com`
- Return 429 when limits are exceeded
- Log all requests with response times

### Step 5: Monitor Usage

```bash
# Get endpoint-specific usage statistics
curl http://localhost:3001/api/protected-apis/stats/endpoints
```

## Testing the Rate Limiter

### Manual Testing

1. Open the dashboard at `http://localhost:5173`
2. Create an API key with a low limit (e.g., 5 per minute)
3. Use curl or Postman to make requests:

```bash
# Replace with your actual API key
API_KEY="key_abc123..."

# Make multiple requests
for i in {1..10}; do
  curl -H "x-api-key: $API_KEY" http://localhost:3001/api/protected/data
  echo "\nRequest $i completed"
done
```

4. Watch the dashboard update in real-time
5. Observe 429 responses after exceeding the limit

### Automated Testing

Run the included test script:

```bash
node test-rate-limiter.js
```

Expected output:
- ✓ 5 successful requests for Key 1 (limit: 5/min)
- ✗ 2 rate-limited requests for Key 1
- ✓ Burst requests for Key 2 handled correctly
- ✓ Dashboard reflects accurate usage stats

## Environment Variables

Backend (`.env` file):

```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rate_limiter
REDIS_URL=redis://localhost:6379
```

## Architecture

### Backend Stack

- **Express**: Web framework
- **TypeScript**: Type safety
- **PostgreSQL**: Stores API keys and request logs
- **Redis**: Fast in-memory storage for rate limit counters
- **Node.js**: Runtime environment

### Frontend Stack

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **CSS3**: Styling with gradients and animations

### Rate Limiting Strategy

1. Request arrives with `x-api-key` header
2. Middleware validates key exists in PostgreSQL
3. Redis checks current minute and day counters
4. If under limits:
   - Increment counters
   - Log request
   - Allow through
5. If over limits:
   - Log rejected request
   - Return 429 status
   - Include retry information

## Database Schema

### api_keys table

Stores API keys with global rate limits (used for legacy endpoints):

```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  limit_per_minute INTEGER NOT NULL,
  limit_per_day INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### protected_apis table

Stores third-party API configurations for the proxy gateway:

```sql
CREATE TABLE protected_apis (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  description TEXT,
  http_methods TEXT[] DEFAULT ARRAY['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  default_headers JSONB DEFAULT '{}',
  requires_auth BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_protected_apis_slug ON protected_apis(slug);
```

### api_key_endpoints table

Links API keys to protected APIs with per-endpoint rate limits:

```sql
CREATE TABLE api_key_endpoints (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  protected_api_id INTEGER REFERENCES protected_apis(id) ON DELETE CASCADE,
  limit_per_minute INTEGER NOT NULL,
  limit_per_day INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(api_key_id, protected_api_id)
);

CREATE INDEX idx_api_key_endpoints_api_key ON api_key_endpoints(api_key_id);
CREATE INDEX idx_api_key_endpoints_protected_api ON api_key_endpoints(protected_api_id);
```

### proxy_request_logs table

Comprehensive logging for all proxied requests:

```sql
CREATE TABLE proxy_request_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  protected_api_id INTEGER REFERENCES protected_apis(id) ON DELETE CASCADE,
  method VARCHAR(10) NOT NULL,
  path TEXT,
  query_params TEXT,
  request_headers JSONB,
  request_body TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  rate_limited BOOLEAN DEFAULT false,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proxy_logs_api_key ON proxy_request_logs(api_key_id);
CREATE INDEX idx_proxy_logs_timestamp ON proxy_request_logs(timestamp);
```

### request_logs table (Legacy)

Original request logs for legacy protected endpoints:

```sql
CREATE TABLE request_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  endpoint VARCHAR(255),
  status_code INTEGER
);
```

## Troubleshooting

### Backend won't start

- Check PostgreSQL is running: `docker-compose ps`
- Check Redis is running: `docker-compose ps`
- Verify DATABASE_URL in `.env` file
- Check port 3001 is available

### Frontend won't start

- Check Node.js version (18+)
- Delete `node_modules` and run `npm install` again
- Check port 5173 is available

### Rate limiting not working

- Verify Redis is running: `docker-compose logs redis`
- Check backend logs for errors
- Ensure `x-api-key` header is included in requests
- Verify API key exists in database

### Dashboard not showing data

- Check backend is running on port 3001
- Open browser console for network errors
- Verify CORS is enabled (it should be by default)
- Check backend `/health` endpoint

## Development

### Adding New Protected Endpoints

1. Add route in `backend/src/routes/protected.ts`
2. Apply `rateLimiter` middleware
3. Implement endpoint logic

Example:

```typescript
router.get('/new-endpoint', rateLimiter, (req, res) => {
  res.json({ message: 'Protected endpoint' });
});
```

### Customizing Rate Limits

Rate limits are set per API key when created. Modify the frontend form or use the API directly:

```bash
curl -X POST http://localhost:3001/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom App",
    "limit_per_minute": 100,
    "limit_per_day": 5000
  }'
```

## Production Considerations

Before deploying to production:

1. **Environment Variables**: Use secure credentials
2. **HTTPS**: Enable SSL/TLS
3. **Database**: Use managed PostgreSQL (AWS RDS, etc.)
4. **Redis**: Use managed Redis (AWS ElastiCache, etc.)
5. **Monitoring**: Add logging (Winston, Pino)
6. **Error Handling**: Implement error tracking (Sentry)
7. **Rate Limits**: Adjust based on your API capacity
8. **CORS**: Configure specific origins, not `*`
9. **Authentication**: Add admin authentication for key management
10. **Backups**: Enable database backups

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
