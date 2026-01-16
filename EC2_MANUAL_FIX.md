# Manual Fix for EC2 - Update Import Paths

## The Problem
The files on EC2 still have the old import path `../../shared/types` instead of the new path `@/shared/types`.

## Quick Fix Commands

Run these commands on EC2 to fix all imports:

```bash
cd ~/erp-playwright-test

# Fix page.tsx
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" frontend/src/app/page.tsx

# Fix record/page.tsx
sed -i "s|from '../../../shared/types'|from '@/shared/types'|g" frontend/src/app/record/page.tsx

# Fix api.ts
sed -i "s|from '../../../shared/types'|from '@/shared/types'|g" frontend/src/lib/api.ts

# Verify the changes
echo "=== Checking imports ==="
grep "from.*shared" frontend/src/app/page.tsx
grep "from.*shared" frontend/src/app/record/page.tsx
grep "from.*shared" frontend/src/lib/api.ts

# All should show: from '@/shared/types'

# Rebuild
cd frontend
npm run build
```

## Alternative: Use sed with multiple patterns

If the above doesn't work, try this more comprehensive version:

```bash
cd ~/erp-playwright-test/frontend/src

# Fix all imports in one go
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i "s|from ['\"].*shared/types['\"]|from '@/shared/types'|g"

# Verify
grep -r "from.*shared" .

# Rebuild
cd ..
npm run build
```

## Manual Edit (if sed doesn't work)

If you prefer to edit manually:

1. Edit `frontend/src/app/page.tsx`:
   - Change: `import { Test } from '../../shared/types'`
   - To: `import { Test } from '@/shared/types'`

2. Edit `frontend/src/app/record/page.tsx`:
   - Change: `import { BrowserType } from '../../../shared/types'`
   - To: `import { BrowserType } from '@/shared/types'`

3. Edit `frontend/src/lib/api.ts`:
   - Change: `import { Test, CreateTestRequest } from '../../../shared/types'`
   - To: `import { Test, CreateTestRequest } from '@/shared/types'`

Then rebuild:
```bash
cd frontend
npm run build
```


