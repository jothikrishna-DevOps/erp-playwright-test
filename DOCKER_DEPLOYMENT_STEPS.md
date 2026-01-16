# Quick Docker Deployment Steps

## Step 1: Commit to Git

```bash
cd "/home/isha/Playwright - Agent"

# Add all Docker-related changes
git add agent/docker-run.sh
git add agent/Dockerfile
git add agent/docker-compose.yml
git add agent/.dockerignore
git add agent/DOCKER_*.md
git add shared/types.ts
git add agent/src/config.ts
git add agent/src/index.ts
git add agent/src/agent-client.ts
git add agent/tsconfig.json

# Commit
git commit -m "feat: Add Docker support with platform-aware X11 forwarding"

# Push
git push origin main
```

## Step 2: Push to Docker Hub (Optional)

```bash
# Login to Docker Hub
docker login

# Set your username
export DOCKERHUB_USERNAME="YOUR_USERNAME"

# Build image
cd "/home/isha/Playwright - Agent"
docker build -t $DOCKERHUB_USERNAME/playwright-agent:latest -f agent/Dockerfile .

# Push to Docker Hub
docker push $DOCKERHUB_USERNAME/playwright-agent:latest
```

## Step 3: Test on Other Systems

### On Linux:
```bash
git clone <your-repo>
cd <repo>/agent
xhost +local:docker  # One-time setup
./docker-run.sh
```

### On Mac/Windows:
```bash
git clone <your-repo>
cd <repo>/agent
chmod +x docker-run.sh
./docker-run.sh
```

## Notes

- **Backend (EC2):** No changes needed - already supports Docker agents
- **X11 Forwarding:** Automatic on Linux, handled by Docker Desktop on Mac/Windows
- **Platform-aware:** Script detects OS and configures accordingly



