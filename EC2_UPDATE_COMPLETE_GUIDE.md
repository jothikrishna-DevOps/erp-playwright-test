# Complete EC2 Update Guide - Fix Frontend Build

This guide will help you update your EC2 instance with the latest code and fix the frontend build issue.

## Prerequisites

- SSH access to your EC2 instance
- Git repository access
- Basic terminal knowledge

---

## Step 1: Connect to EC2

```bash
# Connect via SSH or AWS Session Manager
ssh -i your-key.pem ec2-user@your-ec2-ip
# OR use AWS Session Manager if configured
```

---

## Step 2: Navigate to Project Directory

```bash
cd ~/erp-playwright-test
pwd
# Should show: /root/erp-playwright-test
```

---

## Step 3: Clean Up Any Incorrect Files

```bash
# Remove any page.tsx file in wrong location (should be in src/app/, not frontend root)
if [ -f "frontend/page.tsx" ]; then
  echo "⚠️  Removing incorrect page.tsx from frontend root..."
  rm frontend/page.tsx
fi

# Remove any duplicate shared folders
if [ -d "frontend/shared" ] && [ -d "frontend/src/shared" ]; then
  echo "⚠️  Removing duplicate shared folder from frontend root..."
  rm -rf frontend/shared
fi
```

---

## Step 4: Discard Local Changes (if any)

```bash
# Discard any local changes to frontend files
git checkout -- frontend/src/app/page.tsx 2>/dev/null || true
git checkout -- frontend/src/app/record/page.tsx 2>/dev/null || true
git checkout -- frontend/src/lib/api.ts 2>/dev/null || true
git checkout -- frontend/tsconfig.json 2>/dev/null || true

# Remove any manually created shared folder (will be recreated)
rm -rf frontend/src/shared/ 2>/dev/null || true
```

---

## Step 5: Pull Latest Code from Git

```bash
# Pull the latest code
git pull origin main

# Verify the pull was successful
git log --oneline -1
# Should show the latest commit with frontend import fixes
```

---

## Step 6: Verify File Structure

```bash
# Check that files are in correct locations
echo "=== Checking file structure ==="
ls -la frontend/src/app/page.tsx
ls -la frontend/src/app/record/page.tsx
ls -la frontend/src/lib/api.ts
ls -la frontend/tsconfig.json

# All should exist and show file details
```

---

## Step 7: Verify Import Paths

```bash
# Check that imports use @/shared/types (not ../../shared/types)
echo "=== Checking import paths ==="
grep -n "from.*shared/types" frontend/src/app/page.tsx
grep -n "from.*shared/types" frontend/src/app/record/page.tsx
grep -n "from.*shared/types" frontend/src/lib/api.ts

# All should show: from '@/shared/types'
# If any show '../../shared/types', fix them:
```

**If imports are wrong, fix them:**

```bash
cd frontend/src
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/record/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" lib/api.ts
cd ../..
```

---

## Step 8: Ensure Shared Folder Exists

```bash
# Create shared folder in frontend/src/shared
mkdir -p frontend/src/shared

# Copy shared types from project root
cp -r shared/* frontend/src/shared/

# Verify the types file exists
ls -la frontend/src/shared/types.ts
# Should show the file exists
```

---

## Step 9: Clear Next.js Cache

```bash
cd frontend

# Remove Next.js build cache
rm -rf .next

# Remove node_modules cache (optional but recommended)
rm -rf node_modules/.cache 2>/dev/null || true

cd ..
```

---

## Step 10: Build Frontend

```bash
cd frontend

# Build the frontend
npm run build

# Watch for any errors
# If successful, you should see:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
# ✓ Collecting page data
# ✓ Generating static pages
```

---

## Step 11: If Build Fails

If the build fails with import errors, run this comprehensive fix:

```bash
cd ~/erp-playwright-test

# 1. Ensure shared folder exists
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/

# 2. Fix all imports
cd frontend/src
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/record/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" lib/api.ts
cd ../..

# 3. Verify tsconfig.json has correct paths
cat frontend/tsconfig.json | grep -A 2 "paths"
# Should show:
# "@/*": ["./src/*"],
# "@/shared/*": ["./src/shared/*"]

# 4. Clear cache and rebuild
cd frontend
rm -rf .next
npm run build
```

---

## Step 12: Deploy Using Deployment Script

Once the build succeeds, use the deployment script:

```bash
cd ~/erp-playwright-test

# Run deployment script
bash deploy/deploy.sh

# This will:
# - Build backend
# - Build frontend (with shared folder copy)
# - Copy files to /opt/playwright-platform
# - Restart PM2 processes
```

---

## Step 13: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Should show both services running:
# - playwright-backend
# - playwright-frontend

# Check logs
pm2 logs playwright-frontend --lines 50

# Test the frontend
curl -I http://localhost:3000
# Should return HTTP 200 or 304
```

---

## Step 14: Test in Browser

1. Open your EC2 public URL in a browser
2. Navigate to the frontend
3. Check browser console for any errors
4. Try recording a test to verify everything works

---

## Troubleshooting

### Issue: "Cannot find module '@/shared/types'"

**Solution:**
```bash
# Ensure shared folder exists
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/

# Verify tsconfig.json paths
cat frontend/tsconfig.json | grep -A 2 "paths"

# Clear cache and rebuild
cd frontend
rm -rf .next
npm run build
```

### Issue: "File not found" errors

**Solution:**
```bash
# Check file structure
find frontend/src -name "*.tsx" -o -name "*.ts" | grep -E "(page|api)"

# Should show:
# frontend/src/app/page.tsx
# frontend/src/app/record/page.tsx
# frontend/src/lib/api.ts

# If files are missing, pull from git again
git pull origin main
```

### Issue: Build succeeds but frontend doesn't load

**Solution:**
```bash
# Check PM2 logs
pm2 logs playwright-frontend

# Restart frontend
pm2 restart playwright-frontend

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

---

## Quick Reference Commands

```bash
# Full update sequence (copy-paste ready)
cd ~/erp-playwright-test
git pull origin main
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/
cd frontend
rm -rf .next
npm run build
cd ..
bash deploy/deploy.sh
pm2 status
```

---

## Summary

✅ **What we fixed:**
- Updated import paths from `'../../shared/types'` to `'@/shared/types'`
- Ensured shared folder is copied to `frontend/src/shared/` before build
- Updated deployment script to handle shared folder automatically
- Fixed TypeScript path aliases in `tsconfig.json`

✅ **Files updated:**
- `frontend/src/app/page.tsx`
- `frontend/src/app/record/page.tsx`
- `frontend/src/lib/api.ts`
- `frontend/tsconfig.json`
- `deploy/deploy.sh`

✅ **Result:**
- Frontend builds successfully
- TypeScript resolves imports correctly
- Deployment script handles shared folder automatically

---

**Last Updated:** $(date)
**Status:** ✅ Ready for deployment

