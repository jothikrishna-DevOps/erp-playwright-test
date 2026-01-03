# Local Agent Setup Guide

Complete guide for setting up and running the Playwright agent on a developer's local machine to connect to the EC2 backend.

## Overview

The local agent runs on each developer's laptop and:
- Connects to EC2 backend via WebSocket
- Executes Playwright tests with visible browser
- Records tests using `playwright codegen`
- Uploads test files to backend
- Runs tests in headless or visible mode

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Playwright browsers installed
- EC2 backend deployed and accessible
- EC2 DNS or IP address

## Step 1: Install Dependencies

```bash
# Navigate to agent directory
cd "/home/isha/Playwright - Agent/agent"

# Install dependencies
npm install

# Install Playwright browsers (at least Chromium)
npx playwright install chromium

# Or install all browsers
npx playwright install
```

**Expected output:**
```
✅ Dependencies installed
✅ Playwright browsers installed
```

## Step 2: Get EC2 Backend Information

You need:
- **EC2 Public DNS:** `ec2-13-235-76-91.ap-south-1.compute.amazonaws.com` (replace with yours)
- **Backend URL:** `http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com`
- **WebSocket URL:** `ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws`

**If using HTTPS:**
- **Backend URL:** `https://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com`
- **WebSocket URL:** `wss://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws`

## Step 3: Configure Agent Environment

### Option A: Using .env file (Recommended)

```bash
cd "/home/isha/Playwright - Agent/agent"

# Create .env file
cat > .env << EOF
BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
EOF

# Verify
cat .env
```

**For HTTPS:**
```bash
cat > .env << EOF
BACKEND_URL=https://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
WS_URL=wss://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
EOF
```

### Option B: Using environment variables

```bash
export BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
export WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
```

### Option C: Edit agent source (not recommended)

If you don't use .env, the agent will use default localhost values. Edit `agent/src/index.ts` to change defaults.

## Step 4: Start the Agent

### Development Mode (with auto-reload)

```bash
cd "/home/isha/Playwright - Agent/agent"
npm run dev
```

### Production Mode

```bash
cd "/home/isha/Playwright - Agent/agent"
npm run build
npm start
```

## Step 5: Verify Connection

### Expected Output

When the agent starts successfully, you should see:

```
🚀 Starting Playwright Agent...

📡 Connecting to backend: http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
🆔 Agent ID: [uuid]
📝 Agent Name: [hostname-uuid]

🔌 Connecting to WebSocket: ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
✅ WebSocket connected
📝 Registered with backend
✅ Agent registration confirmed
```

### Check Agent Status on EC2

On EC2, verify the agent is connected:

```bash
# Check connected agents
curl http://localhost:3005/api/agents

# Or via public URL
curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/agents
```

You should see your agent in the list with status "connected".

## Step 6: Test the Agent

### Test Recording

1. Open the frontend: `http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com`
2. Click "Record New Test"
3. Fill in:
   - Test Name: "My Test"
   - Application URL: "https://example.com"
   - Browser: Chromium
4. Click "Start Recording"

**What should happen:**
- Agent receives command via WebSocket
- Browser opens on your local machine (visible)
- You interact with the site
- Agent saves the test file
- Agent uploads test file to backend
- Test appears in dashboard

### Agent Console Output

You should see in the agent terminal:

```
🎬 Starting recording for test: [test-id]
📝 Running: npx playwright codegen...
🌐 Browser will open on your local machine (visible mode)...
[Browser opens here]
✅ Recording completed successfully
📤 Uploading test file for [test-id]...
✅ Test file uploaded successfully
```

## Troubleshooting

### Issue: Agent cannot connect to EC2

**Symptoms:**
```
WebSocket error: Error: connect ECONNREFUSED
❌ WebSocket disconnected
⏳ Reconnecting in 5 seconds...
```

**Solutions:**

1. **Check EC2 Security Group**
   - Ensure port 80 (HTTP) is open
   - Ensure port 443 (HTTPS) is open if using SSL
   - Check AWS Console → EC2 → Security Groups

2. **Verify EC2 DNS/IP**
   ```bash
   # Test connectivity
   curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

3. **Check firewall on local machine**
   - Ensure outbound connections are allowed
   - Check if corporate firewall blocks WebSocket

4. **Verify .env file**
   ```bash
   cat agent/.env
   ```
   Ensure URLs are correct (no typos, correct protocol)

### Issue: Browser doesn't open

**Symptoms:**
- Recording starts but browser doesn't appear
- Error: "Browser not found"
- Error: "too many arguments for 'codegen'. Expected 1 argument but got 3."

**Solutions:**

1. **Fix: Paths with spaces in project directory**
   
   If your project path contains spaces (e.g., `/home/isha/Playwright - Agent`), the Playwright codegen command may fail. This is already fixed in the code, but if you see this error:
   
   ```bash
   error: too many arguments for 'codegen'. Expected 1 argument but got 3.
   ```
   
   Ensure your `agent/src/agent-client.ts` has quoted paths:
   ```typescript
   const command = `npx playwright codegen "${message.url}" --target=typescript --output="${outputFile}" --browser=${message.browser}`;
   ```
   
   If you need to update manually, restart the agent after fixing.

2. **Install Playwright browsers**
   ```bash
   cd agent
   npx playwright install chromium
   ```

3. **On Linux - Check DISPLAY variable**
   ```bash
   echo $DISPLAY
   ```
   Should show something like `:0` or `:1`
   
   If empty:
   ```bash
   export DISPLAY=:0
   ```

4. **On Windows/Mac**
   - Ensure you have a desktop environment
   - Try running from a terminal with GUI access

5. **Verify Playwright installation**
   ```bash
   npx playwright --version
   npx playwright install --help
   ```

### Issue: Test file not uploading

**Symptoms:**
- Recording completes but test doesn't appear in dashboard
- Error: "Failed to upload test file"

**Solutions:**

1. **Check agent logs**
   ```bash
   # Look for upload errors in agent console
   ```

2. **Verify backend is accessible**
   ```bash
   curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health
   ```

3. **Check network connectivity**
   ```bash
   ping ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
   ```

4. **Verify agent token**
   - Agent generates token automatically
   - Check `agent-config.json` if issues persist

### Issue: Connection timeout

**Symptoms:**
- Agent tries to connect but times out
- "Connection timeout" errors

**Solutions:**

1. **Check network latency**
   ```bash
   ping ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
   ```

2. **Verify EC2 backend is running**
   - Check EC2: `pm2 status` (should show services running)
   - Test backend: `curl http://localhost:3005/api/health`

3. **Check nginx WebSocket configuration**
   - On EC2: `sudo grep -A 10 "/ws" /etc/nginx/conf.d/playwright-platform.conf`
   - Should show WebSocket upgrade headers

### Issue: Agent disconnects frequently

**Symptoms:**
- Agent connects but disconnects after a few seconds
- "WebSocket disconnected" messages

**Solutions:**

1. **Check heartbeat**
   - Agent sends heartbeat every 30 seconds
   - Ensure network is stable

2. **Check EC2 backend logs**
   ```bash
   # On EC2
   pm2 logs playwright-backend
   ```

3. **Verify WebSocket endpoint**
   ```bash
   # Test WebSocket manually (install wscat first: npm install -g wscat)
   wscat -c ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
   ```

## Agent Configuration

### Agent Config File

The agent creates `agent-config.json` automatically:

```json
{
  "agentId": "4af878b4-7d0b-40c1-81a2-d14f43b4dbb8",
  "token": "uuid-token",
  "name": "hostname-uuid"
}
```

**Location:** `agent/agent-config.json`

**Note:** This file is auto-generated. Don't edit manually unless necessary.

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BACKEND_URL` | Backend API URL | `http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com` |
| `WS_URL` | WebSocket URL | `ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws` |

## Running Multiple Agents

You can run multiple agents from different machines:

1. Each agent gets a unique ID automatically
2. Each connects independently to EC2
3. Backend can send commands to any connected agent
4. Currently, commands go to the first connected agent (can be enhanced for agent selection)

## Agent Lifecycle

### Startup Sequence

1. Agent starts
2. Loads or creates agent config
3. Connects to backend via WebSocket
4. Registers with backend
5. Starts heartbeat (every 30s)
6. Waits for commands

### Command Execution

1. Receives command via WebSocket
2. Executes Playwright command locally
3. Opens browser on local machine
4. Sends status updates to backend
5. Uploads files when complete
6. Returns to idle state

### Shutdown

- Graceful: Ctrl+C or SIGTERM
- Agent disconnects from backend
- Backend marks agent as disconnected

## Security Notes

### Authentication

- Agent generates token on first run
- Token stored in `agent-config.json`
- Token sent to backend for authentication
- Backend validates token

### Network Security

- Agent makes outbound connections only
- No inbound ports needed
- Works through firewalls/NAT
- WebSocket connection is persistent

### File Security

- Test files stored temporarily during recording
- Files uploaded to backend immediately
- Local temp files cleaned up after upload
- No sensitive data stored locally

## Quick Reference Commands

### Start Agent

```bash
cd agent
npm run dev        # Development mode
npm start          # Production mode
```

### Check Agent Status

```bash
# Check if agent is running
ps aux | grep "tsx\|node.*agent"

# Check agent config
cat agent/agent-config.json
```

### View Agent Logs

Agent logs are displayed in the terminal where it's running. For production mode:

```bash
# If using PM2 or similar
pm2 logs agent
```

### Stop Agent

```bash
# Press Ctrl+C in the terminal
# Or if running as service:
pm2 stop agent
```

## Testing Checklist

After setup, verify:

- [ ] Agent starts without errors
- [ ] Agent connects to EC2 backend
- [ ] Agent shows "✅ Agent registration confirmed"
- [ ] Agent appears in backend agent list
- [ ] Recording opens browser locally
- [ ] Test file uploads successfully
- [ ] Test appears in dashboard
- [ ] Running tests works

## Common Workflows

### Daily Usage

1. Start agent: `cd agent && npm run dev`
2. Keep agent running in terminal
3. Use web UI to record/run tests
4. Browser opens on your machine automatically

### First Time Setup

1. Install dependencies: `npm install`
2. Install browsers: `npx playwright install chromium`
3. Configure .env with EC2 URL
4. Start agent: `npm run dev`
5. Verify connection

### Troubleshooting Connection

1. Check .env file: `cat agent/.env`
2. Test backend: `curl http://YOUR_EC2_DNS/api/health`
3. Check agent logs for errors
4. Verify EC2 security group allows port 80
5. Check nginx is running on EC2

## Platform-Specific Notes

### Linux

- Ensure DISPLAY variable is set: `export DISPLAY=:0`
- May need X11 forwarding for remote sessions
- Install required system dependencies for browsers

### macOS

- Should work out of the box
- May need to allow terminal to control computer (System Preferences)

### Windows

- Should work out of the box
- Ensure Windows Defender doesn't block Playwright

## Next Steps

After agent is set up:

1. **Test Recording:** Record your first test via the web UI
2. **Test Execution:** Run a recorded test
3. **Verify Upload:** Check that test files appear in dashboard
4. **Multiple Agents:** Set up agents on other developer machines

## Support

If you encounter issues:

1. Check agent console output for errors
2. Verify EC2 backend is accessible
3. Check EC2 backend logs: `pm2 logs playwright-backend`
4. Verify network connectivity
5. Review troubleshooting section above

---

**Last Updated:** December 30, 2025  
**Tested with:** EC2 backend at `ec2-13-235-76-91.ap-south-1.compute.amazonaws.com`

