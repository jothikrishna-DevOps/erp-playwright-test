# Complete Deployment Guide - All Changes

This guide covers deploying all recent changes including:
- ✅ File naming using test names (not UUIDs)
- ✅ Description field
- ✅ Folder organization in UI
- ✅ Download functionality

## Changes Summary

### 1. File Naming
- **Before**: `/storage/tests/{uuid}/test.spec.ts`
- **After**: `/storage/tests/{test-name}/test-name.spec.ts`

### 2. Description Field
- Added to database schema
- Added to create test API
- Added to UI (record form and dashboard)

### 3. Folder Organization
- Tests grouped by date in dashboard
- Option to ungroup

### 4. Download
- Already working, verified

## Files Modified

### Backend
- `backend/src/db.ts` - Added description column
- `backend/src/routes/tests.ts` - File naming, description handling

### Frontend
- `frontend/src/app/record/page.tsx` - Added description field
- `frontend/src/app/page.tsx` - Added description column, grouping

### Shared
- `shared/types.ts` - Added description to Test and CreateTestRequest

## Step-by-Step Deployment

### Step 1: Commit Changes Locally

```bash
# On your local machine
cd "/home/isha/Playwright - Agent"

# Check what files changed
git status

# Add all changed files
git add backend/src/db.ts
git add backend/src/routes/tests.ts
git add frontend/src/app/record/page.tsx
git add frontend/src/app/page.tsx
git add shared/types.ts
git add FILE_NAMING_CHANGES.md
git add DEPLOYMENT_GUIDE_COMPLETE.md

# Commit
git commit -m "Add description field, file naming by test name, folder organization"

# Push to GitHub
git push origin main
```

### Step 2: Connect to EC2

```bash
# Via AWS Session Manager or SSH
# Connect to your EC2 instance
```

### Step 3: Pull Latest Code on EC2

```bash
# On EC2
cd ~/erp-playwright-test

# Pull latest code
git pull origin main

# Verify files updated
git log --oneline -5
```

### Step 4: Update Database Schema

```bash
# On EC2
cd ~/erp-playwright-test/backend

# The database migration happens automatically when backend starts
# But we can verify the schema
cd /opt/playwright-platform/backend
node << 'EOF'
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/platform.db');

db.all("PRAGMA table_info(tests)", (err, cols) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('\n=== Tests Table Columns ===\n');
    cols.forEach(col => {
      console.log(`${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''}`);
    });
  }
  db.close();
});
EOF
```

You should see `description` in the columns.

### Step 5: Rebuild Backend

```bash
# On EC2
cd ~/erp-playwright-test/backend

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Verify build succeeded
ls -la dist/routes/tests.js
ls -la dist/db.js
```

### Step 6: Rebuild Frontend

```bash
# On EC2
cd ~/erp-playwright-test/frontend

# Install dependencies (if needed)
npm install

# Build Next.js
npm run build

# Verify build succeeded
ls -la .next/
```

### Step 7: Deploy to Production Directory

```bash
# On EC2
cd ~/erp-playwright-test

# Copy backend
sudo cp -r backend/dist /opt/playwright-platform/backend/
sudo cp backend/package.json /opt/playwright-platform/backend/
sudo cp -r shared /opt/playwright-platform/

# Copy frontend
sudo cp -r frontend/.next /opt/playwright-platform/frontend/
sudo cp frontend/package.json /opt/playwright-platform/frontend/
sudo cp -r frontend/public /opt/playwright-platform/frontend/ 2>/dev/null || true

# Install production dependencies
cd /opt/playwright-platform/backend
sudo npm install --production

cd /opt/playwright-platform/frontend
sudo npm install --production
```

### Step 8: Restart Services

```bash
# On EC2
pm2 restart playwright-backend
pm2 restart playwright-frontend

# Check status
pm2 status

# Check logs
pm2 logs playwright-backend --lines 20
pm2 logs playwright-frontend --lines 20
```

### Step 9: Verify Deployment

```bash
# Test backend API
curl http://localhost:3005/api/health

# Test frontend
curl -I http://localhost:3000

# Check if services are running
pm2 status
```

## Alternative: Use Deployment Script

If you have the deployment script set up:

```bash
# On EC2
cd ~/erp-playwright-test
./deploy/deploy.sh
```

This will:
- Build backend and frontend
- Copy files to `/opt/playwright-platform`
- Restart PM2 processes

## Testing After Deployment

### 1. Test Description Field

1. Go to UI: `http://your-ec2-dns/record`
2. Fill in form:
   - Test Name: "My Test"
   - URL: "https://example.com"
   - Description: "This is a test description"
3. Start recording
4. Check dashboard - description should appear

### 2. Test File Naming

1. Create a new test: "Login Test"
2. Complete recording
3. Check EC2:
   ```bash
   ls -la /opt/playwright-platform/backend/storage/tests/
   # Should see: login-test/ (not UUID)
   ls -la /opt/playwright-platform/backend/storage/tests/login-test/
   # Should see: login-test.spec.ts (not test.spec.ts)
   ```

### 3. Test Folder Organization

1. Go to dashboard
2. You should see tests grouped by date
3. Try changing "Group by" dropdown

### 4. Test Download

1. Click "Download" button on any test
2. File should download with correct name: `test-name.spec.ts`

## Troubleshooting

### Issue: Description column doesn't exist

**Solution**: The migration runs automatically. If it fails, run manually:

```bash
cd /opt/playwright-platform/backend
sqlite3 data/platform.db "ALTER TABLE tests ADD COLUMN description TEXT;"
```

### Issue: Files still using UUID names

**Solution**: 
- Make sure you rebuilt backend
- Restarted PM2
- Created a NEW test (old tests keep old structure)

### Issue: Frontend shows errors

**Solution**:
- Rebuild frontend: `cd frontend && npm run build`
- Check for TypeScript errors
- Restart frontend: `pm2 restart playwright-frontend`

### Issue: Services won't start

**Solution**:
- Check logs: `pm2 logs`
- Check if ports are in use: `netstat -tulpn | grep -E '3000|3005'`
- Verify files copied correctly

## Rollback (If Needed)

If something goes wrong:

```bash
# On EC2
cd ~/erp-playwright-test

# Checkout previous version
git log --oneline -10  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild and redeploy
cd backend && npm run build
cd ../frontend && npm run build
cd ..
./deploy/deploy.sh  # or manual deployment
```

## Quick Deployment Checklist

- [ ] Committed changes locally
- [ ] Pushed to GitHub
- [ ] Connected to EC2
- [ ] Pulled latest code
- [ ] Rebuilt backend (`npm run build`)
- [ ] Rebuilt frontend (`npm run build`)
- [ ] Copied files to `/opt/playwright-platform`
- [ ] Restarted PM2 services
- [ ] Verified services running
- [ ] Tested description field
- [ ] Tested file naming
- [ ] Tested folder organization
- [ ] Tested download

## Notes

1. **Old tests** keep their UUID folder names (backward compatible)
2. **New tests** use test name for folders and files
3. **Description field** is optional
4. **Database migration** happens automatically on backend start
5. All changes are **backward compatible**

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check backend logs: `pm2 logs playwright-backend`
3. Check frontend logs: `pm2 logs playwright-frontend`
4. Verify database schema: Use the schema check script above
5. Test API endpoints: `curl http://localhost:3005/api/tests`









