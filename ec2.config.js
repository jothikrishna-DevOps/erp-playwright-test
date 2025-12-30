// PM2 Ecosystem Configuration for EC2
module.exports = {
  apps: [
    {
      name: 'playwright-backend',
      script: './backend/dist/index.js',
      cwd: '/opt/playwright-platform',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        STORAGE_PATH: '/opt/playwright-platform/storage'
      },
      env_file: '/opt/playwright-platform/backend/.env',
      error_file: '/var/log/playwright-platform/backend-error.log',
      out_file: '/var/log/playwright-platform/backend-out.log',
      log_file: '/var/log/playwright-platform/backend.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false
    },
    {
      name: 'playwright-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/opt/playwright-platform/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '/opt/playwright-platform/frontend/.env.production',
      error_file: '/var/log/playwright-platform/frontend-error.log',
      out_file: '/var/log/playwright-platform/frontend-out.log',
      log_file: '/var/log/playwright-platform/frontend.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false
    }
  ]
};

