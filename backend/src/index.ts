import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
import { initRedis } from './config/redis';
import apiKeysRouter from './routes/apiKeys';
import protectedRouter from './routes/protected';
import protectedApisRouter from './routes/protectedApis';
import proxyRouter from './routes/proxy';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/keys', apiKeysRouter);
app.use('/api/protected', protectedRouter);
app.use('/api/protected-apis', protectedApisRouter);

// Proxy route - handles all requests to third-party APIs
// Format: /proxy/:apiSlug/* (captures everything after apiSlug)
app.use('/proxy', proxyRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize and start server
const startServer = async () => {
  try {
    await initRedis();
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
