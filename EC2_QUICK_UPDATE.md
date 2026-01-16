# Quick EC2 Update - Step by Step

## 🚀 Quick Update Commands (Copy-Paste Ready)

Run these commands **on your EC2 instance**:

```bash
# 1. Navigate to project
cd ~/erp-playwright-test

# 2. Clean up any wrong files
rm -f frontend/page.tsx 2>/dev/null || true
rm -rf frontend/shared 2>/dev/null || true

# 3. Discard local changes
git checkout -- frontend/src/app/page.tsx 2>/dev/null || true
git checkout -- frontend/src/app/record/page.tsx 2>/dev/null || true
git checkout -- frontend/src/lib/api.ts 2>/dev/null || true
rm -rf frontend/src/shared/ 2>/dev/null || true

# 4. Pull latest code
git pull origin main

# 5. Ensure shared folder exists
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/

# 6. Verify imports (should show @/shared/types)
echo "=== Checking imports ==="
grep "from.*shared/types" frontend/src/app/page.tsx
grep "from.*shared/types" frontend/src/app/record/page.tsx
grep "from.*shared/types" frontend/src/lib/api.ts

# 7. Build frontend
cd frontend
rm -rf .next
npm run build

# 8. If build succeeds, deploy
cd ..
bash deploy/deploy.sh

# 9. Check status
pm2 status
```

---

## ✅ Expected Results

After running the commands:

1. **Git pull:** Should show "Already up to date" or new commits pulled
2. **Import check:** All three files should show `from '@/shared/types'`
3. **Build:** Should show `✓ Compiled successfully` and `✓ Linting and checking validity of types`
4. **PM2:** Both `playwright-backend` and `playwright-frontend` should be `online`

---

## ❌ If Build Fails

If you see `Cannot find module '@/shared/types'`:

```bash
# Fix imports manually
cd ~/erp-playwright-test/frontend/src
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" app/record/page.tsx
sed -i "s|from.*shared/types'|from '@/shared/types'|g" lib/api.ts

# Ensure shared folder
cd ../..
mkdir -p frontend/src/shared
cp -r shared/* frontend/src/shared/

# Rebuild
cd frontend
rm -rf .next
npm run build
```

---

## 📋 Verification Checklist

After update, verify:

- [ ] `git log -1` shows latest commit
- [ ] `ls frontend/src/shared/types.ts` exists
- [ ] `grep "from.*shared/types" frontend/src/app/page.tsx` shows `@/shared/types`
- [ ] `npm run build` in frontend directory succeeds
- [ ] `pm2 status` shows both services online
- [ ] Frontend loads in browser without errors

---

**That's it!** If all steps complete successfully, your EC2 instance is updated and ready. 🎉





