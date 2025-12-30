#!/bin/bash

# Deployment Script
# Run this to build and deploy the application

set -e

echo "🚀 Starting deployment..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/playwright-platform"

cd "$PROJECT_ROOT"

echo "📦 Building backend..."
cd backend
npm install --production=false
npm run build
echo "✅ Backend built"

echo "📦 Building frontend..."
cd ../frontend
npm install --production=false
npm run build
echo "✅ Frontend built"

echo "📁 Copying files to deployment directory..."
cd "$PROJECT_ROOT"

# Create deployment structure
mkdir -p $DEPLOY_DIR/backend
mkdir -p $DEPLOY_DIR/frontend
mkdir -p $DEPLOY_DIR/shared

# Copy backend
echo "  Copying backend..."
cp -r backend/dist $DEPLOY_DIR/backend/
cp -r backend/node_modules $DEPLOY_DIR/backend/ 2>/dev/null || npm install --prefix $DEPLOY_DIR/backend --production
cp backend/package.json $DEPLOY_DIR/backend/
cp backend/.env.production $DEPLOY_DIR/backend/.env 2>/dev/null || echo "⚠️  .env.production not found, using defaults"

# Copy frontend
echo "  Copying frontend..."
cp -r frontend/.next $DEPLOY_DIR/frontend/ 2>/dev/null || echo "⚠️  Frontend build not found"
cp -r frontend/public $DEPLOY_DIR/frontend/ 2>/dev/null || true
cp -r frontend/node_modules $DEPLOY_DIR/frontend/ 2>/dev/null || npm install --prefix $DEPLOY_DIR/frontend --production
cp frontend/package.json $DEPLOY_DIR/frontend/
cp frontend/.env.production $DEPLOY_DIR/frontend/.env.production 2>/dev/null || echo "⚠️  .env.production not found"

# Copy shared types
echo "  Copying shared types..."
cp -r shared $DEPLOY_DIR/

# Copy PM2 config
echo "  Copying PM2 config..."
cp ec2.config.js $DEPLOY_DIR/ 2>/dev/null || echo "⚠️  ec2.config.js not found"

# Set permissions
chmod +x $DEPLOY_DIR/backend/dist/index.js 2>/dev/null || true

echo "✅ Files copied"

# Restart PM2 processes
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 processes..."
    cd $DEPLOY_DIR
    pm2 delete all 2>/dev/null || true
    pm2 start ec2.config.js
    pm2 save
    echo "✅ PM2 processes restarted"
else
    echo "⚠️  PM2 not found. Install it first with: npm install -g pm2"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure nginx: sudo cp deploy/nginx.conf /etc/nginx/conf.d/playwright-platform.conf"
echo "2. Update nginx config with your EC2 DNS"
echo "3. Restart nginx: sudo systemctl restart nginx"
echo "4. Check PM2 status: pm2 status"
echo "5. View logs: pm2 logs"

