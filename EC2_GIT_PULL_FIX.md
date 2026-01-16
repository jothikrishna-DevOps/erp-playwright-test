# Fix Git Pull on EC2

## Problem
Git is blocking the pull because:
1. Local changes to `frontend/src/app/page.tsx` and `frontend/tsconfig.json`
2. Untracked files in `frontend/shared/` (old location - we moved it to `frontend/src/shared`)

## Solution

Run these commands on EC2 in order:

```bash
cd ~/erp-playwright-test

# Step 1: Remove the old frontend/shared folder (we moved it to src/shared)
rm -rf frontend/shared

# Step 2: Reset local changes to tracked files (discard local modifications)
git checkout -- frontend/src/app/page.tsx frontend/tsconfig.json

# Step 3: Pull latest code
git pull origin main

# Step 4: Copy shared folder to the new location (src/shared)
cp -r shared frontend/src/shared

# Step 5: Verify the files are correct
ls -la frontend/src/shared/types.ts
grep "from.*shared" frontend/src/app/page.tsx
# Should show: from '@/shared/types'

# Step 6: Rebuild frontend
cd frontend
npm run build
```

## Alternative: Stash Changes (if you want to keep them)

If you want to keep your local changes for reference:

```bash
# Stash local changes
git stash

# Remove old shared folder
rm -rf frontend/shared

# Pull latest
git pull origin main

# Copy shared to src/shared
cp -r shared frontend/src/shared

# Rebuild
cd frontend
npm run build
```

## Why This Happened

- The old code had `frontend/shared/` folder
- We moved it to `frontend/src/shared/` in the new code
- EC2 had local modifications from previous fix attempts
- Git needs a clean state to pull


