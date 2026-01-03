# Quick Fix for EC2 Build Error

## The Problem
TypeScript can't find `../../shared/types` because the shared folder isn't in the frontend directory on EC2.

## Solution

Run these commands on EC2:

```bash
# 1. Navigate to project root
cd ~/erp-playwright-test

# 2. Copy shared folder to frontend (REQUIRED before build)
cp -r shared frontend/shared

# 3. Verify it's there
ls -la frontend/shared/types.ts

# 4. Now rebuild frontend
cd frontend
npm run build
```

## Why This Is Needed

TypeScript resolves imports at build time. When it sees `../../shared/types`, it looks for:
- `frontend/shared/types.ts` (relative to `src/app/page.tsx`)

The shared folder needs to be copied to `frontend/shared/` before building.

## For Future Builds

The deployment script has been updated to copy the shared folder automatically. But for manual builds, always run:
```bash
cp -r shared frontend/shared
```
before building.

