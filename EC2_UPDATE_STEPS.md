# EC2 Update Steps - Fix TypeScript Import Error

## Problem
The frontend build on EC2 is failing because the code still uses the old import path `'../../shared/types'` instead of the new path alias `'@/shared/types'`.

## Solution
We need to:
1. Update local files (already done, just need to commit)
2. Push to git
3. Pull latest code on EC2
4. Ensure shared folder is in the correct location
5. Rebuild frontend

---

## Step 1: Commit and Push Local Changes

Run these commands locally:

```bash
cd "/home/isha/Playwright - Agent"
git add frontend/tsconfig.json
git commit -m "Fix: Add explicit @/shared/* path alias in tsconfig.json"
git push
```

---

## Step 2: Update Code on EC2

SSH into your EC2 instance and run:

```bash
# Navigate to project directory
cd ~/erp-playwright-test

# Pull latest code from git
git pull

# Verify the shared folder exists in the correct location
ls -la frontend/src/shared/

# If the folder doesn't exist, create it:
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/

# Verify the import paths in the frontend files are updated
grep -r "from.*shared/types" frontend/src/
# Should show: @/shared/types (not ../../shared/types)
```

---

## Step 3: Fix Import Paths on EC2 (if needed)

If the grep command shows old import paths (`../../shared/types`), update them:

```bash
cd ~/erp-playwright-test/frontend/src

# Update page.tsx
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" app/page.tsx

# Update record/page.tsx
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" app/record/page.tsx

# Update lib/api.ts
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" lib/api.ts
```

---

## Step 4: Rebuild Frontend on EC2

```bash
cd ~/erp-playwright-test/frontend

# Ensure shared folder is in src/shared
if [ ! -d "src/shared" ]; then
  echo "Copying shared folder to src/shared..."
  mkdir -p src/shared
  cp -r ../shared/* src/shared/
fi

# Build
npm run build
```

---

## Step 5: Redeploy (if build succeeds)

If the build succeeds, run the full deployment:

```bash
cd ~/erp-playwright-test
./deploy/deploy.sh
```

---

## Alternative: Quick Fix (if git pull doesn't work)

If you can't pull from git, manually update the files on EC2:

```bash
cd ~/erp-playwright-test

# 1. Update tsconfig.json
cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/shared/*": ["./src/shared/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "src/shared/**/*"],
  "exclude": ["node_modules"]
}
EOF

# 2. Ensure shared folder is in src/shared
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/

# 3. Update import paths in frontend files
cd frontend/src
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" app/page.tsx
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" app/record/page.tsx
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" lib/api.ts

# 4. Build
cd ~/erp-playwright-test/frontend
npm run build
```

---

## Verification

After the build succeeds, verify:

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs playwright-frontend --lines 50

# Test the frontend
curl http://localhost:3000
```

---

## Summary of Changes

1. **tsconfig.json**: Added explicit `"@/shared/*": ["./src/shared/*"]` path alias
2. **Import paths**: Changed from `'../../shared/types'` to `'@/shared/types'`
3. **File location**: Shared types are now in `frontend/src/shared/` instead of project root `shared/`
4. **Deploy script**: Already updated to copy `shared` to `frontend/src/shared` before building

