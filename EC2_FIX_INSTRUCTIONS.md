# Fix Instructions for EC2

## The Problem
TypeScript couldn't resolve `../../shared/types` because Next.js module resolution doesn't work well with paths outside the `src` directory.

## The Solution
We moved the shared folder to `src/shared` and updated all imports to use the path alias `@/shared/types`.

## Steps on EC2

### Step 1: Pull Latest Code

```bash
cd ~/erp-playwright-test
git pull origin main
```

### Step 2: Copy Shared Folder to src/shared

```bash
# Copy shared folder to frontend/src/shared
cp -r shared frontend/src/shared

# Verify it's there
ls -la frontend/src/shared/types.ts
```

### Step 3: Rebuild Frontend

```bash
cd frontend
npm run build
```

The build should now succeed! ✅

## What Changed

**Before:**
- Shared folder: `frontend/shared/` or `../shared/`
- Imports: `import { Test } from '../../shared/types'`

**After:**
- Shared folder: `frontend/src/shared/`
- Imports: `import { Test } from '@/shared/types'` (uses path alias)

This is cleaner and works better with Next.js TypeScript compilation.

## Files Updated

- `frontend/src/app/page.tsx` - Updated import
- `frontend/src/app/record/page.tsx` - Updated import  
- `frontend/src/lib/api.ts` - Updated import
- `frontend/src/shared/types.ts` - Moved here (copied from root shared)









