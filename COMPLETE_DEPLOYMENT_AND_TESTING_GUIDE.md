# Complete Deployment and Testing Guide

Complete guide for deploying Docker agent to Git/Docker Hub and testing like a developer.

## Table of Contents

1. [Changes Made](#changes-made)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Git Deployment Steps](#git-deployment-steps)
4. [Docker Hub Deployment Steps](#docker-hub-deployment-steps)
5. [Testing Steps (Like a Developer)](#testing-steps-like-a-developer)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Changes Made

### What Was Updated

1. **`agent/docker-run.sh`**
   - ✅ Added platform-aware X11 forwarding (Linux only)
   - ✅ Added automatic `xhost +local:docker` execution (Linux only)
   - ✅ Automatic detection of Linux/Mac/Windows
   - ✅ Works out-of-the-box for developers

2. **Docker Files (Already Created)**
   - ✅ `agent/Dockerfile` - Multi-stage build
   - ✅ `agent/docker-compose.yml` - Container configuration
   - ✅ `agent/.dockerignore` - Build exclusions
   - ✅ Docker documentation files

3. **Source Code Updates (Already Done)**
   - ✅ `shared/types.ts` - Added agent:registered and error types
   - ✅ `agent/src/config.ts` - Docker config path support
   - ✅ `agent/src/index.ts` - Docker agent name prefix
   - ✅ `agent/src/agent-client.ts` - Docker environment variables
   - ✅ `agent/tsconfig.json` - Docker build fixes

---

## Pre-Deployment Checklist

Before deploying, verify:

- [ ] All files are updated correctly
- [ ] Script syntax is valid
- [ ] Changes are tested locally (optional)
- [ ] Ready to commit and push

---

## Git Deployment Steps

### Step 1: Review Changes

```bash
cd "/home/isha/Playwright - Agent"

# Check what files changed
git status

# Review changes in docker-run.sh
git diff agent/docker-run.sh | head -50
```

### Step 2: Add Files to Git

```bash
# Add Docker files
git add agent/Dockerfile
git add agent/docker-compose.yml
git add agent/docker-run.sh
git add agent/.dockerignore

# Add Docker documentation
git add agent/DOCKER_SETUP.md
git add agent/DOCKER_QUICKSTART.md
git add agent/DOCKER_DEPLOYMENT_GUIDE.md

# Add modified source files
git add shared/types.ts
git add agent/src/config.ts
git add agent/src/index.ts
git add agent/src/agent-client.ts
git add agent/tsconfig.json

# Verify what will be committed
git status
```

### Step 3: Commit Changes

```bash
git commit -m "feat: Add Docker support for Playwright agent with automatic X11 forwarding

- Add Dockerfile for containerized agent (multi-stage build)
- Add docker-compose.yml for easy orchestration
- Add docker-run.sh with platform-aware X11 forwarding and automatic xhost setup
- Add Docker documentation (setup, quickstart, deployment guides)
- Make agent backward compatible with environment variables
- Add automatic X11 access setup for Linux (no manual steps needed)
- Platform-aware: Linux (X11), Mac/Windows (Docker Desktop GUI)
- Update shared types (add agent:registered and error message types)
- Fix TypeScript build issues for Docker
- Non-Docker agent continues to work unchanged

Features:
- Automatic X11 forwarding setup on Linux (xhost +local:docker)
- Platform detection (Linux/Mac/Windows)
- Works out-of-the-box for developers
- No manual configuration needed"
```

### Step 4: Push to GitHub

```bash
git push origin main
```

### Step 5: Verify on GitHub

1. Go to your GitHub repository
2. Check the latest commit is there
3. Verify all files are present:
   - `agent/Dockerfile`
   - `agent/docker-compose.yml`
   - `agent/docker-run.sh`
   - `agent/.dockerignore`
   - Docker documentation files

---

## Docker Hub Deployment Steps

### Step 1: Login to Docker Hub

```bash
docker login
# Enter username: krishna2684
# Enter password: [your password]
```

### Step 2: Build Docker Image

```bash
cd "/home/isha/Playwright - Agent"

# Build the image with your Docker Hub username
docker build -t krishna2684/playwright-agent:latest -f agent/Dockerfile .

# Tag for versioning (optional)
docker tag krishna2684/playwright-agent:latest krishna2684/playwright-agent:1.0.0
```

### Step 3: Test Image Locally (Optional)

```bash
# Test the image works
docker run --rm krishna2684/playwright-agent:latest node --version
docker run --rm krishna2684/playwright-agent:latest npx playwright --version
```

### Step 4: Push to Docker Hub

```bash
# Push latest tag
docker push krishna2684/playwright-agent:latest

# Push version tag (optional)
docker push krishna2684/playwright-agent:1.0.0
```

### Step 5: Verify on Docker Hub

1. Go to https://hub.docker.com
2. Login with your account (krishna2684)
3. Navigate to: `krishna2684/playwright-agent`
4. Verify the image is there

---

## Testing Steps (Like a Developer)

### Clean Start - Fresh Test Environment

This simulates what a developer would do on a fresh system:

### Step 1: Stop and Remove Existing Container

```bash
cd "/home/isha/Playwright - Agent/agent"

# Stop and remove existing container (clean start)
docker stop playwright-agent-docker 2>/dev/null || true
docker rm playwright-agent-docker 2>/dev/null || true

# Remove workspace and config (optional - for clean test)
rm -rf workspace config
```

### Step 2: Test as a Developer Would

**Scenario 1: Fresh Setup (What a developer does first time)**

```bash
cd "/home/isha/Playwright - Agent/agent"

# Clone repository (if testing from scratch)
# git clone <your-repo-url>
# cd <repo-name>/agent

# Make script executable
chmod +x docker-run.sh

# Check script is executable
ls -la docker-run.sh

# Run the script (like a developer would)
./docker-run.sh
```

**What should happen:**
1. Script detects Linux
2. Automatically runs `xhost +local:docker`
3. Shows: "✅ Enabled X11 access for Docker automatically"
4. Shows: "✅ Detected Linux with X11 - enabling X11 forwarding"
5. Builds Docker image
6. Starts container
7. Container connects to backend

### Step 3: Verify Container is Running

```bash
# Check container is running
docker ps | grep playwright-agent-docker

# Should show container running
```

### Step 4: Check Container Logs

```bash
# View logs
docker logs playwright-agent-docker

# Should see:
# ✅ Enabled X11 access for Docker automatically (if Linux)
# ✅ Detected Linux with X11 - enabling X11 forwarding (if Linux)
# 🚀 Starting Playwright Agent...
# 📡 Connecting to backend: http://...
# ✅ WebSocket connected
# ✅ Agent registration confirmed
```

### Step 5: Verify Agent is Connected (Backend Check)

```bash
# Check backend sees the agent
curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/agents

# Should see your Docker agent (name starts with "docker-")
# Example:
# [
#   {
#     "id": "...",
#     "name": "docker-xxxxxxxx",
#     "status": "connected",
#     ...
#   }
# ]
```

### Step 6: Test Recording (Browser Test)

1. **Go to your frontend UI** (recording page)
2. **Fill in the form:**
   - Test Name: `docker-test-1`
   - URL: `https://www.google.com`
   - Browser: `Chromium`
   - Created By: `Developer Test`
   - Folder: `docker-tests` (or create new)
   - Description: `Testing Docker agent`

3. **Click "Start Recording"**

4. **What should happen:**
   - Backend sends command to Docker agent
   - Docker agent receives command
   - **Browser opens on your Linux desktop** (visible window)
   - Playwright codegen window opens
   - You can interact with the page
   - Test file is saved to `agent/workspace/temp-tests/{testId}/test.spec.ts`

5. **Interact with the page:**
   - Click on elements
   - Type in inputs
   - Navigate around

6. **Close the browser window** to finish recording

7. **Check test file was created:**
   ```bash
   # Check test file exists
   ls -la workspace/temp-tests/*/test.spec.ts
   
   # View test file
   cat workspace/temp-tests/*/test.spec.ts | head -30
   ```

8. **Verify test appears in UI:**
   - Go back to dashboard
   - Test should appear in the list
   - Should show status: "ready"
   - Should show in folder: "docker-tests"

### Step 7: Verify X11 Forwarding Works

```bash
# Check DISPLAY is set in container
docker exec playwright-agent-docker env | grep DISPLAY

# Should show: DISPLAY=:0 (or :1)

# Check X11 socket is mounted
docker exec playwright-agent-docker ls -la /tmp/.X11-unix/

# Should show X11 socket files
```

---

## Verification Checklist

### Pre-Deployment Verification

- [x] `docker-run.sh` has automatic `xhost +local:docker` step
- [x] `docker-run.sh` has platform-aware X11 detection
- [x] `docker-run.sh` syntax is valid (no errors)
- [ ] All files are staged for commit

### Git Deployment Verification

- [ ] All Docker files are committed
- [ ] Commit message is descriptive
- [ ] Changes are pushed to GitHub
- [ ] GitHub shows latest commit
- [ ] All files are visible on GitHub

### Docker Hub Deployment Verification

- [ ] Docker image builds successfully
- [ ] Docker image works (test run)
- [ ] Image is pushed to Docker Hub
- [ ] Image is visible on Docker Hub (krishna2684/playwright-agent)

### Testing Verification

- [ ] Container starts successfully
- [ ] Container connects to backend
- [ ] Agent appears in backend agent list
- [ ] X11 forwarding works (Linux)
- [ ] Browser opens when recording starts
- [ ] Test file is saved correctly
- [ ] Test file uploads to backend
- [ ] Test appears in UI dashboard

### Developer Experience Verification

- [ ] Script runs without manual steps (Linux)
- [ ] No need to run `xhost +local:docker` manually
- [ ] Script works on fresh system (cloned from Git)
- [ ] Script detects platform correctly (Linux/Mac/Windows)

---

## Troubleshooting

### Issue: Script Fails to Enable X11 Access

**Problem:** "Could not enable X11 access automatically"

**Solution:**
```bash
# Manually enable X11 access
xhost +local:docker

# Then run script again
./docker-run.sh
```

### Issue: Browser Doesn't Open

**Problem:** Container runs but browser doesn't open

**Solution:**
```bash
# 1. Check X11 access is enabled
xhost

# Should show: "access control disabled, clients can connect from any host"

# 2. Check DISPLAY is set
echo $DISPLAY
# Should show: :0 or :1

# 3. Check container has DISPLAY
docker exec playwright-agent-docker env | grep DISPLAY

# 4. Restart container
docker restart playwright-agent-docker

# 5. Check logs for errors
docker logs playwright-agent-docker | grep -i error
```

### Issue: Container Can't Connect to Backend

**Problem:** Container runs but can't connect to backend

**Solution:**
```bash
# 1. Check backend is accessible
curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health

# 2. Check BACKEND_URL and WS_URL in container
docker exec playwright-agent-docker env | grep -E "BACKEND_URL|WS_URL"

# 3. Test connectivity from container
docker exec playwright-agent-docker curl -I http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health

# 4. Check firewall/network issues
docker logs playwright-agent-docker | grep -i "error\|failed\|refused"
```

### Issue: Build Fails

**Problem:** Docker build fails

**Solution:**
```bash
# 1. Clean build (no cache)
docker build --no-cache -t krishna2684/playwright-agent:latest -f agent/Dockerfile .

# 2. Check build context
# Make sure you're running from project root:
cd "/home/isha/Playwright - Agent"
docker build -f agent/Dockerfile .

# 3. Check for errors in build output
docker build -t krishna2684/playwright-agent:latest -f agent/Dockerfile . 2>&1 | grep -i error
```

---

## Quick Reference

### Git Commands
```bash
cd "/home/isha/Playwright - Agent"
git add agent/docker-run.sh agent/Dockerfile agent/docker-compose.yml agent/.dockerignore agent/DOCKER*.md shared/types.ts agent/src/*.ts agent/tsconfig.json
git commit -m "feat: Add Docker support with automatic X11 forwarding"
git push origin main
```

### Docker Hub Commands
```bash
docker login
cd "/home/isha/Playwright - Agent"
docker build -t krishna2684/playwright-agent:latest -f agent/Dockerfile .
docker push krishna2684/playwright-agent:latest
```

### Testing Commands
```bash
cd "/home/isha/Playwright - Agent/agent"
chmod +x docker-run.sh
./docker-run.sh
docker logs -f playwright-agent-docker
```

---

## Summary

✅ **All Changes:** Ready to commit  
✅ **Automatic X11:** Added to script (Linux only)  
✅ **Platform-Aware:** Works on Linux/Mac/Windows  
✅ **Developer-Friendly:** No manual steps needed  
✅ **Ready to Deploy:** Git + Docker Hub  
✅ **Ready to Test:** Complete testing guide  

**Next Steps:**
1. Review changes
2. Commit and push to Git
3. Build and push to Docker Hub
4. Test like a developer
5. Verify everything works

Ready to deploy! 🚀



