import { Router, Request, Response } from 'express';
import {
  createProtectedApi,
  getAllProtectedApis,
  getProtectedApiById,
  updateProtectedApi,
  deleteProtectedApi,
  linkApiKeyToEndpoint,
  getApiKeyEndpoints,
  unlinkApiKeyFromEndpoint,
  getEndpointUsageStats,
} from '../services/protectedApiService';

const router = Router();

// Create a new protected API
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, target_url, description, http_methods, default_headers, requires_auth } = req.body;

    if (!name || !slug || !target_url) {
      return res.status(400).json({
        error: 'name, slug, and target_url are required',
      });
    }

    const protectedApi = await createProtectedApi({
      name,
      slug,
      target_url,
      description,
      http_methods,
      default_headers,
      requires_auth,
    });

    res.status(201).json(protectedApi);
  } catch (error: any) {
    console.error('Error creating protected API:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'API with this slug already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get all protected APIs
router.get('/', async (req: Request, res: Response) => {
  try {
    const apis = await getAllProtectedApis();
    res.json(apis);
  } catch (error) {
    console.error('Error fetching protected APIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific protected API
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const api = await getProtectedApiById(id);

    if (!api) {
      return res.status(404).json({ error: 'Protected API not found' });
    }

    res.json(api);
  } catch (error) {
    console.error('Error fetching protected API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a protected API
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const api = await updateProtectedApi(id, req.body);
    res.json(api);
  } catch (error: any) {
    console.error('Error updating protected API:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'API with this slug already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a protected API
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await deleteProtectedApi(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting protected API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link an API key to a protected API
router.post('/link', async (req: Request, res: Response) => {
  try {
    const { api_key_id, protected_api_id, limit_per_minute, limit_per_day } = req.body;

    if (!api_key_id || !protected_api_id || !limit_per_minute || !limit_per_day) {
      return res.status(400).json({
        error: 'api_key_id, protected_api_id, limit_per_minute, and limit_per_day are required',
      });
    }

    const link = await linkApiKeyToEndpoint({
      api_key_id,
      protected_api_id,
      limit_per_minute,
      limit_per_day,
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Error linking API key to endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all APIs accessible by an API key
router.get('/key/:keyId/endpoints', async (req: Request, res: Response) => {
  try {
    const keyId = parseInt(req.params.keyId);
    const endpoints = await getApiKeyEndpoints(keyId);
    res.json(endpoints);
  } catch (error) {
    console.error('Error fetching API key endpoints:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlink an API key from a protected API
router.delete('/link/:keyId/:apiId', async (req: Request, res: Response) => {
  try {
    const keyId = parseInt(req.params.keyId);
    const apiId = parseInt(req.params.apiId);
    await unlinkApiKeyFromEndpoint(keyId, apiId);
    res.status(204).send();
  } catch (error) {
    console.error('Error unlinking API key from endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get usage statistics for all endpoints
router.get('/stats/endpoints', async (req: Request, res: Response) => {
  try {
    const stats = await getEndpointUsageStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching endpoint usage stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
