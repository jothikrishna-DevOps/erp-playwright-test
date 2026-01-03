# EC2 Verification Checklist

## ✅ All Files Updated Locally

### Frontend Files (Must use `@/shared/types`):
- ✅ `frontend/src/app/page.tsx` - Updated to `@/shared/types`
- ✅ `frontend/src/app/record/page.tsx` - Updated to `@/shared/types`
- ✅ `frontend/src/lib/api.ts` - Updated to `@/shared/types`

### Backend Files (No changes needed - relative paths work fine):
- ✅ `backend/src/routes/tests.ts` - Uses `../../../shared/types` (OK)
- ✅ `backend/src/routes/agents.ts` - Uses `../../../shared/types` (OK)
- ✅ `backend/src/websocket.ts` - Uses `../../shared/types` (OK)

### Agent Files (No changes needed - relative paths work fine):
- ✅ `agent/src/agent-client.ts` - Uses `../../shared/types` (OK)

### Configuration Files:
- ✅ `frontend/tsconfig.json` - Path alias `@/*` already configured
- ✅ `deploy/deploy.sh` - Updated to copy shared to `frontend/src/shared` before build

## 🔍 What to Check on EC2

### Step 1: Pull Latest Code
```bash
cd ~/erp-playwright-test
git pull origin main
```

### Step 2: Verify Frontend Files Are Updated
```bash
# Check that imports use @/shared/types
grep -n "from.*shared/types" frontend/src/app/page.tsx
grep -n "from.*shared/types" frontend/src/app/record/page.tsx
grep -n "from.*shared/types" frontend/src/lib/api.ts

# All should show: from '@/shared/types'
```

### Step 3: Verify Shared Folder is in Right Place
```bash
# Check if shared folder exists in frontend/src/shared
ls -la frontend/src/shared/types.ts

# If it doesn't exist, copy it:
cp -r shared frontend/src/shared
```

### Step 4: Verify Deployment Script is Updated
```bash
# Check that deploy script copies shared before building
grep -A 3 "Building frontend" deploy/deploy.sh

# Should show:
#   cp -r ../shared src/shared
```

### Step 5: Rebuild Frontend
```bash
cd frontend
npm run build
```

## 🎯 Expected Result

The build should complete successfully with:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (5/5)
```

## ❌ If Build Still Fails

1. **Check if shared folder exists:**
   ```bash
   ls -la frontend/src/shared/types.ts
   ```

2. **Manually copy if missing:**
   ```bash
   rm -rf frontend/src/shared  # Remove if nested incorrectly
   cp -r shared frontend/src/shared
   ```

3. **Verify imports are correct:**
   ```bash
   grep "from.*shared" frontend/src/**/*.{ts,tsx}
   # Should all show: from '@/shared/types'
   ```

4. **Clear Next.js cache:**
   ```bash
   cd frontend
   rm -rf .next
   npm run build
   ```

## 📝 Summary

**Only frontend files needed changes** because:
- Next.js TypeScript compilation has stricter module resolution
- Backend and agent use standard TypeScript (relative paths work fine)

**All required changes are committed and ready to deploy!**

