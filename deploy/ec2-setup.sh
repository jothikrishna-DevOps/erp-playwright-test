#!/bin/bash

# EC2 Initial Setup Script
# Run this once on a fresh EC2 instance

set -e

echo "🚀 Starting EC2 setup for Playwright Test Platform..."

# Update system packages
echo "📦 Updating system packages..."
sudo yum update -y || sudo apt-get update -y

# Install Node.js 18+ if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - || \
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs || sudo apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

echo "✅ PM2 version: $(pm2 --version)"

# Install nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    sudo yum install -y nginx || sudo apt-get install -y nginx
    sudo systemctl enable nginx
fi

echo "✅ nginx installed"

# Create deployment directory
DEPLOY_DIR="/opt/playwright-platform"
echo "📁 Creating deployment directory: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR
sudo mkdir -p $DEPLOY_DIR/storage/tests
sudo mkdir -p $DEPLOY_DIR/storage/uploads
sudo mkdir -p $DEPLOY_DIR/data

# Set ownership (adjust user as needed)
CURRENT_USER=$(whoami)
sudo chown -R $CURRENT_USER:$CURRENT_USER $DEPLOY_DIR

echo "✅ Deployment directory created"

# Create log directories
sudo mkdir -p /var/log/playwright-platform
sudo chown -R $CURRENT_USER:$CURRENT_USER /var/log/playwright-platform

echo "✅ Log directories created"

# Configure firewall (if using firewalld)
if command -v firewall-cmd &> /dev/null; then
    echo "🔥 Configuring firewall..."
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --reload
    echo "✅ Firewall configured"
fi

# Configure firewall (if using ufw)
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "✅ Firewall configured"
fi

echo ""
echo "✅ EC2 setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your project files to EC2"
echo "2. Run deploy/deploy.sh to build and deploy"
echo "3. Configure nginx (copy deploy/nginx.conf to /etc/nginx/conf.d/playwright-platform.conf)"
echo "4. Start services with: pm2 start ec2.config.js"

