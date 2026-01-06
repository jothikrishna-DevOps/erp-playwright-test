# Complete Update Instructions - Local to EC2

## 📋 Overview

This document provides step-by-step instructions to:
1. ✅ Verify local changes are correct
2. 📤 Push changes to git
3. 🖥️ Update EC2 instance
4. 🔨 Build and deploy

---

## PART 1: Local Verification & Git Push

### Step 1: Verify Local Files Are Correct

```bash
cd "/home/isha/Playwright - Agent"

# Check imports in frontend files
grep "from.*shared/types" frontend/src/app/page.tsx
grep "from.*shared/types" frontend/src/app/record/page.tsx
grep "from.*shared/types" frontend/src/lib/api.ts

# All should show: from '@/shared/types'
```

**Expected output:**
```
import { Test } from '@/shared/types'
import { BrowserType } from '@/shared/types'
import { Test, CreateTestRequest } from '@/shared/types'
```

### Step 2: Check Git Status

```bash
git status
```

**What you should see:**
- Frontend files are already committed (no changes shown)
- New guide files may be untracked (that's okay)

### Step 3: Verify Files Are in Git

```bash
# Check what's actually committed
git show HEAD:frontend/src/app/page.tsx | grep "from.*shared/types"
git show HEAD:frontend/src/app/record/page.tsx | grep "from.*shared/types"
git show HEAD:frontend/src/lib/api.ts | grep "from.*shared/types"
```

**All should show:** `from '@/shared/types'`

### Step 4: Add and Commit New Guides (Optional)

```bash
# Add the update guides
git add EC2_UPDATE_COMPLETE_GUIDE.md EC2_QUICK_UPDATE.md UPDATE_SUMMARY.md COMPLETE_UPDATE_INSTRUCTIONS.md

# Commit
git commit -m "docs: Add EC2 update guides and instructions"

# Push to git
git push origin main
```

**Note:** You'll need to enter your GitHub credentials when pushing.

---

## PART 2: EC2 Update

### Step 1: Connect to EC2

```bash
# Via SSH
ssh -i your-key.pem ec2-user@your-ec2-ip

# OR via AWS Session Manager
aws ssm start-session --target i-your-instance-id
```

### Step 2: Navigate to Project

```bash
cd ~/erp-playwright-test
pwd
# Should show: /root/erp-playwright-test
```

### Step 3: Clean Up Incorrect Files

```bash
# Remove any page.tsx in wrong location
rm -f frontend/page.tsx 2>/dev/null || true

# Remove duplicate shared folder if exists
rm -rf frontend/shared 2>/dev/null || true

# Remove old src/shared (will recreate)
rm -rf frontend/src/shared/ 2>/dev/null || true
```

### Step 4: Discard Local Changes

```bash
# Discard any local modifications
git checkout -- frontend/src/app/page.tsx 2>/dev/null || true
git checkout -- frontend/src/app/record/page.tsx 2>/dev/null || true
git checkout -- frontend/src/lib/api.ts 2>/dev/null || true
git checkout -- frontend/tsconfig.json 2>/dev/null || true
```

### Step 5: Pull Latest Code

```bash
# Pull from git
git pull origin main

# Verify latest commit
git log --oneline -1
# Should show: c8c4546 or later
```

### Step 6: Verify File Structure

```bash
# Check files exist in correct locations
ls -la frontend/src/app/page.tsx
ls -la frontend/src/app/record/page.tsx
ls -la frontend/src/lib/api.ts
ls -la frontend/tsconfig.json

# All should exist
```

### Step 7: Verify Import Paths

```bash
# Check imports (should show @/shared/types)
echo "=== Import Check ==="
grep "from.*shared/types" frontend/src/app/page.tsx
grep "from.*shared/types" frontend/src/app/record/page.tsx
grep "from.*shared/types" frontend/src/lib/api.ts

# Expected output:
# import { Test } from '@/shared/types'
# import { BrowserType } from '@/shared/types'
# import { Test, CreateTestRequest } from '@/shared/types'
```

**If any show `'../../shared/types'` instead, fix them:**

```bash
cd frontend/src
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/record/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" lib/api.ts
cd ../..
```

### Step 8: Create Shared Folder

```bash
# Create shared folder in frontend/src/shared
mkdir -p frontend/src/shared

# Copy shared types
cp -r shared/* frontend/src/shared/

# Verify it exists
ls -la frontend/src/shared/types.ts
# Should show the file
```

### Step 9: Clear Cache

```bash
cd frontend

# Remove Next.js build cache
rm -rf .next

# Remove node_modules cache (optional)
rm -rf node_modules/.cache 2>/dev/null || true
```

### Step 10: Build Frontend

```bash
# Build (you're already in frontend directory)
npm run build
```

**Expected output:**
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Collecting build traces
✓ Finalizing page optimization
```

**If build fails:**
- See troubleshooting section below

### Step 11: Deploy

```bash
# Go back to project root
cd ..

# Run deployment script
bash deploy/deploy.sh
```

**Expected output:**
```
🚀 Starting deployment...
📦 Building backend...
✅ Backend built
📦 Building frontend...
  Copying shared types to src/shared...
✅ Frontend built
📁 Copying files to deployment directory...
✅ Files copied
🔄 Restarting PM2 processes...
✅ PM2 processes restarted
✅ Deployment complete!
```

### Step 12: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Should show:
# - playwright-backend: online
# - playwright-frontend: online

# Check logs
pm2 logs playwright-frontend --lines 20

# Test frontend
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK or 304 Not Modified
```

---

## 🔧 Troubleshooting

### Build Fails: "Cannot find module '@/shared/types'"

**Fix:**
```bash
# 1. Ensure shared folder exists
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/

# 2. Verify tsconfig.json
cat frontend/tsconfig.json | grep -A 2 "paths"
# Should show:
# "@/*": ["./src/*"],
# "@/shared/*": ["./src/shared/*"]

# 3. Clear cache and rebuild
cd frontend
rm -rf .next
npm run build
```

### Build Fails: "File not found"

**Fix:**
```bash
# Check file structure
find frontend/src -name "*.tsx" -o -name "*.ts"

# If files missing, pull again
git pull origin main
```

### PM2 Services Not Running

**Fix:**
```bash
# Check PM2 status
pm2 status

# Restart services
pm2 restart all

# Or start manually
cd /opt/playwright-platform
pm2 start ec2.config.js
pm2 save
```

### Frontend Loads But Shows Errors

**Fix:**
```bash
# Check browser console for errors
# Check PM2 logs
pm2 logs playwright-frontend

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] `git log -1` shows latest commit (c8c4546 or later)
- [ ] `grep "from.*shared/types" frontend/src/app/page.tsx` shows `@/shared/types`
- [ ] `ls frontend/src/shared/types.ts` exists
- [ ] `npm run build` in frontend directory succeeds
- [ ] `pm2 status` shows both services online
- [ ] Frontend loads in browser at EC2 URL
- [ ] No console errors in browser

---

## 📚 Additional Resources

- **Quick Reference:** See `EC2_QUICK_UPDATE.md`
- **Detailed Guide:** See `EC2_UPDATE_COMPLETE_GUIDE.md`
- **Summary:** See `UPDATE_SUMMARY.md`

---

## 🎯 Quick Command Reference

**On EC2 (all-in-one):**
```bash
cd ~/erp-playwright-test && \
rm -f frontend/page.tsx 2>/dev/null && \
rm -rf frontend/shared frontend/src/shared 2>/dev/null && \
git checkout -- frontend/src/app/*.tsx frontend/src/lib/*.ts 2>/dev/null && \
git pull origin main && \
mkdir -p frontend/src/shared && \
cp -r shared/* frontend/src/shared/ && \
cd frontend && \
rm -rf .next && \
npm run build && \
cd .. && \
bash deploy/deploy.sh && \
pm2 status
```

---

**Status:** ✅ Ready to execute
**Last Updated:** $(date)

