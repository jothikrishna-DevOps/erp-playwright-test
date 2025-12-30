import { Express, Router } from 'express';
import { setupTestRoutes } from './tests';
import { setupAgentRoutes } from './agents';

export function setupRoutes(app: Express, storagePath: string) {
  const router = Router();
  
  // Root route
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Playwright Test Platform API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        tests: '/api/tests',
        agents: '/api/agents'
      }
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Setup route groups
  setupTestRoutes(router, storagePath);
  setupAgentRoutes(router);

  // Mount router
  app.use('/api', router);
}

