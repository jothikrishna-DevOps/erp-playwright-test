import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { initDatabase } from './db';
import { setupRoutes } from './routes';
import { setupWebSocket } from './websocket';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create storage directories
const storagePath = process.env.STORAGE_PATH || './storage';
const testsPath = path.join(storagePath, 'tests');
if (!fs.existsSync(testsPath)) {
  fs.mkdirSync(testsPath, { recursive: true });
}

// Initialize database
initDatabase().then(() => {
  console.log('✅ Database initialized');

  // Setup routes
  setupRoutes(app, storagePath);

  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });
  setupWebSocket(wss);

  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 Backend API running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/ws`);
  });
}).catch((error) => {
  console.error('❌ Failed to initialize:', error);
  process.exit(1);
});

