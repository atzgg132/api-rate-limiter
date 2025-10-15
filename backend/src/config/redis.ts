import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export const initRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
    throw error;
  }
};

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});
