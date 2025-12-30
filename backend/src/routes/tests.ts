import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db';
import { Test, CreateTestRequest, RunTestRequest } from '../../../shared/types';
import { broadcastToAgents } from '../websocket';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

export function setupTestRoutes(router: Router, storagePath: string) {
  const uploadsPath = path.join(storagePath, 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  const upload = multer({ dest: uploadsPath });
  // List all tests
  router.get('/tests', async (req: Request, res: Response) => {
    try {
      const tests = await dbAll<Test>(
        'SELECT * FROM tests ORDER BY created_at DESC'
      );
      res.json(tests);
    } catch (error) {
      console.error('Error fetching tests:', error);
      res.status(500).json({ error: 'Failed to fetch tests' });
    }
  });

  // Get test by ID
  router.get('/tests/:id', async (req: Request, res: Response) => {
    try {
      const test = await dbGet<Test>(
        'SELECT * FROM tests WHERE id = ?',
        [req.params.id]
      );
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }
      res.json(test);
    } catch (error) {
      console.error('Error fetching test:', error);
      res.status(500).json({ error: 'Failed to fetch test' });
    }
  });

  // Create new test (initiate recording)
  router.post('/tests/record', async (req: Request, res: Response) => {
    try {
      const { name, url, browser = 'chromium' }: CreateTestRequest = req.body;

      if (!name || !url) {
        return res.status(400).json({ error: 'Name and URL are required' });
      }

      const testId = uuidv4();
      const test: Test = {
        id: testId,
        name,
        url,
        browser: browser as any,
        createdBy: 'developer', // TODO: Get from auth
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
        version: 1
      };

      await dbRun(
        `INSERT INTO tests (id, name, url, browser, created_by, status, version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [testId, name, url, browser, test.createdBy, 'pending', 1]
      );

      // Send record command to connected agents
      const agents = await dbAll<any>('SELECT id FROM agents WHERE status = ?', ['connected']);
      if (agents.length > 0) {
        // For now, send to first connected agent
        // In production, you might want agent selection logic
        broadcastToAgents({
          type: 'command:record',
          testId,
          url,
          browser
        });
      }

      res.status(201).json(test);
    } catch (error) {
      console.error('Error creating test:', error);
      res.status(500).json({ error: 'Failed to create test' });
    }
  });

  // Run test
  router.post('/tests/:id/run', async (req: Request, res: Response) => {
    try {
      const { mode = 'headless' }: RunTestRequest = req.body;
      const testId = req.params.id;

      const test = await dbGet<Test>(
        'SELECT * FROM tests WHERE id = ?',
        [testId]
      );

      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      if (!test.filePath) {
        return res.status(400).json({ error: 'Test file not uploaded yet' });
      }

      // Update status
      await dbRun(
        'UPDATE tests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['running', testId]
      );

      // Send run command to agents
      broadcastToAgents({
        type: 'command:run',
        testId,
        mode
      });

      res.json({ message: 'Test execution started', testId, mode });
    } catch (error) {
      console.error('Error running test:', error);
      res.status(500).json({ error: 'Failed to run test' });
    }
  });

  // Upload test file (agent only)
  router.post('/tests/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const testId = req.params.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const test = await dbGet<Test>(
        'SELECT * FROM tests WHERE id = ?',
        [testId]
      );

      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Create test directory
      const testDir = path.join(storagePath, 'tests', testId);
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Move uploaded file to storage
      const targetPath = path.join(testDir, 'test.spec.ts');
      fs.renameSync(file.path, targetPath);

      // Update test record
      await dbRun(
        'UPDATE tests SET file_path = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [targetPath, 'ready', testId]
      );

      res.json({ message: 'Test file uploaded successfully', testId });
    } catch (error) {
      console.error('Error uploading test file:', error);
      res.status(500).json({ error: 'Failed to upload test file' });
    }
  });

  // Download test file
  router.get('/tests/:id/download', async (req: Request, res: Response) => {
    try {
      const test = await dbGet<Test>(
        'SELECT * FROM tests WHERE id = ?',
        [req.params.id]
      );

      if (!test || !test.filePath) {
        return res.status(404).json({ error: 'Test file not found' });
      }

      if (!fs.existsSync(test.filePath)) {
        return res.status(404).json({ error: 'Test file does not exist' });
      }

      res.download(test.filePath, `${test.name}.spec.ts`);
    } catch (error) {
      console.error('Error downloading test file:', error);
      res.status(500).json({ error: 'Failed to download test file' });
    }
  });

  // Delete test
  router.delete('/tests/:id', async (req: Request, res: Response) => {
    try {
      const test = await dbGet<Test>(
        'SELECT * FROM tests WHERE id = ?',
        [req.params.id]
      );

      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }

      // Delete file if exists
      if (test.filePath && fs.existsSync(test.filePath)) {
        fs.unlinkSync(test.filePath);
      }

      // Delete test directory
      const testDir = path.join(storagePath, 'tests', req.params.id);
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }

      await dbRun('DELETE FROM tests WHERE id = ?', [req.params.id]);

      res.json({ message: 'Test deleted successfully' });
    } catch (error) {
      console.error('Error deleting test:', error);
      res.status(500).json({ error: 'Failed to delete test' });
    }
  });
}

