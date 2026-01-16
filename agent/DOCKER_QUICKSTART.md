# Docker Agent Quick Start

## Prerequisites
- Docker Desktop installed and running (Mac/Windows)
- Backend URL: `http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com`

## Quick Start (3 Steps)

### 1. Navigate to agent directory
```bash
cd agent
```

### 2. Run the startup script
```bash
chmod +x docker-run.sh
./docker-run.sh
```

### 3. Verify agent is connected
```bash
docker logs playwright-agent-docker
```

You should see:
```
✅ WebSocket connected
✅ Agent registration confirmed
```

## That's it! 

The agent is now running and will:
- ✅ Connect to backend automatically
- ✅ Wait for commands (record/run)
- ✅ Save test files to `./workspace` on your host
- ✅ Display browser on your host OS (Docker Desktop GUI)

## Important Notes

### Coexistence with Non-Docker Agent
✅ **Both agents can run simultaneously:**
- Docker agent: Uses `./config/agent-config.json`
- Non-Docker agent: Uses `./agent-config.json` (in agent directory)
- They have different agent IDs - no conflicts!

### When Agent Starts
The agent **starts automatically** when the container starts. No manual trigger needed.

### Test Files Location
Test files are saved to: `agent/workspace/temp-tests/{testId}/test.spec.ts`

### Browser Visibility
Browser opens directly on your host OS (no X11/VNC needed) thanks to Docker Desktop's native GUI support.

## Common Commands

```bash
# View logs
docker logs -f playwright-agent-docker

# Stop agent
docker-compose down

# Restart agent
docker-compose restart

# Check status
docker ps | grep playwright-agent-docker
```

## Troubleshooting

**Agent not connecting?**
- Check `BACKEND_URL` and `WS_URL` in docker-compose.yml
- Verify backend is accessible: `curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health`

**Browser not opening?**
- Ensure Docker Desktop is running
- Check Docker Desktop → Settings → General → GUI support enabled

For detailed information, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)




