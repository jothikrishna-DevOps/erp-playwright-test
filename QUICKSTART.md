# Quick Start Guide

Get the Playwright Test Platform running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn

## Step 1: Install Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

### Agent
```bash
cd agent
npm install
npx playwright install chromium  # Install at least one browser
```

## Step 2: Start Services

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
✅ Backend running on http://localhost:3001

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
✅ Frontend running on http://localhost:3000

### Terminal 3: Agent (on your local machine)
```bash
cd agent
npm start
```
✅ Agent connected to backend

## Step 3: Record Your First Test

1. Open http://localhost:3000 in your browser
2. Click "Record New Test"
3. Fill in:
   - Test Name: "My First Test"
   - Application URL: "https://example.com"
   - Browser: Chromium (default)
4. Click "Start Recording"
5. **Browser opens on your local machine** (where agent is running)
6. Interact with the site
7. Close the browser when done
8. Test file is automatically uploaded
9. See your test in the dashboard!

## Step 4: Run a Test

1. In the dashboard, find your test
2. Click "Run (Visible)" to see the browser
3. Or click "Run (Headless)" for headless execution
4. Watch the status update in real-time

## Troubleshooting

### Agent not connecting?
- Check backend is running
- Verify WebSocket URL: `ws://localhost:3001/ws`
- Check agent logs for errors

### Browser not opening?
- Ensure Playwright browsers installed: `npx playwright install`
- On Linux, check DISPLAY variable: `echo $DISPLAY`
- Verify agent is running and connected

### Test file not uploading?
- Check agent logs
- Verify backend storage directory exists
- Check network connectivity

## Architecture Reminder

🔐 **Critical Rule:** Browser execution ONLY happens on the local agent machine. The EC2 backend never opens browsers.

✅ **Correct Flow:**
- UI (EC2) → Backend (EC2) → Agent (Local) → Browser (Local)

❌ **Never:**
- Backend (EC2) → Browser (EC2)
- UI (EC2) → Browser (EC2)

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design
- Read [SETUP.md](./SETUP.md) for production setup
- Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) for implementation details

