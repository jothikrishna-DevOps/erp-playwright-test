# Playwright Test Platform - Stakeholder Guide

## Executive Summary

The Playwright Test Platform is a production-ready internal web application that enables teams to record, store, and execute automated browser tests. The platform uses a **distributed architecture** where:

- **Centralized Control**: Web UI and backend API run on AWS EC2
- **Local Execution**: Browser tests run on developer laptops (never on EC2)
- **Real-time Communication**: WebSocket connections for instant command dispatch

### Key Business Value

1. **Centralized Test Management**: All tests stored and managed from a single web interface
2. **No Infrastructure Overhead**: No need for browser infrastructure on servers
3. **Developer-Friendly**: Tests run locally with visible browsers for debugging
4. **Enterprise-Safe**: Outbound-only connections from laptops, no SSH required
5. **Scalable**: Multiple developers can connect agents simultaneously

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 Instance                         │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Web UI     │────────▶│   Backend    │                 │
│  │  (Next.js)   │  HTTP   │   (Express)  │                 │
│  │  Port 3000   │         │  Port 3005   │                 │
│  └──────────────┘         └──────────────┘                 │
│                                    │                        │
│                                    │ WebSocket              │
│                                    │ (Port 80/443)          │
│                                    ▼                        │
│                            ┌──────────────┐                │
│                            │   SQLite DB  │                │
│                            │   + Storage  │                │
│                            └──────────────┘                │
└─────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ WebSocket
                                    │ (Outbound from laptop)
                                    │
┌─────────────────────────────────────────────────────────────┐
│              Developer Laptop (Local Machine)               │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ Local Agent  │────────▶│  Playwright  │                 │
│  │  (Node.js)   │  Exec   │   Browser    │                 │
│  │              │         │  (Visible)    │                 │
│  └──────────────┘         └──────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Core Principle

**🔐 Browser execution ONLY happens on local agent. EC2 never opens browsers.**

This ensures:
- No browser infrastructure needed on servers
- Tests run in developer's actual environment
- Visible browsers for debugging
- No screen sharing or remote desktop needed

---

## Component Breakdown

### 1. Web UI (Frontend) - `/frontend`

**Location**: AWS EC2 Instance  
**Technology**: Next.js 14, React, Tailwind CSS  
**Port**: 3000 (internal), 80/443 (public via Nginx)

#### Purpose
- Provides the user interface for managing tests
- Dashboard to view all tests
- Record page to create new tests
- Pure orchestration - never executes Playwright

#### Key Files

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard - lists all tests
│   │   ├── record/page.tsx       # Record page - create new test
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Styling (earthy tones)
│   └── lib/
│       └── api.ts                # API client for backend calls
├── package.json                  # Dependencies: next, react, axios
└── next.config.js                # Next.js configuration
```

#### How It Works

1. **Dashboard (`page.tsx`)**:
   - Fetches test list from backend API every 5 seconds
   - Displays test status, name, URL, created date
   - Provides "Run" and "Download" buttons
   - Shows status badges (pending, recording, ready, running, completed, failed)

2. **Record Page (`record/page.tsx`)**:
   - Form to enter test name, URL, and browser type
   - Sends POST request to `/api/tests/record`
   - Backend creates test record and dispatches to agent

3. **API Client (`lib/api.ts`)**:
   - Centralized HTTP client
   - Handles all backend communication
   - Uses `NEXT_PUBLIC_API_URL` environment variable

#### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
```

**Critical**: This must be set BEFORE building, as Next.js bakes it into the build.

---

### 2. Backend API - `/backend`

**Location**: AWS EC2 Instance  
**Technology**: Node.js, Express.js, SQLite, WebSocket  
**Port**: 3005 (internal), proxied via Nginx

#### Purpose
- REST API for test management
- WebSocket server for real-time agent communication
- Database for test metadata
- File storage for test files
- Command dispatcher to agents

#### Key Files

```
backend/
├── src/
│   ├── index.ts                  # Main server entry point
│   ├── db.ts                     # SQLite database operations
│   ├── websocket.ts              # WebSocket server and message handling
│   └── routes/
│       ├── index.ts              # Route setup
│       ├── tests.ts              # Test management endpoints
│       └── agents.ts             # Agent management endpoints
├── data/
│   └── platform.db               # SQLite database file
├── storage/
│   └── tests/                    # Test file storage
│       └── {testId}/
│           └── test.spec.ts
└── package.json                  # Dependencies: express, ws, sqlite3, multer
```

#### Database Schema

**Tests Table**:
```sql
CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  browser TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  file_path TEXT,
  version INTEGER DEFAULT 1
)
```

**Agents Table**:
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  last_seen DATETIME,
  current_test_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### REST API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tests` | List all tests |
| POST | `/api/tests/record` | Create new test and start recording |
| GET | `/api/tests/:id` | Get test details |
| POST | `/api/tests/:id/run` | Run a test |
| POST | `/api/tests/:id/upload` | Upload test file (agent only) |
| GET | `/api/tests/:id/download` | Download test file |
| DELETE | `/api/tests/:id` | Delete test |
| GET | `/api/agents` | List connected agents |
| GET | `/api/health` | Health check |

#### WebSocket Messages

**Backend → Agent**:
- `command:record` - Start recording a test
- `command:run` - Run a test
- `command:stop` - Stop current operation

**Agent → Backend**:
- `agent:register` - Agent registration with token
- `agent:status` - Status updates (idle, recording, running)
- `agent:heartbeat` - Keep-alive every 30 seconds

#### Environment Variables

```env
PORT=3005
NODE_ENV=production
STORAGE_PATH=/opt/playwright-platform/storage
JWT_SECRET=<generated-secret>
```

#### File Storage

Test files are stored in:
```
/opt/playwright-platform/storage/tests/{testId}/test.spec.ts
```

Each test gets its own directory for future versioning support.

---

### 3. Local Agent - `/agent`

**Location**: Developer Laptops  
**Technology**: Node.js, Playwright, WebSocket Client  
**Connection**: Outbound WebSocket to EC2

#### Purpose
- Connects to backend via WebSocket
- Receives commands from backend
- Executes Playwright locally with visible browser
- Uploads generated test files to backend
- Sends status updates in real-time

#### Key Files

```
agent/
├── src/
│   ├── index.ts                  # Agent entry point, startup logic
│   ├── agent-client.ts           # WebSocket client, command handling
│   └── config.ts                 # Configuration management
├── agent-config.json             # Auto-generated: agentId, token, name
├── temp-tests/                   # Temporary directory for test files
│   └── {testId}/
│       └── test.spec.ts          # Generated before upload
└── package.json                  # Dependencies: playwright, ws, axios
```

#### Agent Lifecycle

1. **Startup**:
   - Loads or generates `agent-config.json` (agentId, token, name)
   - Connects to backend WebSocket
   - Registers with backend
   - Starts heartbeat (every 30 seconds)

2. **Recording Flow**:
   - Receives `command:record` via WebSocket
   - Creates temp directory: `temp-tests/{testId}/`
   - Runs: `npx playwright codegen <url> --output=<file> --browser=<browser>`
   - Browser opens on local machine (visible)
   - User interacts with page
   - On browser close, file is saved
   - Agent uploads file via POST `/api/tests/:id/upload`
   - Cleans up temp directory

3. **Running Flow**:
   - Receives `command:run` via WebSocket
   - Downloads test file from backend
   - Runs: `npx playwright test <file> --headed` (or headless)
   - Sends status updates during execution
   - Cleans up downloaded file

#### Environment Variables

```env
BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
```

#### Agent Configuration

`agent-config.json` (auto-generated):
```json
{
  "agentId": "4af878b4-7d0b-40c1-81a2-d14f43b4dbb8",
  "token": "uuid-token",
  "name": "IFIYCITALT137-4af878b4"
}
```

This file persists across restarts, so the agent maintains its identity.

---

### 4. Shared Types - `/shared`

**Location**: Shared across all components  
**Technology**: TypeScript

#### Purpose
- Type definitions used by backend, frontend, and agent
- Ensures type safety across components
- Single source of truth for data structures

#### Key File

```
shared/
└── types.ts                      # All shared TypeScript interfaces
```

#### Key Types

- `Test` - Test record structure
- `Agent` - Agent information
- `WSMessage` - WebSocket message types
- `CommandRecordMessage` - Record command structure
- `CommandRunMessage` - Run command structure
- `AgentStatusMessage` - Status update structure

---

## Complete Workflows

### Workflow 1: Recording a New Test

```
1. User opens Web UI (EC2)
   └─> Dashboard page loads

2. User clicks "Record New Test"
   └─> Navigates to /record page

3. User fills form:
   - Test Name: "Login Test"
   - URL: "https://example.com"
   - Browser: "chromium"
   └─> Clicks "Start Recording"

4. Frontend sends POST /api/tests/record
   └─> Body: { name, url, browser }

5. Backend:
   - Creates test record in SQLite DB
   - Status: "pending"
   - Returns test ID

6. Backend sends WebSocket message to agent:
   └─> { type: "command:record", testId, url, browser }

7. Agent receives command:
   - Creates temp directory
   - Runs: npx playwright codegen <url> --output=<file>
   - Browser opens on developer laptop (visible)

8. User interacts with page:
   - Clicks buttons
   - Types in fields
   - Navigates pages

9. User closes browser window

10. Agent:
    - Detects file creation
    - Uploads file via POST /api/tests/:id/upload
    - Sends status: "idle"

11. Backend:
    - Saves file to storage/tests/{testId}/test.spec.ts
    - Updates DB: status = "ready", file_path = <path>

12. Frontend polls /api/tests
    └─> Test now shows status: "ready"
```

### Workflow 2: Running a Test

```
1. User clicks "Run (Visible)" on test in dashboard
   └─> Frontend sends POST /api/tests/:id/run
       Body: { mode: "visible" }

2. Backend:
   - Updates test status: "running"
   - Sends WebSocket message to agent:
     { type: "command:run", testId, mode: "visible" }

3. Agent receives command:
   - Downloads test file from GET /api/tests/:id/download
   - Saves to temp directory
   - Runs: npx playwright test <file> --headed
   - Browser opens on developer laptop (visible)

4. Test executes:
   - Playwright runs the test
   - Actions are visible in browser
   - Results are captured

5. Agent sends status updates:
   - During execution: "running"
   - On completion: "idle" with result

6. Backend updates test status:
   - "completed" (if success)
   - "failed" (if error)

7. Frontend polls /api/tests
    └─> Test shows updated status
```

---

## Deployment Architecture

### EC2 Instance Setup

**Location**: `/opt/playwright-platform/`

```
/opt/playwright-platform/
├── backend/                      # Backend application
│   ├── dist/                     # Compiled JavaScript
│   ├── data/
│   │   └── platform.db           # SQLite database
│   ├── storage/
│   │   └── tests/                 # Test file storage
│   └── .env                       # Environment variables
│
├── frontend/                     # Frontend application
│   ├── .next/                     # Next.js build output
│   ├── .env.production            # Production environment
│   └── public/                    # Static assets
│
└── shared/                        # Shared types (copied)
    └── types.ts
```

### Process Management

**PM2** manages both processes:
- `playwright-backend` - Backend API (port 3005)
- `playwright-frontend` - Frontend UI (port 3000)

**Commands**:
```bash
pm2 status                    # View process status
pm2 logs                      # View logs
pm2 restart playwright-backend
pm2 restart playwright-frontend
```

### Nginx Reverse Proxy

**Configuration**: `/etc/nginx/conf.d/playwright-platform.conf`

Routes:
- `/` → Frontend (port 3000)
- `/api/*` → Backend API (port 3005)
- `/ws` → WebSocket upgrade to Backend (port 3005)

**WebSocket Support**:
- Upgrades HTTP connections to WebSocket
- Handles agent connections from laptops

### Network Flow

```
Internet
  │
  ▼
EC2 Security Group (Port 80/443)
  │
  ▼
Nginx (Port 80)
  │
  ├─→ Frontend (Port 3000) - HTTP
  │
  └─→ Backend (Port 3005) - HTTP + WebSocket
      │
      ├─→ SQLite Database
      │
      └─→ File Storage
```

**Agent Connection** (from laptop):
```
Developer Laptop
  │
  │ Outbound WebSocket
  │
  ▼
EC2 Security Group (Port 80/443)
  │
  ▼
Nginx (WebSocket upgrade)
  │
  ▼
Backend WebSocket Server (Port 3005)
```

---

## File Paths Reference

### Development (Local)

```
/home/isha/Playwright - Agent/
├── backend/
│   ├── src/                       # TypeScript source
│   ├── data/platform.db          # Local database
│   └── storage/                  # Local storage
│
├── frontend/
│   ├── src/                      # React components
│   └── .next/                    # Build output
│
├── agent/
│   ├── src/                      # Agent source
│   └── temp-tests/               # Temporary test files
│
└── shared/
    └── types.ts                  # Shared types
```

### Production (EC2)

```
/opt/playwright-platform/
├── backend/
│   ├── dist/                     # Compiled backend
│   ├── data/platform.db          # Production database
│   └── storage/tests/            # Test file storage
│
├── frontend/
│   ├── .next/                    # Built frontend
│   └── .env.production           # Production config
│
└── shared/
    └── types.ts                  # Shared types
```

### Agent (Local Laptop)

```
/home/isha/Playwright - Agent/agent/
├── src/                          # Agent source code
├── agent-config.json             # Agent identity
├── temp-tests/                   # Temporary files
│   └── {testId}/
│       └── test.spec.ts
└── .env                          # Backend URL config
```

---

## Security Model

### Authentication

1. **Agent Authentication**:
   - Agent generates UUID token on first run
   - Token stored in `agent-config.json`
   - Token sent in WebSocket registration
   - Backend validates token

2. **No User Authentication** (Current):
   - UI is open (can be added later)
   - Agent authentication is primary security layer

### Network Security

1. **Outbound-Only Connections**:
   - Agent initiates all connections
   - No inbound ports needed on laptops
   - Works through firewalls/NAT

2. **WebSocket Security**:
   - Token-based authentication
   - No shell execution from backend
   - Limited command set (record, run, stop)

3. **File Upload Security**:
   - Only agents can upload (token required)
   - Files stored in isolated directories
   - Path sanitization

### Data Security

1. **Database**:
   - SQLite file with proper permissions
   - No sensitive data stored (just test metadata)

2. **File Storage**:
   - Test files stored on EC2
   - Isolated per test ID
   - Can be encrypted at rest (future)

---

## Production Considerations

### Scalability

**Current Capacity**:
- Multiple agents can connect simultaneously
- Each agent handles one test at a time
- Backend can handle multiple concurrent tests

**Limitations**:
- SQLite database (can migrate to PostgreSQL for scale)
- Single EC2 instance (can add load balancer)
- No horizontal scaling of backend (stateless, can scale)

### Monitoring

**Current**:
- PM2 process monitoring
- Nginx access logs
- Application logs via PM2

**Recommended Additions**:
- Application performance monitoring (APM)
- Error tracking (Sentry)
- Database backup automation
- Health check endpoints

### Backup Strategy

**Database**:
- SQLite file: `/opt/playwright-platform/backend/data/platform.db`
- Backup daily to S3

**Test Files**:
- Storage directory: `/opt/playwright-platform/backend/storage/tests/`
- Backup to S3 (can use lifecycle policies)

### High Availability

**Current**: Single EC2 instance (single point of failure)

**Improvements**:
- Multi-AZ deployment
- Database replication
- Load balancer for multiple instances
- Auto-scaling group

### Maintenance

**Regular Tasks**:
- Update dependencies (monthly)
- Review and clean old tests
- Monitor disk space
- Review logs for errors

**Deployment Process**:
1. Git pull on EC2
2. Run `./deploy/deploy.sh`
3. PM2 restarts processes
4. Verify health endpoints

---

## Troubleshooting Guide

### Common Issues

1. **Agent Not Connecting**:
   - Check EC2 security group (port 80/443 open)
   - Verify agent `.env` has correct backend URL
   - Check backend logs: `pm2 logs playwright-backend`
   - Verify WebSocket endpoint: `/ws`

2. **Browser Not Opening**:
   - Install Playwright browsers: `npx playwright install`
   - Check DISPLAY variable (Linux): `echo $DISPLAY`
   - Verify agent is running and connected

3. **Test File Not Uploading**:
   - Check agent logs for upload errors
   - Verify backend storage directory permissions
   - Check network connectivity from laptop to EC2

4. **Frontend Shows Connection Errors**:
   - Verify `NEXT_PUBLIC_API_URL` was set before build
   - Rebuild frontend if environment changed
   - Check backend is running: `pm2 status`

5. **Database Errors**:
   - Check file permissions: `ls -la /opt/playwright-platform/backend/data/`
   - Verify SQLite is accessible
   - Check disk space: `df -h`

---

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Frontend | Next.js | 14.0.4 | React framework, SSR |
| Frontend | React | 18.x | UI library |
| Frontend | Tailwind CSS | Latest | Styling |
| Backend | Node.js | 18+ | Runtime |
| Backend | Express.js | Latest | Web framework |
| Backend | SQLite | 3.x | Database |
| Backend | WebSocket (ws) | Latest | Real-time communication |
| Agent | Node.js | 18+ | Runtime |
| Agent | Playwright | Latest | Browser automation |
| Deployment | PM2 | Latest | Process management |
| Deployment | Nginx | Latest | Reverse proxy |
| Infrastructure | AWS EC2 | - | Server hosting |

---

## Cost Estimation

### EC2 Instance
- **Type**: t3.medium or t3.large (recommended)
- **Cost**: ~$30-60/month (depending on region)
- **Storage**: 20GB EBS volume (included)

### Bandwidth
- **Inbound**: Free
- **Outbound**: First 100GB free, then ~$0.09/GB

### Total Estimated Cost
- **Monthly**: ~$30-60 (EC2 only)
- **No additional costs** for agents (run on developer laptops)

---

## Future Enhancements

1. **User Authentication**: Add login system for UI
2. **Test Scheduling**: Cron-like scheduling for tests
3. **Test Reports**: Detailed execution reports with screenshots
4. **CI/CD Integration**: Webhook support for CI pipelines
5. **Multi-Browser Testing**: Run same test on multiple browsers
6. **Test Versioning**: Track test file changes over time
7. **Team Management**: User roles and permissions
8. **Database Migration**: Move from SQLite to PostgreSQL
9. **Monitoring Dashboard**: Real-time metrics and alerts
10. **Test Sharing**: Share tests between team members

---

## Support and Maintenance

### Documentation
- **EC2_DEPLOYMENT_GUIDE.md**: Complete EC2 setup steps
- **AGENT_SETUP_GUIDE.md**: Local agent setup guide
- **ARCHITECTURE.md**: Technical architecture details
- **This Document**: Stakeholder overview

### Key Contacts
- **Development Team**: [Your team contact]
- **Infrastructure**: [AWS/DevOps contact]
- **Support**: [Support channel]

### Change Management
- All changes tracked in Git
- Deployment via `deploy/deploy.sh` script
- Rollback: Restore previous Git commit and redeploy

---

## Conclusion

The Playwright Test Platform provides a production-ready solution for managing browser tests with a distributed architecture that keeps browser execution on developer machines while maintaining centralized control and storage. The system is designed for enterprise use with security, scalability, and maintainability in mind.

**Key Strengths**:
- ✅ No browser infrastructure on servers
- ✅ Developer-friendly visible browser execution
- ✅ Centralized test management
- ✅ Enterprise-safe outbound-only connections
- ✅ Production-ready deployment

**Ready for Production**: ✅ Yes, with recommended monitoring and backup additions.

