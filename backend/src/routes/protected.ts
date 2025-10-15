import { Router, Request, Response } from 'express';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protected endpoint that requires API key and enforces rate limiting
router.get('/data', rateLimiter, (req: Request, res: Response) => {
  const apiKeyData = (req as any).apiKeyData;

  res.json({
    message: 'Success! This is protected data.',
    timestamp: new Date().toISOString(),
    api_key_name: apiKeyData.name,
  });
});

// Another protected endpoint for testing
router.post('/action', rateLimiter, (req: Request, res: Response) => {
  const apiKeyData = (req as any).apiKeyData;

  res.json({
    message: 'Action completed successfully',
    timestamp: new Date().toISOString(),
    api_key_name: apiKeyData.name,
    received_data: req.body,
  });
});

export default router;
