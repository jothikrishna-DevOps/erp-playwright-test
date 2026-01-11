#!/bin/bash

# Docker Agent Startup Script
# This script builds and runs the Playwright agent in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Playwright Docker Agent Setup${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop first.${NC}"
    exit 1
fi

# Check if docker-compose is available and working
USE_COMPOSE=false
COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    # Test if docker-compose actually works (handles Python 3.12 compatibility issues)
    if docker-compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
        USE_COMPOSE=true
    fi
fi

# If docker-compose doesn't work, try docker compose (v2)
if [ "$USE_COMPOSE" = false ]; then
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
        USE_COMPOSE=true
    fi
fi

if [ "$USE_COMPOSE" = true ]; then
    echo -e "${GREEN}✅ Using: $COMPOSE_CMD${NC}"
else
    echo -e "${YELLOW}⚠️  docker-compose not available or not working.${NC}"
    echo -e "${YELLOW}   Using direct Docker commands instead...${NC}"
fi

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo -e "${YELLOW}📄 Loading environment variables from .env file${NC}"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check for required environment variables
if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  BACKEND_URL not set. Using default from docker-compose.yml${NC}"
fi

if [ -z "$WS_URL" ]; then
    echo -e "${YELLOW}⚠️  WS_URL not set. Using default from docker-compose.yml${NC}"
fi

# Get script directory (agent directory)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get parent directory (for Docker build context)
PARENT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to agent directory first
cd "$SCRIPT_DIR"

# Set default paths if not provided (relative to agent directory)
HOST_WORKSPACE_PATH=${HOST_WORKSPACE_PATH:-$SCRIPT_DIR/workspace}
HOST_CONFIG_PATH=${HOST_CONFIG_PATH:-$SCRIPT_DIR/config}

# Convert to absolute paths
HOST_WORKSPACE_PATH=$(cd "$(dirname "$HOST_WORKSPACE_PATH")" && pwd)/$(basename "$HOST_WORKSPACE_PATH")
HOST_CONFIG_PATH=$(cd "$(dirname "$HOST_CONFIG_PATH")" && pwd)/$(basename "$HOST_CONFIG_PATH")

# Create directories if they don't exist
echo -e "${GREEN}📁 Creating workspace and config directories...${NC}"
mkdir -p "$HOST_WORKSPACE_PATH"
mkdir -p "$HOST_CONFIG_PATH"

if [ "$USE_COMPOSE" = true ]; then
    # Use docker-compose
    export HOST_WORKSPACE_PATH
    export HOST_CONFIG_PATH

    echo -e "${GREEN}📦 Building Docker image...${NC}"
    $COMPOSE_CMD build

    echo -e "\n${GREEN}🚀 Starting Docker container...${NC}"
    echo -e "${YELLOW}   Workspace: $HOST_WORKSPACE_PATH${NC}"
    echo -e "${YELLOW}   Config: $HOST_CONFIG_PATH${NC}"
    echo ""

    $COMPOSE_CMD up -d

    echo -e "\n${GREEN}✅ Agent container started!${NC}"
    echo -e "${YELLOW}📋 Useful commands:${NC}"
    echo -e "   View logs: ${GREEN}docker logs -f playwright-agent-docker${NC}"
    echo -e "   Stop: ${GREEN}$COMPOSE_CMD down${NC}"
    echo -e "   Restart: ${GREEN}$COMPOSE_CMD restart${NC}"
    echo -e "   Status: ${GREEN}$COMPOSE_CMD ps${NC}"
else
    # Use direct Docker commands
    IMAGE_NAME="playwright-agent:latest"
    CONTAINER_NAME="playwright-agent-docker"

    # Set default environment variables
    BACKEND_URL=${BACKEND_URL:-http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com}
    WS_URL=${WS_URL:-ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com}

    echo -e "${GREEN}📦 Building Docker image...${NC}"
    docker build -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile" "$PARENT_DIR"

    echo -e "\n${GREEN}🚀 Starting Docker container...${NC}"
    echo -e "${YELLOW}   Workspace: $HOST_WORKSPACE_PATH${NC}"
    echo -e "${YELLOW}   Config: $HOST_CONFIG_PATH${NC}"
    echo -e "${YELLOW}   Backend: $BACKEND_URL${NC}"
    echo ""

    # Stop and remove existing container if it exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${YELLOW}⚠️  Removing existing container...${NC}"
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi

    # Automatically enable X11 access for Docker on Linux (if needed)
    # Mac/Windows use Docker Desktop which handles GUI automatically
    X11_ARGS=""
    if [ -d /tmp/.X11-unix ] && [ -n "$DISPLAY" ]; then
        echo -e "${GREEN}✅ Detected Linux with X11 - enabling X11 forwarding${NC}"
        # Try to automatically enable X11 access for Docker containers
        if command -v xhost &> /dev/null; then
            if xhost +local:docker 2>/dev/null; then
                echo -e "${GREEN}✅ Enabled X11 access for Docker automatically${NC}"
            else
                echo -e "${YELLOW}⚠️  Could not enable X11 access automatically (may already be set)${NC}"
                echo -e "${YELLOW}   If browser doesn't open, run: ${GREEN}xhost +local:docker${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  xhost command not found - X11 access may not work${NC}"
            echo -e "${YELLOW}   Install x11-xserver-utils or run: ${GREEN}xhost +local:docker${NC}"
        fi
        X11_ARGS="-e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix:rw"
    else
        echo -e "${GREEN}✅ Detected Mac/Windows - Docker Desktop will handle GUI automatically${NC}"
    fi

    # Run the container
    docker run -d \
        --name "$CONTAINER_NAME" \
        --platform linux/amd64 \
        --restart unless-stopped \
        -e BACKEND_URL="$BACKEND_URL" \
        -e WS_URL="$WS_URL" \
        -e WORKSPACE_PATH=/workspace \
        -e AGENT_CONFIG_PATH=/config/agent-config.json \
        -e FORCE_CHROMIUM=true \
        -e DOCKER=true \
        $X11_ARGS \
        -v "$HOST_WORKSPACE_PATH:/workspace" \
        -v "$HOST_CONFIG_PATH:/config" \
        "$IMAGE_NAME"

    echo -e "\n${GREEN}✅ Agent container started!${NC}"
    echo -e "${YELLOW}📋 Useful commands:${NC}"
    echo -e "   View logs: ${GREEN}docker logs -f $CONTAINER_NAME${NC}"
    echo -e "   Stop: ${GREEN}docker stop $CONTAINER_NAME${NC}"
    echo -e "   Start: ${GREEN}docker start $CONTAINER_NAME${NC}"
    echo -e "   Restart: ${GREEN}docker restart $CONTAINER_NAME${NC}"
    echo -e "   Remove: ${GREEN}docker rm -f $CONTAINER_NAME${NC}"
    echo -e "   Status: ${GREEN}docker ps | grep $CONTAINER_NAME${NC}"
fi

echo ""

# Show logs
echo -e "${GREEN}📋 Container logs (press Ctrl+C to exit):${NC}\n"
docker logs -f playwright-agent-docker

