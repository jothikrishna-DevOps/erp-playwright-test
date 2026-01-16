#!/bin/bash

# Fix script for frontend build issues on EC2
# Run this on EC2: bash deploy/fix-frontend-build.sh

set -e

cd ~/erp-playwright-test

echo "🔍 Checking current state..."

# Check import paths
echo "Current import paths:"
grep -n "from.*shared/types" frontend/src/app/page.tsx frontend/src/app/record/page.tsx frontend/src/lib/api.ts || echo "No matches found"

# Check if shared folder exists
if [ ! -d "frontend/src/shared" ]; then
  echo "📁 Creating frontend/src/shared directory..."
  mkdir -p frontend/src/shared
  cp -r shared/* frontend/src/shared/
  echo "✅ Shared folder copied"
else
  echo "✅ Shared folder already exists"
fi

# Update import paths to use @/shared/types (if they're still using old paths)
echo "🔄 Updating import paths..."
cd frontend/src

# Update all files to use @/shared/types
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" app/page.tsx 2>/dev/null || true
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" app/record/page.tsx 2>/dev/null || true
sed -i "s|from '../../shared/types'|from '@/shared/types'|g" lib/api.ts 2>/dev/null || true

# Also handle other possible variations
sed -i "s|from '\.\.\/\.\.\/shared\/types'|from '@/shared/types'|g" app/page.tsx 2>/dev/null || true
sed -i "s|from '\.\.\/\.\.\/shared\/types'|from '@/shared/types'|g" app/record/page.tsx 2>/dev/null || true
sed -i "s|from '\.\.\/\.\.\/shared\/types'|from '@/shared/types'|g" lib/api.ts 2>/dev/null || true

cd ../..

echo "✅ Import paths updated"

# Verify the changes
echo ""
echo "📋 Verifying import paths:"
grep -n "from.*shared/types" frontend/src/app/page.tsx frontend/src/app/record/page.tsx frontend/src/lib/api.ts

# Clear Next.js cache
echo ""
echo "🧹 Clearing Next.js cache..."
cd frontend
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null || true
cd ..

# Verify shared folder structure
echo ""
echo "📁 Verifying shared folder:"
ls -la frontend/src/shared/ || echo "❌ Shared folder not found!"

# Build
echo ""
echo "🔨 Building frontend..."
cd frontend
npm run build

echo ""
echo "✅ Build complete!"





