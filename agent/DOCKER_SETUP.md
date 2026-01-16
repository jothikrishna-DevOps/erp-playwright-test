# Docker Agent Setup Guide

Complete guide for running the Playwright agent in a Docker container with Docker Desktop's native GUI support (Mac/Windows).

## Overview

The Docker agent runs in a container and:
- Connects to EC2 backend via WebSocket (same as non-Docker agent)
- Executes Playwright tests with visible browser (using Docker Desktop GUI support)
- Records tests using `playwright codegen`
- Saves test files to a mounted volume on your host machine
- Uses Chromium-only mode (smaller image, faster startup)
- Persists agent configuration between container restarts

## Prerequisites

- **Docker Desktop** installed and running (Mac/Windows)
  - For Mac: [Download Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
  - For Windows: [Download Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
  - Docker Desktop automatically handles GUI forwarding - no X11 configuration needed
- EC2 backend deployed and accessible
- EC2 DNS or IP address

## Important: Coexistence with Non-Docker Agent

✅ **Both agents can run simultaneously without conflicts:**
- Each agent has its own unique `agent-config.json` file
- Docker agent uses a separate config path (mounted volume)
- Non-Docker agent uses its local `agent-config.json`
- Backend sees them as separate agents (different agent IDs)
- Commands can be sent to either agent (or first available)

## Quick Start

### Option 1: Using docker-compose (Recommended)

1. **Navigate to agent directory:**
   ```bash
   cd agent
   ```

2. **Create `.env` file (optional, for custom configuration):**
   ```bash
   cat > .env << EOF
   BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
   WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
   HOST_WORKSPACE_PATH=./workspace
   HOST_CONFIG_PATH=./config
   EOF
   ```
   
   **Note:** Do NOT include `/ws` in `WS_URL` - the agent code adds it automatically.

3. **Run the startup script:**
   ```bash
   chmod +x docker-run.sh
   ./docker-run.sh
   ```

   Or manually:
   ```bash
   docker-compose up -d
   ```

4. **View logs:**
   ```bash
   docker logs -f playwright-agent-docker
   ```

### Option 2: Using Docker commands directly

1. **Build the image:**
   ```bash
   cd agent
   docker build -t playwright-agent:latest .
   ```

2. **Create directories for volumes:**
   ```bash
   mkdir -p ./workspace ./config
   ```

3. **Run the container:**
   ```bash
   docker run -d \
     --name playwright-agent-docker \
     --platform linux/amd64 \
     --restart unless-stopped \
     -e BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com \
     -e WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com \
     -e WORKSPACE_PATH=/workspace \
     -e AGENT_CONFIG_PATH=/config/agent-config.json \
     -e FORCE_CHROMIUM=true \
     -e DOCKER=true \
     -v "$(pwd)/workspace:/workspace" \
     -v "$(pwd)/config:/config" \
     playwright-agent:latest
   ```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_URL` | Yes | `http://localhost:3005` | Backend API URL (HTTP/HTTPS) |
| `WS_URL` | Yes | `ws://localhost:3005` | WebSocket URL (**without** `/ws` suffix) |
| `WORKSPACE_PATH` | No | `/workspace` | Container path for test files |
| `AGENT_CONFIG_PATH` | No | `/config/agent-config.json` | Container path for agent config |
| `FORCE_CHROMIUM` | No | `true` | Force Chromium-only mode |
| `DOCKER` | No | `true` | Indicates Docker mode (affects agent name) |

### Volume Mounts

**Workspace Volume** (`/workspace` in container):
- Where test files are saved
- Mounted from host: `./workspace` (default) or `$HOST_WORKSPACE_PATH`
- Test files appear immediately on your host machine
- Example: If test is saved to `/workspace/temp-tests/abc123/test.spec.ts` in container,
  it appears at `./workspace/temp-tests/abc123/test.spec.ts` on your host

**Config Volume** (`/config` in container):
- Where `agent-config.json` is persisted
- Mounted from host: `./config` (default) or `$HOST_CONFIG_PATH`
- Agent ID and token persist between container restarts
- Each Docker agent has its own config file (separate from non-Docker agent)

## When to Start the Agent

**Answer: Start the container whenever you want the agent available.**

The agent automatically:
1. ✅ Starts when container starts (no manual trigger needed)
2. ✅ Loads config from mounted volume (or creates new one)
3. ✅ Connects to backend using `BACKEND_URL` and `WS_URL`
4. ✅ Registers with backend (appears in backend's agent list)
5. ✅ Starts heartbeat (every 30 seconds)
6. ✅ Waits for commands (idle state)

**Typical workflow:**
- Start container: `docker-compose up -d`
- Agent connects automatically
- Use UI to trigger recording/run
- Agent receives command and executes
- Test files saved to `./workspace` on host
- Agent uploads results to backend
- Agent returns to idle state

## Browser Visibility (Docker Desktop)

**How it works:**
- Docker Desktop (Mac/Windows) automatically handles GUI forwarding
- No X11 configuration needed
- No VNC setup required
- Browser opens directly in your host OS window manager
- `headless=false` works out of the box

**Requirements:**
- Docker Desktop must be running
- GUI support enabled in Docker Desktop settings (enabled by default)

## Chromium-Only Mode

The Docker agent is configured to use **Chromium only**:
- ✅ Smaller Docker image (faster builds, less disk space)
- ✅ Faster Playwright installation
- ✅ All browser commands automatically use Chromium
- ✅ Set via `FORCE_CHROMIUM=true` environment variable

If the backend sends a command for Firefox or WebKit, the Docker agent will automatically use Chromium instead (with a log message).

## Verifying Agent is Running

1. **Check container status:**
   ```bash
   docker ps | grep playwright-agent-docker
   ```

2. **Check agent logs:**
   ```bash
   docker logs playwright-agent-docker
   ```

   You should see:
   ```
   🚀 Starting Playwright Agent...
   📡 Connecting to backend: http://...
   🆔 Agent ID: ...
   📝 Agent Name: docker-...
   🔌 Connecting to WebSocket: ws://.../ws
   ✅ WebSocket connected
   📝 Registered with backend
   ✅ Agent registration confirmed
   ```

3. **Check backend agent list:**
   ```bash
   curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/agents
   ```
   
   Your Docker agent should appear with name starting with "docker-".

## Troubleshooting

### Agent Cannot Connect to Backend

1. **Check BACKEND_URL and WS_URL:**
   ```bash
   docker exec playwright-agent-docker env | grep -E "BACKEND_URL|WS_URL"
   ```

2. **Test connectivity from container:**
   ```bash
   docker exec playwright-agent-docker curl -I $BACKEND_URL/api/health
   ```

3. **Check network connectivity:**
   ```bash
   docker exec playwright-agent-docker ping -c 3 ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
   ```

### Browser Not Opening

1. **Verify Docker Desktop is running:**
   - Mac: Docker icon in menu bar
   - Windows: Docker Desktop app running

2. **Check Docker Desktop GUI settings:**
   - Docker Desktop → Settings → General → Enable GUI support

3. **Check logs for errors:**
   ```bash
   docker logs playwright-agent-docker 2>&1 | grep -i browser
   ```

### Test Files Not Appearing on Host

1. **Check volume mounts:**
   ```bash
   docker inspect playwright-agent-docker | grep -A 10 Mounts
   ```

2. **Verify workspace directory exists:**
   ```bash
   ls -la ./workspace
   ```

3. **Check container logs for file paths:**
   ```bash
   docker logs playwright-agent-docker | grep "Output file"
   ```

### Agent Name Conflict

**This should not happen**, but if you see duplicate agent IDs:

1. **Each agent uses a separate config file:**
   - Docker agent: `./config/agent-config.json` (or `$HOST_CONFIG_PATH`)
   - Non-Docker agent: `./agent-config.json` (in agent directory)

2. **Delete and recreate Docker agent config:**
   ```bash
   rm ./config/agent-config.json
   docker-compose restart
   ```

## Container Management

### Stop the Agent
```bash
docker-compose down
# or
docker stop playwright-agent-docker
```

### Restart the Agent
```bash
docker-compose restart
# or
docker restart playwright-agent-docker
```

### View Logs
```bash
# Follow logs in real-time
docker logs -f playwright-agent-docker

# View last 100 lines
docker logs --tail 100 playwright-agent-docker
```

### Rebuild Image (after code changes)
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Remove Everything (including volumes)
```bash
docker-compose down -v
```

## File Structure

```
agent/
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Container configuration
├── docker-run.sh          # Startup script
├── .dockerignore          # Build exclusions
├── DOCKER_SETUP.md        # This file
├── src/                   # Source code (unchanged)
│   ├── index.ts
│   ├── agent-client.ts    # Modified: Added WORKSPACE_PATH, FORCE_CHROMIUM support
│   └── config.ts          # Modified: Added AGENT_CONFIG_PATH support
└── workspace/             # Created at runtime (test files)
    └── temp-tests/
└── config/                # Created at runtime (agent-config.json)
    └── agent-config.json
```

## Differences from Non-Docker Agent

| Feature | Non-Docker Agent | Docker Agent |
|---------|------------------|--------------|
| **Browser Support** | All browsers (Chromium, Firefox, WebKit) | Chromium only |
| **Config Location** | `./agent-config.json` | Mounted volume (default: `./config/agent-config.json`) |
| **Test Files** | `./temp-tests/` | Mounted volume (default: `./workspace/temp-tests/`) |
| **Agent Name** | `hostname-uuid` | `docker-uuid` |
| **Startup** | `npm run dev` | `docker-compose up` |
| **Isolation** | Runs on host OS | Runs in container |

## Security Notes

- ✅ Agent makes **outbound connections only** (no ports exposed)
- ✅ No SSH or privileged mode required
- ✅ Token-based authentication (same as non-Docker agent)
- ✅ Stateless container (all data in mounted volumes)
- ✅ No shell execution from backend

## Next Steps

1. ✅ Start the Docker agent: `./docker-run.sh`
2. ✅ Verify it's connected: Check logs and backend agent list
3. ✅ Trigger a test recording from the UI
4. ✅ Verify browser opens (visible on host)
5. ✅ Verify test file appears in `./workspace` directory
6. ✅ Verify file uploads to backend

Both Docker and non-Docker agents can run simultaneously - they won't interfere with each other!




