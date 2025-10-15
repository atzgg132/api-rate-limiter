import { Router } from 'express';
import { proxyHandler } from '../middleware/proxyHandler';

const router = Router();

// Simple approach: handle all requests after /:apiSlug
// Express will match this and pass everything to the handler
router.use('/:apiSlug', proxyHandler);

export default router;
