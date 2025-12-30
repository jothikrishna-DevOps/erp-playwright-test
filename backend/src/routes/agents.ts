import { Router, Request, Response } from 'express';
import { dbRun, dbGet, dbAll } from '../db';
import { Agent, AgentLoginRequest } from '../../../shared/types';

const router = Router();

export function setupAgentRoutes(router: Router) {
  // Register agent
  router.post('/agents/register', async (req: Request, res: Response) => {
    try {
      const { agentId, token, name }: AgentLoginRequest & { name?: string } = req.body;

      if (!agentId || !token) {
        return res.status(400).json({ error: 'Agent ID and token are required' });
      }

      // Check if agent exists
      const existing = await dbGet<Agent>(
        'SELECT * FROM agents WHERE id = ?',
        [agentId]
      );

      if (existing) {
        // Update existing agent
        await dbRun(
          `UPDATE agents 
           SET token = ?, name = ?, status = 'connected', last_seen = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [token, name || existing.name, agentId]
        );
      } else {
        // Create new agent
        await dbRun(
          `INSERT INTO agents (id, name, token, status)
           VALUES (?, ?, ?, 'connected')`,
          [agentId, name || `Agent-${agentId.substring(0, 8)}`, token]
        );
      }

      res.json({ message: 'Agent registered successfully', agentId });
    } catch (error) {
      console.error('Error registering agent:', error);
      res.status(500).json({ error: 'Failed to register agent' });
    }
  });

  // List all agents
  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const agents = await dbAll<Agent>(
        'SELECT id, name, status, last_seen, current_test_id FROM agents ORDER BY last_seen DESC'
      );
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  // Get agent by ID
  router.get('/agents/:id', async (req: Request, res: Response) => {
    try {
      const agent = await dbGet<Agent>(
        'SELECT id, name, status, last_seen, current_test_id FROM agents WHERE id = ?',
        [req.params.id]
      );
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  });
}

