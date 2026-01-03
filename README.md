# Playwright Test Platform

Production-ready internal web platform for recording and running Playwright tests with visible browser control on local machines.

## 🏗 Architecture Overview

### Components

1. **Web UI (Centralized on EC2)**
   - Next.js React application
   - Dashboard and Record pages
   - Pure orchestration layer
   - Never executes Playwright

2. **Backend API (Centralized on EC2)**
   - Express.js REST API
   - WebSocket server for real-time communication
   - SQLite database for test storage
   - Agent command dispatcher

3. **Local Agent (Developer Laptops)**
   - Node.js application
   - Executes Playwright with visible browser
   - Connects to backend via WebSocket
   - Uploads test files

### 🔐 Core Rule

**Browser execution ONLY happens on local agent. EC2 never opens browsers.**

## 📂 Project Structure

```
.
├── backend/          # Express API server
├── frontend/         # Next.js UI
├── agent/            # Local agent application
├── shared/           # Shared TypeScript types
└── docs/             # Architecture documentation
```

## 🚀 Tech Stack

- **Backend**: Node.js + Express + SQLite + WebSocket
- **Frontend**: Next.js + React + Tailwind CSS
- **Agent**: Node.js + Playwright
- **Communication**: WebSocket (real-time) + HTTP REST
- **Authentication**: JWT tokens

## 🏃 Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Agent
```bash
cd agent
npm install
npm start
```

### EC2 Deployment

For complete EC2 deployment instructions, see:
- **[EC2_DEPLOYMENT_GUIDE.md](./EC2_DEPLOYMENT_GUIDE.md)** - Step-by-step guide with all tested steps
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment documentation

### Agent Setup

For local agent setup instructions, see:
- **[AGENT_SETUP_GUIDE.md](./AGENT_SETUP_GUIDE.md)** - Complete agent setup guide
- [agent/EC2_SETUP.md](./agent/EC2_SETUP.md) - Agent configuration for EC2

## 📡 Communication Protocol

### Agent → Backend
- WebSocket connection (outbound from agent)
- HTTP POST for file uploads
- Heartbeat every 30s

### Backend → Agent
- WebSocket messages for commands
- Commands: `record`, `run`, `stop`

### UI → Backend
- REST API for all operations
- WebSocket for real-time updates

## 🔒 Security

- Token-based authentication
- Agent authenticates with backend
- Outbound-only connections from agent
- No shell execution from backend
- Limited command set

