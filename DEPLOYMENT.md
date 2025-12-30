# EC2 Deployment Guide

Complete guide for deploying the Playwright Test Platform to EC2.

## Prerequisites

- EC2 instance running (Amazon Linux 2, Ubuntu, or similar)
- SSH access to EC2 instance
- EC2 security group configured (ports 22, 80, 443)
- Your project code ready to deploy

## Architecture

```
Users → nginx (Port 80/443) → Frontend (Port 3000) + Backend (Port 3005)
                                      ↓
                              WebSocket → Local Agents
```

## Step 1: Initial EC2 Setup

### 1.1 Connect to EC2

```bash
ssh -i your-key.pem ec2-user@<EC2-DNS>
# or
ssh -i your-key.pem ubuntu@<EC2-DNS>
```

### 1.2 Run Initial Setup Script

Upload the project to EC2, then run:

```bash
cd /path/to/playwright-platform
chmod +x deploy/ec2-setup.sh
./deploy/ec2-setup.sh
```

This will:
- Install Node.js 18+
- Install PM2 globally
- Install nginx
- Create deployment directories
- Configure firewall

## Step 2: Configure Environment Variables

### 2.1 Backend Environment

Create `/opt/playwright-platform/backend/.env`:

```bash
sudo mkdir -p /opt/playwright-platform/backend
sudo nano /opt/playwright-platform/backend/.env
```

Add:
```env
PORT=3005
NODE_ENV=production
STORAGE_PATH=/opt/playwright-platform/storage
JWT_SECRET=your-secure-random-string-here
```

**Important:** Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

### 2.2 Frontend Environment

Create `/opt/playwright-platform/frontend/.env.production`:

```bash
sudo mkdir -p /opt/playwright-platform/frontend
sudo nano /opt/playwright-platform/frontend/.env.production
```

Add (replace `<EC2-DNS>` with your actual DNS):
```env
NEXT_PUBLIC_API_URL=http://<EC2-DNS>
```

Example:
```env
NEXT_PUBLIC_API_URL=http://ec2-54-123-45-67.compute-1.amazonaws.com
```

## Step 3: Deploy Application

### 3.1 Upload Project to EC2

From your local machine:

```bash
# Using SCP
scp -i your-key.pem -r "Playwright - Agent" ec2-user@<EC2-DNS>:~/

# Or use git
git clone <your-repo-url>
```

### 3.2 Run Deployment Script

On EC2:

```bash
cd ~/Playwright\ -\ Agent
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

This will:
- Build backend (TypeScript → JavaScript)
- Build frontend (Next.js production build)
- Copy files to `/opt/playwright-platform`
- Install production dependencies
- Start PM2 processes

## Step 4: Configure nginx

### 4.1 Copy nginx Configuration

```bash
sudo cp deploy/nginx.conf /etc/nginx/conf.d/playwright-platform.conf
```

### 4.2 Edit nginx Configuration

```bash
sudo nano /etc/nginx/conf.d/playwright-platform.conf
```

Replace `<EC2-DNS>` with your actual EC2 DNS name or IP:

```nginx
server_name ec2-54-123-45-67.compute-1.amazonaws.com;
```

### 4.3 Test nginx Configuration

```bash
sudo nginx -t
```

### 4.4 Start/Restart nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl restart nginx
```

## Step 5: Start Services with PM2

### 5.1 Start Services

```bash
cd /opt/playwright-platform
pm2 start ec2.config.js
```

### 5.2 Save PM2 Configuration

```bash
pm2 save
pm2 startup  # Follow instructions to enable auto-start on boot
```

### 5.3 Check Status

```bash
pm2 status
pm2 logs
```

You should see:
- `playwright-backend` running
- `playwright-frontend` running

## Step 6: Verify Deployment

### 6.1 Test Backend API

```bash
curl http://localhost:3005/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### 6.2 Test Frontend

Open in browser: `http://<EC2-DNS>`

You should see the Playwright Test Platform dashboard.

### 6.3 Test via nginx

```bash
curl http://<EC2-DNS>/api/health
```

Should return the same health check response.

## Step 7: Configure Local Agent

See [agent/EC2_SETUP.md](agent/EC2_SETUP.md) for detailed instructions.

Quick setup:

1. Create `agent/.env`:
```env
BACKEND_URL=http://<EC2-DNS>
WS_URL=ws://<EC2-DNS>/ws
```

2. Start agent:
```bash
cd agent
npm run dev
```

## PM2 Management Commands

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
pm2 restart playwright-frontend

# Stop services
pm2 stop all

# Delete services
pm2 delete all

# Monitor
pm2 monit
```

## nginx Management Commands

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

## Troubleshooting

### Services Not Starting

1. **Check PM2 logs:**
   ```bash
   pm2 logs
   ```

2. **Check if ports are in use:**
   ```bash
   sudo lsof -i :3000
   sudo lsof -i :3005
   ```

3. **Check file permissions:**
   ```bash
   ls -la /opt/playwright-platform
   sudo chown -R $USER:$USER /opt/playwright-platform
   ```

### Frontend Not Loading

1. **Check frontend build:**
   ```bash
   ls -la /opt/playwright-platform/frontend/.next
   ```

2. **Check frontend logs:**
   ```bash
   pm2 logs playwright-frontend
   ```

3. **Verify environment variable:**
   ```bash
   cat /opt/playwright-platform/frontend/.env.production
   ```

### Backend API Not Responding

1. **Check backend logs:**
   ```bash
   pm2 logs playwright-backend
   ```

2. **Test backend directly:**
   ```bash
   curl http://localhost:3005/api/health
   ```

3. **Check database:**
   ```bash
   ls -la /opt/playwright-platform/data/
   ```

### WebSocket Not Working

1. **Check nginx WebSocket config:**
   ```bash
   sudo grep -A 10 "/ws" /etc/nginx/conf.d/playwright-platform.conf
   ```

2. **Test WebSocket connection:**
   ```bash
   # Install wscat: npm install -g wscat
   wscat -c ws://<EC2-DNS>/ws
   ```

3. **Check backend WebSocket logs:**
   ```bash
   pm2 logs playwright-backend | grep -i websocket
   ```

### nginx 502 Bad Gateway

1. **Check if services are running:**
   ```bash
   pm2 status
   ```

2. **Check nginx error log:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Verify upstream servers:**
   ```bash
   curl http://localhost:3000
   curl http://localhost:3005/api/health
   ```

## Security Considerations

### 1. Firewall Configuration

Ensure EC2 Security Group allows:
- Port 22 (SSH) - from your IP only
- Port 80 (HTTP) - from anywhere (or specific IPs)
- Port 443 (HTTPS) - from anywhere (if using SSL)

### 2. SSL/HTTPS Setup (Recommended)

1. **Get SSL certificate** (Let's Encrypt, AWS Certificate Manager, etc.)

2. **Update nginx config** with SSL settings (see `deploy/nginx.conf`)

3. **Update frontend `.env.production`:**
   ```env
   NEXT_PUBLIC_API_URL=https://<EC2-DNS>
   ```

4. **Update agent `.env`:**
   ```env
   BACKEND_URL=https://<EC2-DNS>
   WS_URL=wss://<EC2-DNS>/ws
   ```

### 3. Environment Variables

- Never commit `.env` files to version control
- Use secure secret management (AWS Secrets Manager, etc.)
- Rotate JWT secrets regularly

### 4. File Permissions

```bash
# Restrict access to sensitive files
chmod 600 /opt/playwright-platform/backend/.env
chmod 600 /opt/playwright-platform/frontend/.env.production
```

## Updating Deployment

When you need to update the application:

1. **Pull latest code** (or upload new files)

2. **Run deployment script:**
   ```bash
   ./deploy/deploy.sh
   ```

3. **PM2 will automatically restart** services

4. **Or manually restart:**
   ```bash
   pm2 restart all
   ```

## Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process information
pm2 describe playwright-backend
pm2 describe playwright-frontend
```

### Log Monitoring

```bash
# Application logs
tail -f /var/log/playwright-platform/backend.log
tail -f /var/log/playwright-platform/frontend.log

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Backup

### Database Backup

```bash
# Backup SQLite database
cp /opt/playwright-platform/data/platform.db \
   /opt/playwright-platform/data/platform.db.backup.$(date +%Y%m%d)
```

### Test Files Backup

```bash
# Backup test files
tar -czf /opt/playwright-platform/storage-backup-$(date +%Y%m%d).tar.gz \
         /opt/playwright-platform/storage
```

## Post-Deployment Checklist

- [ ] Backend API responds at `/api/health`
- [ ] Frontend loads at root URL
- [ ] nginx proxies requests correctly
- [ ] WebSocket connection works from local agent
- [ ] Test recording works end-to-end
- [ ] Test files are saved correctly
- [ ] PM2 processes auto-restart on failure
- [ ] Logs are being written
- [ ] Firewall rules are configured
- [ ] SSL/HTTPS is configured (if applicable)

## Support

For issues:
1. Check PM2 logs: `pm2 logs`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check application logs in `/var/log/playwright-platform/`
4. Verify environment variables are set correctly
5. Test connectivity: `curl http://localhost:3005/api/health`

