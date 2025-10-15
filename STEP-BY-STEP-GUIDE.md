# Step-by-Step Guide: Using the Proxy Gateway

This guide will walk you through setting up and testing the complete proxy gateway system with a real external API.

## Current Running Services

You should have these services running:

1. ✅ **PostgreSQL** - localhost:5432
2. ✅ **Redis** - localhost:6379
3. ✅ **Backend (Rate Limiter)** - localhost:3001
4. ✅ **Frontend (Dashboard)** - localhost:5173
5. ✅ **External API (Third-Party Simulation)** - localhost:4000

## Step 1: Test the External API Directly

First, let's verify the external API works:

```bash
# Test health check
curl http://localhost:4000/health

# Get all users
curl http://localhost:4000/users

# Get a specific user
curl http://localhost:4000/users/1

# Get all products
curl http://localhost:4000/products

# Get a specific product
curl http://localhost:4000/products/2

# Get statistics
curl http://localhost:4000/stats
```

**Expected Result:** You should see JSON responses with data about users, products, and orders.

---

## Step 2: Create an API Key

Open your browser and go to: **http://localhost:5173**

### In the Dashboard (API Keys Tab):

1. Enter a name: `My Test App`
2. Set limit per minute: `5`
3. Set limit per day: `100`
4. Click **"Create API Key"**

**✅ Success:** You should see a new card with your API key (starts with `key_...`)

**📋 Copy the API key** - you'll need it for Step 5!

---

## Step 3: Register the External API

### In the Dashboard (Protected APIs Tab):

1. Click on the **"🌐 Protected APIs"** tab
2. Fill in the form:
   - **API Name:** `My Shop API`
   - **Slug:** `my-shop` (lowercase, hyphens only)
   - **Target URL:** `http://localhost:4000`
   - **Description:** `Local shop API for testing`
3. Click **"Create Protected API"**

**✅ Success:** You should see a new card showing:
- Slug: `my-shop`
- Target URL: `http://localhost:4000`
- Proxy URL: `http://localhost:3001/proxy/my-shop/*`

---

## Step 4: Link the API Key to the Protected API

### In the Dashboard (Link Endpoints Tab):

1. Click on the **"🔗 Link Endpoints"** tab
2. **Select API Key:** Choose `My Test App` from the dropdown
3. **Select Protected API:** Choose `My Shop API (my-shop)` from the dropdown
4. Set **Limit per Minute:** `3` (lower than the key's global limit for testing)
5. Set **Limit per Day:** `50`
6. Click **"Link API Key to Endpoint"**

**✅ Success:** A success message should appear, and the form should reset.

---

## Step 5: Make Proxied Requests

Now let's test the proxy gateway! Replace `YOUR_API_KEY` with the key you copied in Step 2.

### Test 1: Get Users (Should Succeed)
```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3001/proxy/my-shop/users
```

**Expected Result:** JSON response with user data + the request is logged in the external API terminal.

### Test 2: Get a Specific Product (Should Succeed)
```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3001/proxy/my-shop/products/1
```

**Expected Result:** JSON response with laptop data.

### Test 3: Get Statistics (Should Succeed)
```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3001/proxy/my-shop/stats
```

**Expected Result:** JSON response with system statistics.

### Test 4: Exceed Rate Limit (Should Get 429)
```bash
# Make 4 rapid requests (you set the limit to 3/minute)
for i in {1..4}; do
  echo "Request $i:"
  curl -H "x-api-key: YOUR_API_KEY" http://localhost:3001/proxy/my-shop/users
  echo "\n"
done
```

**Expected Result:**
- First 3 requests: ✅ 200 OK with user data
- 4th request: ❌ 429 Rate Limit Exceeded with error message:
  ```json
  {
    "error": "Rate limit exceeded",
    "limit": 3,
    "window": "per minute",
    "retry_after": 45
  }
  ```

---

## Step 6: Monitor Statistics in Real-Time

### In the Dashboard (Endpoint Statistics Tab):

1. Click on the **"📊 Endpoint Statistics"** tab
2. You should see a card showing:
   - **My Test App → My Shop API**
   - **Requests This Minute:** 3/3 (100%) - in RED
   - **Requests Today:** 4/50 (8%) - in GREEN

**Watch it live:** The stats auto-refresh every 5 seconds!

---

## Step 7: Test Different Endpoints

The external API has multiple endpoints. Try them all through the proxy:

```bash
# Get orders
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3001/proxy/my-shop/orders

# Filter orders by user
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3001/proxy/my-shop/orders?userId=1

# Get a specific order
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3001/proxy/my-shop/orders/1

# Create a new order (POST request)
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "productId": 2, "quantity": 3}' \
  http://localhost:3001/proxy/my-shop/orders
```

---

## Step 8: Verify Request Logging

Check the **External API terminal** to see all requests being logged with timestamps!

You should see logs like:
```
[2025-10-15T14:30:15.123Z] GET /users
  → Fetching all users
[2025-10-15T14:30:16.456Z] GET /products/1
  → Found product: Laptop
```

---

## Step 9: Test Access Control

Try making a request **without** an API key:

```bash
curl http://localhost:3001/proxy/my-shop/users
```

**Expected Result:** 401 Unauthorized - "API key is required"

---

## Step 10: View Global API Key Stats

### In the Dashboard (API Keys Tab):

1. Click on the **"🔑 API Keys"** tab
2. Find your **"My Test App"** card
3. You should see usage statistics with progress bars

**Note:** The global stats track usage across all endpoints the key has access to.

---

## Understanding the Architecture

```
┌──────────────┐
│   Browser    │  Makes request with API key
│ (Your App)   │
└──────┬───────┘
       │ x-api-key: key_abc123
       ↓
┌──────────────────────────────────────────────┐
│  Proxy Gateway (localhost:3001)              │
│  ────────────────────────────────────────    │
│  1. Validates API key                        │
│  2. Checks if key has access to endpoint     │
│  3. Checks rate limits (Redis)               │
│  4. If OK: forwards request                  │
│  5. If exceeded: returns 429                 │
│  6. Logs request to PostgreSQL               │
└──────┬───────────────────────────────────────┘
       │
       ↓ (if rate limit OK)
┌──────────────────────────────────────────────┐
│  External API (localhost:4000)               │
│  ────────────────────────────────────────    │
│  Receives proxied request                    │
│  Processes it                                │
│  Returns response                            │
└──────┬───────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────┐
│  Response flows back through proxy           │
│  ────────────────────────────────────────    │
│  - Response is returned to browser           │
│  - Stats are updated in Redis                │
│  - Request is logged in PostgreSQL           │
└──────────────────────────────────────────────┘
```

---

## Key Benefits

1. **Rate Limiting:** Protect your external API from being overwhelmed
2. **Access Control:** Only authorized API keys can access endpoints
3. **Per-Endpoint Limits:** Different limits for different APIs
4. **Monitoring:** Real-time usage statistics and request logging
5. **Centralized Management:** Manage all API access from one dashboard
6. **Cost Control:** Prevent exceeding third-party API quotas

---

## Troubleshooting

### Issue: Can't connect to external API
**Solution:** Make sure the external API is running on port 4000:
```bash
curl http://localhost:4000/health
```

### Issue: Getting 403 Forbidden
**Solution:** Make sure you've linked the API key to the protected API in Step 4.

### Issue: Getting 401 Unauthorized
**Solution:** Check that you're including the `x-api-key` header with a valid key.

### Issue: Not seeing stats
**Solution:** Wait 5 seconds for the auto-refresh, or switch tabs to trigger a refresh.

---

## Next Steps

1. **Create Multiple API Keys:** Test with different keys and different limits
2. **Create Multiple Protected APIs:** Add more external APIs to protect
3. **Test Concurrent Requests:** Use tools like Apache Bench to test under load
4. **Check the Database:** Query the `proxy_request_logs` table to see all logged requests
5. **Monitor Redis:** Use `redis-cli` to see the rate limit keys in real-time

---

## Cleanup

To stop all services:

```bash
# Stop external API (press Ctrl+C in its terminal)
# Stop backend (press Ctrl+C in its terminal)
# Stop frontend (press Ctrl+C in its terminal)
# Stop Docker services
docker-compose down
```

---

## Summary

You've successfully:
- ✅ Created an external API (third-party simulation)
- ✅ Registered it as a protected API
- ✅ Created an API key
- ✅ Linked the key to the protected API
- ✅ Made proxied requests through the gateway
- ✅ Tested rate limiting
- ✅ Monitored real-time statistics

The proxy gateway is now protecting your external API with rate limiting and access control!
