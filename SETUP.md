# Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Playwright installed globally or locally

## Installation

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

### 3. Agent Setup

```bash
cd agent
npm install

# Install Playwright browsers
npx playwright install

# Start the agent
npm start
```

## Configuration

### Backend

Create `backend/.env`:
```
PORT=3001
WS_PORT=3002
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
STORAGE_PATH=./storage
```

### Frontend

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Agent

Create `agent/.env`:
```
BACKEND_URL=http://localhost:3001
WS_URL=ws://localhost:3001
```

## Usage

1. Start the backend server
2. Start the frontend application
3. Start the local agent on your developer machine
4. Open the frontend in your browser
5. Click "Record New Test" to start recording
6. The browser will open on your local machine (where the agent is running)
7. Interact with the site to record your test
8. The test file will be automatically uploaded to the backend

## Architecture Notes

- **Browser execution ONLY happens on the local agent**
- The EC2 backend never opens browsers
- All Playwright operations run locally
- WebSocket communication for real-time updates
- HTTP REST API for file operations

## Troubleshooting

### Agent not connecting
- Check that backend is running
- Verify WebSocket URL is correct
- Check firewall settings

### Browser not opening
- Ensure Playwright browsers are installed: `npx playwright install`
- Check DISPLAY environment variable (Linux)
- Verify agent is running and connected

### Test file upload fails
- Check backend storage directory permissions
- Verify agent token is valid
- Check network connectivity

