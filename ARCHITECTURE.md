# Architecture Documentation

## System Design

### Component Interaction Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Web UI    │────────▶│   Backend   │◀────────│ Local Agent │
│   (EC2)     │  HTTP   │    API      │ WebSocket│  (Laptop)   │
└─────────────┘         └─────────────┘         └─────────────┘
                              │                        │
                              │                        │
                              ▼                        ▼
                         ┌─────────┐            ┌──────────┐
                         │ SQLite  │            │ Playwright│
                         │   DB    │            │  Browser  │
                         └─────────┘            └──────────┘
```

### Recording Flow

1. User clicks "Start Recording" in UI
2. UI sends POST `/api/tests/record` to backend
3. Backend creates test record in DB
4. Backend sends `record` command via WebSocket to agent
5. Agent receives command, runs `playwright codegen <url>`
6. Browser opens on developer laptop (visible)
7. User interacts with site
8. Agent saves generated test file
9. Agent uploads test file via POST `/api/tests/:id/upload`
10. Backend stores file, updates status
11. UI receives update via WebSocket

### Running Flow

1. User clicks "Run" in UI
2. UI sends POST `/api/tests/:id/run` to backend
3. Backend sends `run` command via WebSocket to agent
4. Agent executes test file with Playwright
5. Agent streams status updates via WebSocket
6. UI displays results in real-time

## API Contracts

### REST Endpoints

#### Tests
- `GET /api/tests` - List all tests
- `POST /api/tests/record` - Initiate recording
- `GET /api/tests/:id` - Get test details
- `POST /api/tests/:id/run` - Run test
- `POST /api/tests/:id/upload` - Upload test file (agent only)
- `GET /api/tests/:id/download` - Download test file
- `DELETE /api/tests/:id` - Delete test

#### Agents
- `POST /api/agents/register` - Register agent
- `GET /api/agents` - List connected agents
- `POST /api/agents/:id/command` - Send command to agent

#### Auth
- `POST /api/auth/login` - Agent login
- `POST /api/auth/refresh` - Refresh token

### WebSocket Messages

#### Agent → Backend
```typescript
{
  type: 'agent:register',
  agentId: string,
  token: string
}

{
  type: 'agent:status',
  agentId: string,
  status: 'idle' | 'recording' | 'running',
  message?: string
}

{
  type: 'agent:heartbeat',
  agentId: string
}
```

#### Backend → Agent
```typescript
{
  type: 'command:record',
  testId: string,
  url: string,
  browser: 'chromium' | 'firefox' | 'webkit'
}

{
  type: 'command:run',
  testId: string,
  mode: 'headless' | 'visible'
}

{
  type: 'command:stop',
  testId: string
}
```

## Data Models

### Test
```typescript
{
  id: string,
  name: string,
  url: string,
  browser: string,
  createdBy: string,
  createdAt: Date,
  updatedAt: Date,
  status: 'pending' | 'recording' | 'ready' | 'running' | 'completed' | 'failed',
  filePath?: string,
  version: number
}
```

### Agent
```typescript
{
  id: string,
  name: string,
  status: 'connected' | 'disconnected',
  lastSeen: Date,
  currentTestId?: string
}
```

## Security Model

1. **Agent Authentication**
   - Agent generates/loads token on startup
   - Token stored in agent config file
   - Token sent in WebSocket handshake
   - Backend validates token

2. **Command Validation**
   - Backend validates all commands
   - Agent only executes whitelisted commands
   - No shell execution
   - File paths sanitized

3. **Network Security**
   - Agent initiates all connections (outbound-only)
   - HTTPS/WSS for production
   - Rate limiting on API endpoints

## File Storage

- Tests stored in `backend/storage/tests/`
- Each test: `{testId}/test.spec.ts`
- Metadata in SQLite database
- Versioning: `{testId}/v{version}/test.spec.ts`

