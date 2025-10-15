import { Router, Request, Response } from 'express';
import {
  createApiKey,
  getAllApiKeys,
  deleteApiKey,
  getUsageStats,
} from '../services/apiKeyService';

const router = Router();

// Create a new API key
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, limit_per_minute, limit_per_day } = req.body;

    if (!name || !limit_per_minute || !limit_per_day) {
      return res.status(400).json({
        error: 'name, limit_per_minute, and limit_per_day are required',
      });
    }

    const apiKey = await createApiKey({
      name,
      limit_per_minute,
      limit_per_day,
    });

    res.status(201).json(apiKey);
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all API keys
router.get('/', async (req: Request, res: Response) => {
  try {
    const keys = await getAllApiKeys();
    res.json(keys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an API key
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteApiKey(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get usage statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getUsageStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
