const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Sample data
const users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User' },
];

const products = [
  { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 },
  { id: 2, name: 'Mouse', price: 29.99, category: 'Electronics', stock: 200 },
  { id: 3, name: 'Keyboard', price: 79.99, category: 'Electronics', stock: 150 },
  { id: 4, name: 'Monitor', price: 299.99, category: 'Electronics', stock: 75 },
];

const orders = [
  { id: 1, userId: 1, productId: 1, quantity: 1, status: 'completed', total: 999.99 },
  { id: 2, userId: 2, productId: 2, quantity: 2, status: 'pending', total: 59.98 },
  { id: 3, userId: 1, productId: 4, quantity: 1, status: 'shipped', total: 299.99 },
];

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'External API Service',
    timestamp: new Date().toISOString()
  });
});

// Users endpoints
app.get('/users', (req, res) => {
  console.log('  → Fetching all users');
  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

app.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);

  if (!user) {
    console.log(`  → User ${userId} not found`);
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  console.log(`  → Found user: ${user.name}`);
  res.json({
    success: true,
    data: user
  });
});

// Products endpoints
app.get('/products', (req, res) => {
  const category = req.query.category;
  let filteredProducts = products;

  if (category) {
    filteredProducts = products.filter(p =>
      p.category.toLowerCase() === category.toLowerCase()
    );
    console.log(`  → Filtering products by category: ${category}`);
  } else {
    console.log('  → Fetching all products');
  }

  res.json({
    success: true,
    count: filteredProducts.length,
    data: filteredProducts
  });
});

app.get('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);

  if (!product) {
    console.log(`  → Product ${productId} not found`);
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }

  console.log(`  → Found product: ${product.name}`);
  res.json({
    success: true,
    data: product
  });
});

// Orders endpoints
app.get('/orders', (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId) : null;
  let filteredOrders = orders;

  if (userId) {
    filteredOrders = orders.filter(o => o.userId === userId);
    console.log(`  → Filtering orders for user: ${userId}`);
  } else {
    console.log('  → Fetching all orders');
  }

  res.json({
    success: true,
    count: filteredOrders.length,
    data: filteredOrders
  });
});

app.get('/orders/:id', (req, res) => {
  const orderId = parseInt(req.params.id);
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    console.log(`  → Order ${orderId} not found`);
    return res.status(404).json({
      success: false,
      error: 'Order not found'
    });
  }

  console.log(`  → Found order #${order.id}`);
  res.json({
    success: true,
    data: order
  });
});

// POST endpoint - Create order
app.post('/orders', (req, res) => {
  const { userId, productId, quantity } = req.body;

  if (!userId || !productId || !quantity) {
    console.log('  → Invalid order data');
    return res.status(400).json({
      success: false,
      error: 'userId, productId, and quantity are required'
    });
  }

  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }

  const newOrder = {
    id: orders.length + 1,
    userId,
    productId,
    quantity,
    status: 'pending',
    total: product.price * quantity
  };

  orders.push(newOrder);
  console.log(`  → Created order #${newOrder.id} for user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: newOrder
  });
});

// Statistics endpoint
app.get('/stats', (req, res) => {
  console.log('  → Fetching system statistics');
  res.json({
    success: true,
    data: {
      totalUsers: users.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`  → 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 EXTERNAL API SERVICE (Third-Party Simulation)');
  console.log('='.repeat(60));
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health                - Health check`);
  console.log(`   GET  /users                 - List all users`);
  console.log(`   GET  /users/:id             - Get user by ID`);
  console.log(`   GET  /products              - List all products`);
  console.log(`   GET  /products?category=X   - Filter products by category`);
  console.log(`   GET  /products/:id          - Get product by ID`);
  console.log(`   GET  /orders                - List all orders`);
  console.log(`   GET  /orders?userId=X       - Filter orders by user`);
  console.log(`   GET  /orders/:id            - Get order by ID`);
  console.log(`   POST /orders                - Create new order`);
  console.log(`   GET  /stats                 - Get system statistics`);
  console.log('='.repeat(60));
  console.log('📊 Requests will be logged below:');
  console.log('='.repeat(60));
});
