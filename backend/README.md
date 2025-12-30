# Backend API

Express.js backend server for the Playwright Test Platform.

## Features

- REST API for test management
- WebSocket server for real-time agent communication
- SQLite database for test metadata
- File storage for test files
- Agent registration and management

## API Endpoints

### Tests
- `GET /api/tests` - List all tests
- `POST /api/tests/record` - Initiate recording
- `GET /api/tests/:id` - Get test details
- `POST /api/tests/:id/run` - Run test
- `POST /api/tests/:id/upload` - Upload test file (agent only)
- `GET /api/tests/:id/download` - Download test file
- `DELETE /api/tests/:id` - Delete test

### Agents
- `POST /api/agents/register` - Register agent
- `GET /api/agents` - List connected agents
- `GET /api/agents/:id` - Get agent details

### Health
- `GET /api/health` - Health check

## WebSocket

WebSocket endpoint: `ws://localhost:3001/ws`

### Message Types

**Agent → Backend:**
- `agent:register` - Register agent
- `agent:status` - Update status
- `agent:heartbeat` - Keep-alive

**Backend → Agent:**
- `command:record` - Start recording
- `command:run` - Run test
- `command:stop` - Stop execution

## Environment Variables

```env
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
STORAGE_PATH=./storage
```

## Development

```bash
npm install
npm run dev
```

