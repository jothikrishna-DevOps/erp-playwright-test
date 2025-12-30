# Local Agent

Node.js agent that runs on developer machines to execute Playwright tests.

## Features

- Connects to backend via WebSocket
- Executes Playwright with visible browser
- Records tests using `playwright codegen`
- Runs tests in headless or visible mode
- Uploads test files to backend
- Automatic reconnection

## Responsibilities

✅ **DOES:**
- Run Playwright locally
- Open visible browser on local machine
- Execute test commands
- Upload test files

❌ **DOES NOT:**
- Run on EC2
- Open browsers remotely
- Execute shell commands from backend

## Configuration

Agent configuration is stored in `agent-config.json` (auto-generated):
```json
{
  "agentId": "uuid",
  "token": "uuid",
  "name": "hostname-uuid"
}
```

## Environment Variables

```env
BACKEND_URL=http://localhost:3001
WS_URL=ws://localhost:3001
```

## Development

```bash
npm install
npx playwright install  # Install browsers
npm run dev
```

## Usage

1. Start the agent
2. Agent connects to backend automatically
3. Wait for commands from backend
4. Browser opens locally when recording/running

## Security

- Outbound-only connections
- Token-based authentication
- No shell execution from backend
- Limited command set

