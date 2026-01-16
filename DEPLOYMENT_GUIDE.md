# Complete Deployment Guide

This guide covers deploying all recent changes including:
- ✅ Fixed file naming using test names (not UUIDs)
- ✅ Database column mapping fixes (snake_case to camelCase)
- ✅ Enhanced UI folder organization
- ✅ Improved download functionality
- ✅ Description field support

## Changes Summary

### 1. File Naming Fix
- **Issue**: Files were being saved with UUID folder names instead of test names
- **Fix**: Added proper database column mapping and ensured test names are used for folder/file names
- **Result**: Files now saved as `/storage/tests/{test-name-sanitized}/{test-name-sanitized}.spec.ts`

### 2. Database Column Mapping
- **Issue**: Database uses snake_case (file_path, created_at) but TypeScript expects camelCase (filePath, createdAt)
- **Fix**: Added `mapDbRowToTest()` function to convert database rows to proper TypeScript types
- **Result**: All API responses now properly map database columns to TypeScript types

### 3. UI Folder Organization
- **Enhancement**: Tests can now be grouped by folder, date, or not grouped
- **Features**: 
  - Folder-based grouping (default) - shows tests organized by their storage folder
  - Date-based grouping - shows tests grouped by creation date
  - No grouping - flat list view
- **Result**: Better organization and visibility of test files

### 4. Download Functionality
- **Enhancement**: Improved download button with icon and better UX
- **Result**: Clear download button with visual indicator

### 5. Description Field
- **Status**: Already implemented, verified working
- **Result**: Description field available in record form and displayed in dashboard

## Files Modified

### Backend
- `backend/src/routes/tests.ts` - Added database mapping function, fixed all endpoints to use proper mapping

### Frontend
- `frontend/src/app/page.tsx` - Enhanced folder organization UI, improved download button

## Step-by-Step Deployment

### Step 1: Commit Changes Locally

```bash
# On your local machine
cd "/home/isha/Playwright - Agent"

# Check what files changed
git status

# Add all changed files
git add backend/src/routes/tests.ts
git add frontend/src/app/page.tsx
git add DEPLOYMENT_GUIDE.md

# Commit
git commit -m "Fix file naming, database mapping, and enhance UI folder organization"

# Push to GitHub
git push origin main
```

**Note**: Replace `main` with your actual branch name if different (e.g., `master`)

### Step 2: Connect to EC2

Connect to your EC2 instance using one of these methods:

**Option A: SSH**
```bash
ssh -i /path/to/your-key.pem ec2-user@your-ec2-ip
```

**Option B: AWS Session Manager**
```bash
aws ssm start-session --target i-your-instance-id
```

### Step 3: Pull Latest Code on EC2

```bash
# Navigate to project directory
cd ~/erp-playwright-test
# OR if your project is in a different location:
# cd /opt/playwright-platform

# Pull latest code
git pull origin main

# Verify files updated
git log --oneline -5
ls -la backend/src/routes/tests.ts
ls -la frontend/src/app/page.tsx
```

### Step 4: Rebuild Backend (TypeScript)

```bash
# Navigate to backend directory
cd ~/erp-playwright-test/backend
# OR: cd /opt/playwright-platform/backend

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build
# OR if you don't have a build script:
npx tsc

# Verify build
ls -la dist/routes/tests.js
```

### Step 5: Restart Backend Service

```bash
# Check if using PM2
pm2 list

# Restart backend
pm2 restart backend
# OR if using systemd:
sudo systemctl restart playwright-backend
# OR if running manually, stop and restart:
# pkill -f "node.*backend"
# cd ~/erp-playwright-test/backend && npm start &
```

### Step 6: Rebuild Frontend

```bash
# Navigate to frontend directory
cd ~/erp-playwright-test/frontend
# OR: cd /opt/playwright-platform/frontend

# Install dependencies (if needed)
npm install

# Set environment variable (if not already set)
export NEXT_PUBLIC_API_URL=http://your-ec2-domain-or-ip

# Build Next.js app
npm run build

# Verify build
ls -la .next
```

### Step 7: Restart Frontend Service

```bash
# Check if using PM2
pm2 list

# Restart frontend
pm2 restart frontend
# OR if using systemd:
sudo systemctl restart playwright-frontend
# OR if running manually, stop and restart:
# pkill -f "next"
# cd ~/erp-playwright-test/frontend && npm start &
```

### Step 8: Restart Nginx (if needed)

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
# OR:
sudo service nginx reload
```

### Step 9: Verify Deployment

1. **Check Backend API**:
   ```bash
   curl http://localhost:3005/api/health
   curl http://localhost:3005/api/tests
   ```

2. **Check Frontend**:
   - Open your EC2 domain/IP in browser
   - Verify tests are displayed
   - Check that folder grouping works
   - Test download functionality
   - Create a new test and verify it's saved with the test name (not UUID)

3. **Check Logs**:
   ```bash
   # Backend logs
   pm2 logs backend
   # OR:
   tail -f ~/erp-playwright-test/backend/logs/app.log
   
   # Frontend logs
   pm2 logs frontend
   # OR:
   tail -f ~/erp-playwright-test/frontend/logs/app.log
   ```

## Troubleshooting

### Issue: Files still saving with UUID names

**Solution**:
1. Verify backend code is updated: `grep -n "getUniqueTestFolder" backend/src/routes/tests.ts`
2. Check backend is restarted: `pm2 restart backend`
3. Check backend logs for errors: `pm2 logs backend`
4. Test with a new test recording - old tests will still have UUID folders

### Issue: Database column mapping errors

**Solution**:
1. Verify `mapDbRowToTest` function exists: `grep -n "mapDbRowToTest" backend/src/routes/tests.ts`
2. Check backend logs: `pm2 logs backend`
3. Restart backend: `pm2 restart backend`

### Issue: Frontend not showing folder grouping

**Solution**:
1. Verify frontend code is updated: `grep -n "groupBy.*folder" frontend/src/app/page.tsx`
2. Clear browser cache and hard refresh (Ctrl+Shift+R)
3. Check frontend build: `ls -la frontend/.next`
4. Rebuild frontend: `cd frontend && npm run build`

### Issue: Download not working

**Solution**:
1. Check backend download endpoint: `curl http://localhost:3005/api/tests/{test-id}/download`
2. Verify file exists: Check `backend/storage/tests/` directory
3. Check file permissions: `ls -la backend/storage/tests/`

## Rollback (if needed)

If something goes wrong, you can rollback:

```bash
# On EC2
cd ~/erp-playwright-test

# View commit history
git log --oneline -10

# Rollback to previous commit
git reset --hard HEAD~1

# Rebuild and restart services
cd backend && npm run build && pm2 restart backend
cd ../frontend && npm run build && pm2 restart frontend
```

## Post-Deployment Checklist

- [ ] Backend API responding correctly
- [ ] Frontend loading without errors
- [ ] New tests saving with test names (not UUIDs)
- [ ] Folder grouping working in UI
- [ ] Download functionality working
- [ ] Description field visible and working
- [ ] No errors in backend logs
- [ ] No errors in frontend logs
- [ ] All existing tests still accessible

## Notes

1. **Old Tests**: Tests created before this update will still have UUID folder names. Only new tests will use test names.

2. **Database**: The database schema doesn't need migration - the description column is added automatically if missing.

3. **File System**: Files are stored in the filesystem (not database), so no database migration needed for file storage.

4. **Environment Variables**: Make sure `NEXT_PUBLIC_API_URL` is set correctly before building frontend.

## Support

If you encounter issues:
1. Check logs: `pm2 logs` or service logs
2. Verify code is updated: `git log --oneline -5`
3. Check services are running: `pm2 list` or `systemctl status`
4. Verify file permissions: `ls -la backend/storage/tests/`







