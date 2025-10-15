# External API (Third-Party Simulation)

This is a **simulated third-party API** for testing the proxy gateway. It runs on **port 4000** and provides sample endpoints for users, products, and orders.

## Purpose

This API simulates a real third-party service that you want to protect with rate limiting. In production, this would be replaced with actual external APIs like Stripe, SendGrid, Weather APIs, etc.

## Running the API

```bash
cd external-api
npm install
npm start
```

The API will start on **http://localhost:4000**

## Available Endpoints

### Health Check
```bash
GET /health
```
Returns the health status of the API.

### Users
```bash
# Get all users
GET /users

# Get a specific user
GET /users/:id
```

Sample data includes 3 users: Alice, Bob, and Charlie.

### Products
```bash
# Get all products
GET /products

# Filter by category
GET /products?category=Electronics

# Get a specific product
GET /products/:id
```

Sample data includes 4 products: Laptop, Mouse, Keyboard, and Monitor.

### Orders
```bash
# Get all orders
GET /orders

# Filter by user
GET /orders?userId=1

# Get a specific order
GET /orders/:id

# Create a new order
POST /orders
Content-Type: application/json

{
  "userId": 1,
  "productId": 2,
  "quantity": 3
}
```

Sample data includes 3 pre-existing orders.

### Statistics
```bash
GET /stats
```
Returns system statistics including total users, products, orders, and revenue.

## Request Logging

All incoming requests are logged to the console with timestamps:

```
[2025-10-15T14:30:15.123Z] GET /users
  → Fetching all users
```

This helps you see when requests are being proxied through the rate limiter.

## Architecture

```
┌─────────────────────────────────────┐
│   External API (Port 4000)          │
│   ─────────────────────────────     │
│   - Sample users, products, orders  │
│   - RESTful JSON API                │
│   - Request logging                 │
│   - Simulates third-party service   │
└─────────────────────────────────────┘
           ↑
           │ HTTP requests
           │
┌─────────────────────────────────────┐
│   Proxy Gateway (Port 3001)         │
│   ─────────────────────────────     │
│   - Rate limiting                   │
│   - Access control                  │
│   - Request forwarding              │
│   - Usage monitoring                │
└─────────────────────────────────────┘
           ↑
           │ x-api-key header
           │
┌─────────────────────────────────────┐
│   Client Application                │
│   (Your app, curl, Postman, etc)   │
└─────────────────────────────────────┘
```

## Usage in Testing

1. **Start this API** on port 4000
2. **Register it** in the proxy gateway as a protected API
3. **Link an API key** to this protected API
4. **Make requests** through the proxy gateway (port 3001)
5. **Watch the logs** here to see requests coming through

## Sample Test

```bash
# Direct access (no rate limiting)
curl http://localhost:4000/users

# Through proxy (with rate limiting)
curl -H "x-api-key: YOUR_KEY" http://localhost:3001/proxy/my-shop/users
```

You'll see the second request logged here, proving it went through the proxy!

## Customization

Feel free to modify `server.js` to add more endpoints, change the data, or simulate different scenarios like:
- Slow responses (add `setTimeout`)
- Random errors (simulate API failures)
- Authentication requirements
- Different response formats

## Production Usage

In production, you would:
1. **Remove this folder** (it's only for testing)
2. **Use real external APIs** (Stripe, SendGrid, OpenAI, etc.)
3. **Register those APIs** in the proxy gateway
4. **Set appropriate rate limits** based on your subscription tier
5. **Monitor usage** to prevent exceeding quotas

## Stopping the API

Press `Ctrl+C` in the terminal where it's running.
