# EC2 Deployment Guide - Complete Step-by-Step

This document contains the complete, tested steps for deploying the Playwright Test Platform to EC2 using Session Manager.

## Prerequisites

- EC2 instance running (Amazon Linux 2 or Ubuntu)
- Access via AWS Session Manager
- Git repository: `https://github.com/jothikrishna-DevOps/erp-playwright-test.git`
- EC2 Public DNS: `ec2-13-235-76-91.ap-south-1.compute.amazonaws.com` (replace with yours)

## Architecture

```
Users → nginx (Port 80) → Frontend (Port 3000) + Backend (Port 3005)
                                      ↓
                              WebSocket → Local Agents
```

## Step 1: Connect to EC2 via Session Manager

1. Go to AWS Console → EC2 → Select your instance
2. Click "Connect" → "Session Manager"
3. Click "Connect"

You'll have a terminal session on your EC2 instance.

## Step 2: Clone Repository

```bash
# Install git if needed
sudo yum install git -y  # Amazon Linux
# or
sudo apt-get update && sudo apt-get install git -y  # Ubuntu

# Clone repository (replace YOUR_TOKEN with GitHub personal access token)
cd ~
git clone https://YOUR_TOKEN@github.com/jothikrishna-DevOps/erp-playwright-test.git

# Navigate to repository
cd erp-playwright-test

# Verify files are there
ls -la
ls -la deploy/
```

**Note:** If you don't have a GitHub Personal Access Token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when cloning

## Step 3: Run Initial Setup

```bash
# Make setup script executable
chmod +x deploy/ec2-setup.sh

# Run initial setup (installs Node.js, PM2, nginx)
./deploy/ec2-setup.sh
```

This will:
- Install Node.js 18+ (may show deprecation warning - safe to ignore)
- Install PM2 globally
- Install nginx
- Create deployment directories
- Configure firewall

**Expected output:**
```
✅ Node.js version: v18.x.x
✅ PM2 version: x.x.x
✅ nginx installed
✅ Deployment directory created
✅ EC2 setup complete!
```

## Step 4: Get EC2 DNS

```bash
# Get your EC2 public DNS (replace with actual if command doesn't work)
EC2_DNS=$(curl -s http://169.254.169.254/latest/meta-data/public-hostname)

# If empty, get from AWS Console or use:
EC2_DNS="ec2-13-235-76-91.ap-south-1.compute.amazonaws.com"  # Replace with yours

echo "EC2 DNS: $EC2_DNS"
```

**Note:** If the metadata command returns empty, get the DNS from:
- AWS Console → EC2 → Your instance → Details tab → Public IPv4 DNS

## Step 5: Create Environment Files

```bash
# Create backend environment file
sudo mkdir -p /opt/playwright-platform/backend
sudo tee /opt/playwright-platform/backend/.env > /dev/null << EOF
PORT=3005
NODE_ENV=production
STORAGE_PATH=/opt/playwright-platform/storage
JWT_SECRET=$(openssl rand -base64 32)
EOF

# Create frontend environment file in SOURCE (before building)
# This is critical - Next.js bakes NEXT_PUBLIC_* vars at build time
cd ~/erp-playwright-test
EC2_DNS="ec2-13-235-76-91.ap-south-1.compute.amazonaws.com"  # Replace with yours
cat > frontend/.env.production << EOF
NEXT_PUBLIC_API_URL=http://${EC2_DNS}
EOF

# Also create in deployment directory (for reference)
sudo mkdir -p /opt/playwright-platform/frontend
sudo tee /opt/playwright-platform/frontend/.env.production > /dev/null << EOF
NEXT_PUBLIC_API_URL=http://${EC2_DNS}
EOF

# Verify files created
cat ~/erp-playwright-test/frontend/.env.production
cat /opt/playwright-platform/backend/.env
cat /opt/playwright-platform/frontend/.env.production
```

**Critical:** The frontend `.env.production` MUST be created in the source directory (`~/erp-playwright-test/frontend/.env.production`) BEFORE running the build. Next.js bakes `NEXT_PUBLIC_*` environment variables at build time. If you create it after building, you must rebuild the frontend.

**Important:** Replace `${EC2_DNS}` with your actual EC2 DNS if the variable wasn't set.

## Step 6: Fix TypeScript Configuration Issues

### Fix Backend TypeScript Config

```bash
cd ~/erp-playwright-test/backend

# Backup original
cp tsconfig.json tsconfig.json.backup

# Create fixed tsconfig.json (removes rootDir restriction)
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "../shared/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### Fix Frontend TypeScript Config

```bash
cd ~/erp-playwright-test

# Copy shared folder into frontend (required for imports)
cp -r shared frontend/shared

# Verify
ls -la frontend/shared/
```

## Step 7: Create Frontend Environment Before Building

**IMPORTANT:** Next.js bakes `NEXT_PUBLIC_*` environment variables at build time. You MUST create the frontend `.env.production` file BEFORE building, or rebuild after creating it.

```bash
# Go to repository root
cd ~/erp-playwright-test

# Create frontend .env.production in SOURCE (before building)
EC2_DNS="ec2-13-235-76-91.ap-south-1.compute.amazonaws.com"  # Replace with yours
cat > frontend/.env.production << EOF
NEXT_PUBLIC_API_URL=http://${EC2_DNS}
EOF

# Verify
cat frontend/.env.production
```

**Critical:** If you create the environment file after building, you MUST rebuild the frontend for it to take effect.

## Step 8: Build and Deploy

```bash
# Go to repository root
cd ~/erp-playwright-test

# Make deploy script executable
chmod +x deploy/deploy.sh

# Run deployment (builds and deploys)
./deploy/deploy.sh
```

This will:
- Build backend (TypeScript → JavaScript)
- Build frontend (Next.js production build) - **uses .env.production from source**
- Copy files to `/opt/playwright-platform`
- Install production dependencies
- Start PM2 processes

**Note:** If frontend shows "failed to fetch" or uses `localhost:3005`, the frontend was built before the environment variable was set. Rebuild:
```bash
cd ~/erp-playwright-test/frontend
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
EOF
npm run build
cd ~/erp-playwright-test
./deploy/deploy.sh
pm2 restart playwright-frontend
```

**Expected output:**
```
✅ Backend built
✅ Frontend built
✅ Files copied
✅ PM2 processes restarted
✅ Deployment complete!
```

**PM2 Status should show:**
```
│ 0  │ playwright-backend     │ online    │
│ 1  │ playwright-frontend    │ online    │
```

## Step 9: Configure nginx

### Fix nginx Hash Bucket Size

```bash
# Add server_names_hash_bucket_size to main nginx.conf
sudo sed -i '/^http {/a\    server_names_hash_bucket_size 128;' /etc/nginx/nginx.conf

# Verify it was added
grep server_names_hash_bucket_size /etc/nginx/nginx.conf
```

### Configure nginx for Application

```bash
# Copy nginx configuration
sudo cp ~/erp-playwright-test/deploy/nginx.conf /etc/nginx/conf.d/playwright-platform.conf

# Update with your EC2 DNS (replace with your actual DNS)
EC2_DNS="ec2-13-235-76-91.ap-south-1.compute.amazonaws.com"
sudo sed -i "s/<EC2-DNS>/$EC2_DNS/g" /etc/nginx/conf.d/playwright-platform.conf

# Test nginx configuration
sudo nginx -t

# If successful, restart nginx
sudo systemctl restart nginx

# Enable nginx to start on boot
sudo systemctl enable nginx
```

**Expected output from `nginx -t`:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Step 10: Verify Deployment

### Check Services

```bash
# Check PM2 processes
pm2 status

# Check nginx status
sudo systemctl status nginx

# Test backend API directly
curl http://localhost:3005/api/health

# Test backend via nginx
curl http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2025-12-30T..."}
```

### Test in Browser

Open in your browser:
```
http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
```

You should see the Playwright Test Platform dashboard.

## Step 11: Configure Local Agent

On your local development machine:

```bash
cd "/home/isha/Playwright - Agent/agent"

# Create .env file
cat > .env << EOF
BACKEND_URL=http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
WS_URL=ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
EOF

# Start agent
npm run dev
```

**Expected output:**
```
📡 Connecting to backend: http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com
🔌 Connecting to WebSocket: ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws
✅ WebSocket connected
✅ Agent registration confirmed
```

## Troubleshooting

### Issue: TypeScript build errors

**Problem:** `File is not under 'rootDir'` error

**Solution:**
1. Fix backend `tsconfig.json` (remove `rootDir` restriction) - see Step 6
2. Copy `shared` folder into `frontend` - see Step 6

### Issue: nginx hash bucket size error

**Problem:** `could not build server_names_hash, you should increase server_names_hash_bucket_size`

**Solution:**
```bash
sudo sed -i '/^http {/a\    server_names_hash_bucket_size 128;' /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
```

### Issue: Services not starting

**Check logs:**
```bash
pm2 logs
pm2 logs playwright-backend
pm2 logs playwright-frontend
```

**Restart services:**
```bash
pm2 restart all
```

### Issue: Frontend can't connect to backend

**Check:**
1. Backend is running: `pm2 status`
2. Environment variable is set: `cat /opt/playwright-platform/frontend/.env.production`
3. Backend API is accessible: `curl http://localhost:3005/api/health`

### Issue: Agent can't connect

**Check:**
1. EC2 Security Group allows inbound on port 80
2. nginx is running: `sudo systemctl status nginx`
3. WebSocket endpoint works: Test with `wscat -c ws://YOUR_EC2_DNS/ws`

## Useful Commands

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs playwright-backend
pm2 logs playwright-frontend

# Restart services
pm2 restart all
pm2 restart playwright-backend

# Stop services
pm2 stop all

# Delete services
pm2 delete all

# Monitor
pm2 monit
```

### nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Application Logs

```bash
# PM2 logs
pm2 logs --lines 50

# Application logs
tail -f /var/log/playwright-platform/backend.log
tail -f /var/log/playwright-platform/frontend.log
```

## Updating Deployment

When you make changes to the code:

```bash
# On local machine - commit and push
cd "/home/isha/Playwright - Agent"
git add .
git commit -m "Your update message"
git push

# On EC2 - pull and redeploy
cd ~/erp-playwright-test
git pull
./deploy/deploy.sh
```

## File Locations

### Source Code
- Repository: `~/erp-playwright-test/`
- Backend source: `~/erp-playwright-test/backend/src/`
- Frontend source: `~/erp-playwright-test/frontend/src/`

### Deployed Files
- Deployment directory: `/opt/playwright-platform/`
- Backend: `/opt/playwright-platform/backend/`
- Frontend: `/opt/playwright-platform/frontend/`
- Storage: `/opt/playwright-platform/storage/`
- Database: `/opt/playwright-platform/data/platform.db`

### Configuration Files
- Backend env: `/opt/playwright-platform/backend/.env`
- Frontend env: `/opt/playwright-platform/frontend/.env.production`
- PM2 config: `/opt/playwright-platform/ec2.config.js`
- nginx config: `/etc/nginx/conf.d/playwright-platform.conf`

## Security Checklist

- [ ] EC2 Security Group configured (ports 22, 80, 443)
- [ ] JWT_SECRET is a strong random string
- [ ] Environment files have correct permissions
- [ ] nginx is running and configured
- [ ] PM2 processes are running
- [ ] Firewall rules are set (if using firewalld/ufw)

## Post-Deployment Verification

- [ ] Frontend loads at `http://YOUR_EC2_DNS`
- [ ] Backend API responds at `http://YOUR_EC2_DNS/api/health`
- [ ] Dashboard shows in browser
- [ ] Local agent connects successfully
- [ ] Test recording works end-to-end
- [ ] Test files are saved correctly

## Summary

Your Playwright Test Platform is now deployed and accessible at:
- **Frontend:** `http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com`
- **Backend API:** `http://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/api`
- **WebSocket:** `ws://ec2-13-235-76-91.ap-south-1.compute.amazonaws.com/ws`

Replace the DNS with your actual EC2 DNS when following this guide.

## Notes

- Node.js 18 deprecation warning is safe to ignore
- TypeScript config fixes are required due to shared folder structure
- nginx hash bucket size must be increased for long DNS names
- Environment files must be created before first deployment
- Shared folder must be copied into frontend for imports to work

---

**Last Updated:** December 30, 2025
**Tested on:** Amazon Linux 2 / Ubuntu
**Deployment Method:** AWS Session Manager + Git

