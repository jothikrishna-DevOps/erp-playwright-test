# Docker Agent Deployment Guide

Complete guide for deploying the Docker agent to Git and Docker Hub, and testing on different systems.

## Table of Contents

1. [Backend (EC2) Changes](#backend-ec2-changes)
2. [Git Deployment Steps](#git-deployment-steps)
3. [Docker Hub Deployment Steps](#docker-hub-deployment-steps)
4. [Testing on Different Systems](#testing-on-different-systems)
5. [Troubleshooting](#troubleshooting)

---

## Backend (EC2) Changes

**✅ No backend changes needed!**

The backend already supports Docker agents generically:
- Backend uses WebSocket for agent communication (same protocol for Docker and non-Docker agents)
- Agent registration works the same way (via `agent:register` message)
- Backend doesn't distinguish between Docker and non-Docker agents
- Both agents connect to the same WebSocket endpoint (`/ws`)
- Both agents appear in the same agent list (`/api/agents`)

**What the backend sees:**
- Docker agents have names like `docker-xxxxxxxx`
- Non-Docker agents have names like `hostname-xxxxxxxx`
- Both are treated identically by the backend

**EC2 Verification:**
```bash
# On EC2, verify agents are connecting
curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/agents

# You should see both Docker and non-Docker agents in the list
```

---

## Git Deployment Steps

### Step 1: Review Changes

```bash
cd "/home/isha/Playwright - Agent"
git status
```

You should see modified/new files:
- `agent/docker-run.sh` (updated with X11 forwarding)
- `agent/Dockerfile` (already committed)
- `agent/docker-compose.yml` (already committed)
- `agent/.dockerignore` (already committed)
- `agent/DOCKER_SETUP.md` (already committed)
- `agent/DOCKER_QUICKSTART.md` (already committed)
- `agent/DOCKER_DEPLOYMENT_GUIDE.md` (new file)
- `shared/types.ts` (updated with agent:registered and error types)
- `agent/src/config.ts` (updated for Docker support)
- `agent/src/index.ts` (updated for Docker support)
- `agent/src/agent-client.ts` (updated for Docker support)
- `agent/tsconfig.json` (updated for Docker build)

### Step 2: Add Changes to Git

```bash
# Add Docker-related files
git add agent/docker-run.sh
git add agent/Dockerfile
git add agent/docker-compose.yml
git add agent/.dockerignore
git add agent/DOCKER_SETUP.md
git add agent/DOCKER_QUICKSTART.md
git add agent/DOCKER_DEPLOYMENT_GUIDE.md

# Add modified source files
git add shared/types.ts
git add agent/src/config.ts
git add agent/src/index.ts
git add agent/src/agent-client.ts
git add agent/tsconfig.json
```

### Step 3: Commit Changes

```bash
git commit -m "feat: Add Docker support for Playwright agent with platform-aware X11 forwarding

- Add Dockerfile for containerized agent (multi-stage build)
- Add docker-compose.yml for easy orchestration
- Add docker-run.sh with platform-aware X11 forwarding (Linux only)
- Add Docker documentation (setup, quickstart, deployment guides)
- Make agent backward compatible with environment variables:
  - DOCKER, FORCE_CHROMIUM, WORKSPACE_PATH, AGENT_CONFIG_PATH
- Add platform detection for X11 forwarding (Linux/Mac/Windows)
- Update shared types (add agent:registered and error message types)
- Fix TypeScript build issues for Docker
- Non-Docker agent continues to work unchanged

Platform Support:
- Linux: X11 forwarding enabled automatically
- Mac/Windows: Docker Desktop GUI support (automatic)
- All platforms use same codebase"
```

### Step 4: Push to GitHub

```bash
git push origin main
```

### Step 5: Verify on EC2 (Optional)

If you want to verify the code is on EC2:

```bash
# SSH to EC2
ssh user@ec2-13-235-76-91.ap-south-1.compute.amazonaws.com

# Pull latest code
cd ~/erp-playwright-test
git pull origin main

# Verify Docker files are there
ls -la agent/Dockerfile
ls -la agent/docker-run.sh
ls -la agent/docker-compose.yml
```

**Note:** EC2 only needs the code if you want to build Docker images there. Typically, you build locally and push to Docker Hub.

---

## Docker Hub Deployment Steps

### Prerequisites

1. **Docker Hub account** (free at https://hub.docker.com)
2. **Docker installed** on your machine
3. **Logged in to Docker Hub**:
   ```bash
   docker login
   ```

### Step 1: Set Docker Hub Variables

Replace `YOUR_DOCKERHUB_USERNAME` with your Docker Hub username:

```bash
# Set your Docker Hub username
export DOCKERHUB_USERNAME="YOUR_DOCKERHUB_USERNAME"
export IMAGE_NAME="playwright-agent"
export IMAGE_TAG="latest"
```

### Step 2: Build Docker Image

```bash
cd "/home/isha/Playwright - Agent"

# Build the image
docker build -t $DOCKERHUB_USERNAME/$IMAGE_NAME:$IMAGE_TAG -f agent/Dockerfile .

# Tag it (optional, for versioning)
docker tag $DOCKERHUB_USERNAME/$IMAGE_NAME:$IMAGE_TAG $DOCKERHUB_USERNAME/$IMAGE_NAME:1.0.0
```

### Step 3: Test Image Locally (Optional)

```bash
# Test the image locally before pushing
docker run --rm $DOCKERHUB_USERNAME/$IMAGE_NAME:$IMAGE_TAG node --version
docker run --rm $DOCKERHUB_USERNAME/$IMAGE_NAME:$IMAGE_TAG npx playwright --version
```

### Step 4: Push to Docker Hub

```bash
# Push latest tag
docker push $DOCKERHUB_USERNAME/$IMAGE_NAME:$IMAGE_TAG

# Push version tag (optional)
docker push $DOCKERHUB_USERNAME/$IMAGE_NAME:1.0.0
```

### Step 5: Verify on Docker Hub

1. Go to https://hub.docker.com
2. Navigate to your repository: `YOUR_DOCKERHUB_USERNAME/playwright-agent`
3. Verify the image is there

### Step 6: Update docker-run.sh for Docker Hub (Optional)

If you want to use the Docker Hub image instead of building locally, update `docker-run.sh`:

```bash
# In docker-run.sh, change:
IMAGE_NAME="playwright-agent:latest"

# To:
IMAGE_NAME="$DOCKERHUB_USERNAME/playwright-agent:latest"

# And skip the build step, or make it optional
```

**Note:** For now, we'll keep building locally. You can add Docker Hub support later.

---

## Testing on Different Systems

### Test on Linux (Current System)

#### Prerequisites
```bash
# Allow Docker to access X11 (one-time per session)
xhost +local:docker

# Or add to ~/.bashrc for persistence:
echo 'xhost +local:docker' >> ~/.bashrc
```

#### Run Docker Agent
```bash
cd "/home/isha/Playwright - Agent/agent"
./docker-run.sh
```

#### Verify
```bash
# Check container is running
docker ps | grep playwright-agent-docker

# Check logs
docker logs playwright-agent-docker

# Test recording from UI
# Browser should open on your Linux desktop
```

### Test on Mac

#### Prerequisites
- Docker Desktop installed and running
- No X11 configuration needed (Docker Desktop handles GUI)

#### Run Docker Agent
```bash
# Clone repository
git clone <your-repo-url>
cd <repo-name>/agent

# Make script executable
chmod +x docker-run.sh

# Create .env file (optional)
cat > .env << EOF
BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
EOF

# Run Docker agent
./docker-run.sh
```

#### Verify
```bash
# Check container is running
docker ps | grep playwright-agent-docker

# Check logs
docker logs playwright-agent-docker

# Test recording from UI
# Browser should open on your Mac (Docker Desktop GUI)
```

### Test on Windows

#### Prerequisites
- Docker Desktop installed and running
- WSL2 enabled (if using WSL)
- No X11 configuration needed (Docker Desktop handles GUI)

#### Run Docker Agent

**Option 1: Using WSL2 (Recommended)**
```bash
# In WSL2 terminal
git clone <your-repo-url>
cd <repo-name>/agent

# Make script executable
chmod +x docker-run.sh

# Create .env file (optional)
cat > .env << EOF
BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
EOF

# Run Docker agent
./docker-run.sh
```

**Option 2: Using Git Bash**
```bash
# In Git Bash
git clone <your-repo-url>
cd <repo-name>/agent

# Make script executable (may need to use Git Bash)
chmod +x docker-run.sh

# Run Docker agent
./docker-run.sh
```

#### Verify
```bash
# Check container is running
docker ps | grep playwright-agent-docker

# Check logs
docker logs playwright-agent-docker

# Test recording from UI
# Browser should open on your Windows (Docker Desktop GUI)
```

### Test with Docker Hub Image

If you pushed to Docker Hub, you can pull and run:

```bash
# Pull image from Docker Hub
docker pull YOUR_DOCKERHUB_USERNAME/playwright-agent:latest

# Run container manually (for testing)
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
    -e DISPLAY=$DISPLAY \
    -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
    -v $(pwd)/workspace:/workspace \
    -v $(pwd)/config:/config \
    YOUR_DOCKERHUB_USERNAME/playwright-agent:latest
```

---

## Troubleshooting

### Linux: Browser Not Opening

**Problem:** Browser doesn't open on Linux

**Solution:**
```bash
# 1. Allow X11 access
xhost +local:docker

# 2. Check DISPLAY variable
echo $DISPLAY
# Should show :0 or :1

# 3. Verify X11 socket exists
ls -la /tmp/.X11-unix

# 4. Check container logs
docker logs playwright-agent-docker

# 5. Restart container
docker restart playwright-agent-docker
```

### Mac/Windows: Browser Not Opening

**Problem:** Browser doesn't open on Mac/Windows

**Solution:**
1. Ensure Docker Desktop is running
2. Check Docker Desktop → Settings → General → GUI support enabled
3. Restart Docker Desktop
4. Check container logs: `docker logs playwright-agent-docker`

### Connection Issues

**Problem:** Agent can't connect to backend

**Solution:**
```bash
# 1. Verify backend is accessible
curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health

# 2. Check BACKEND_URL and WS_URL in container
docker exec playwright-agent-docker env | grep -E "BACKEND_URL|WS_URL"

# 3. Test connectivity from container
docker exec playwright-agent-docker curl -I http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health
```

### Build Issues

**Problem:** Docker build fails

**Solution:**
```bash
# 1. Clean build (no cache)
docker build --no-cache -t playwright-agent:latest -f agent/Dockerfile .

# 2. Check build context
# Make sure you're running from project root:
cd "/home/isha/Playwright - Agent"
docker build -f agent/Dockerfile .
```

### Platform Detection Issues

**Problem:** X11 forwarding not working on Linux

**Solution:**
```bash
# Check script detected Linux correctly
# In docker-run.sh, it checks:
# if [ -d /tmp/.X11-unix ] && [ -n "$DISPLAY" ]; then

# Manually verify:
ls -d /tmp/.X11-unix
echo $DISPLAY
```

---

## Quick Reference

### Git Commands
```bash
git add agent/docker-run.sh agent/Dockerfile agent/docker-compose.yml
git commit -m "feat: Add Docker support with platform-aware X11 forwarding"
git push origin main
```

### Docker Hub Commands
```bash
docker login
docker build -t YOUR_USERNAME/playwright-agent:latest -f agent/Dockerfile .
docker push YOUR_USERNAME/playwright-agent:latest
```

### Docker Agent Commands
```bash
# Start agent
cd agent && ./docker-run.sh

# View logs
docker logs -f playwright-agent-docker

# Stop agent
docker stop playwright-agent-docker

# Remove agent
docker rm -f playwright-agent-docker
```

---

## Summary

✅ **Backend (EC2):** No changes needed - already supports Docker agents  
✅ **Git:** Commit and push Docker files  
✅ **Docker Hub:** Build and push image (optional)  
✅ **Testing:** Works on Linux, Mac, and Windows  
✅ **Platform-aware:** X11 forwarding only on Linux, automatic on Mac/Windows

The Docker agent is now ready for deployment and testing across all platforms!



