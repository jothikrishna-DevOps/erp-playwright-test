# File Naming Changes - Using Test Names Instead of UUIDs

## What Changed

### Before:
- **Folder**: `/storage/tests/{uuid}/test.spec.ts`
  - Example: `/storage/tests/295ad15e-7d01-44a3-97e2-8451759dbea/test.spec.ts`
- **File**: Always named `test.spec.ts`

### After:
- **Folder**: `/storage/tests/{test-name-sanitized}/`
  - Example: `/storage/tests/login-test/`
- **File**: `{test-name-sanitized}.spec.ts`
  - Example: `login-test.spec.ts`

## How It Works

### 1. Name Sanitization

The `sanitizeFileName()` function converts test names to filesystem-safe names:

```typescript
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()                    // "Login Test" → "login test"
    .trim()                           // Remove spaces at start/end
    .replace(/\s+/g, '-')             // Replace spaces with hyphens
    .replace(/[^a-z0-9\-_]/g, '')     // Remove special characters
    .replace(/-+/g, '-')              // Multiple hyphens → single
    .replace(/^-|-$/g, '')            // Remove leading/trailing hyphens
    .substring(0, 100);               // Limit to 100 characters
}
```

**Examples:**
- `"Login Test"` → `"login-test"`
- `"User Registration @2024"` → `"user-registration-2024"`
- `"API Test (v2)"` → `"api-test-v2"`
- `"Test!!!   Name"` → `"test-name"`

### 2. Unique Folder Names

The `getUniqueTestFolder()` function handles duplicate names:

```typescript
async function getUniqueTestFolder(storagePath, testName, testId) {
  const sanitizedName = sanitizeFileName(testName);
  let folderName = sanitizedName;
  let counter = 1;
  
  // If folder exists, append counter
  while (fs.existsSync(path.join(storagePath, 'tests', folderName))) {
    folderName = `${sanitizedName}-${counter}`;
    counter++;
  }
  
  return folderName;
}
```

**Examples:**
- First "Login Test" → `login-test/`
- Second "Login Test" → `login-test-1/`
- Third "Login Test" → `login-test-2/`

## Code Changes Made

### File: `backend/src/routes/tests.ts`

#### 1. Added Helper Functions (Lines 10-40)
- `sanitizeFileName()` - Converts test names to safe filenames
- `getUniqueTestFolder()` - Ensures unique folder names

#### 2. Updated Upload Function (Lines 186-196)
**Before:**
```typescript
const testDir = path.join(storagePath, 'tests', testId);
const targetPath = path.join(testDir, 'test.spec.ts');
```

**After:**
```typescript
const folderName = await getUniqueTestFolder(storagePath, test.name, testId);
const testDir = path.join(storagePath, 'tests', folderName);
const sanitizedFileName = sanitizeFileName(test.name);
const targetPath = path.join(testDir, `${sanitizedFileName}.spec.ts`);
```

#### 3. Updated Download Function (Line 227)
**Before:**
```typescript
res.download(test.filePath, `${test.name}.spec.ts`);
```

**After:**
```typescript
const sanitizedFileName = sanitizeFileName(test.name);
res.download(test.filePath, `${sanitizedFileName}.spec.ts`);
```

#### 4. Updated Delete Function (Lines 248-254)
**Before:**
```typescript
const testDir = path.join(storagePath, 'tests', req.params.id);
```

**After:**
```typescript
const testDir = path.dirname(test.filePath); // Extract from filePath
```

## How File Upload Works

### Complete Flow:

1. **User creates test** (via UI)
   - Test name: "Login Test"
   - Backend creates test record with UUID: `295ad15e-7d01-44a3-97e2-8451759dbea`

2. **Agent receives record command**
   - Agent runs `playwright codegen`
   - Creates file in temp directory: `temp-tests/{testId}/test.spec.ts`

3. **Agent uploads file** (POST `/api/tests/:id/upload`)
   - Backend receives file
   - Gets test record from database (has test name)
   - Sanitizes name: "Login Test" → "login-test"
   - Creates folder: `/storage/tests/login-test/`
   - Saves file as: `/storage/tests/login-test/login-test.spec.ts`
   - Updates database with file path

4. **File is stored on EC2**
   - Location: `/opt/playwright-platform/backend/storage/tests/login-test/login-test.spec.ts`
   - Database stores full path in `file_path` column

## How to Deploy Changes to EC2

### Step 1: Commit and Push Changes

```bash
# On your local machine
cd "/home/isha/Playwright - Agent"
git add backend/src/routes/tests.ts
git commit -m "Use test names for folders and files instead of UUIDs"
git push origin main
```

### Step 2: Connect to EC2

```bash
# Via AWS Session Manager or SSH
# Connect to your EC2 instance
```

### Step 3: Pull Latest Code

```bash
# On EC2
cd ~/erp-playwright-test
git pull origin main
```

### Step 4: Rebuild Backend

```bash
# On EC2
cd ~/erp-playwright-test/backend

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Verify build succeeded
ls -la dist/routes/tests.js
```

### Step 5: Deploy to Production Directory

```bash
# On EC2
cd ~/erp-playwright-test

# Copy built files
sudo cp -r backend/dist /opt/playwright-platform/backend/
sudo cp backend/package.json /opt/playwright-platform/backend/

# Install production dependencies (if needed)
cd /opt/playwright-platform/backend
sudo npm install --production
```

### Step 6: Restart Backend Service

```bash
# On EC2
pm2 restart playwright-backend

# Check status
pm2 status
pm2 logs playwright-backend --lines 20
```

### Step 7: Verify Changes

```bash
# Test the API
curl http://localhost:3005/api/health

# Check if backend is running
pm2 logs playwright-backend | tail -20
```

## Alternative: Use Deployment Script

If you have the deployment script set up:

```bash
# On EC2
cd ~/erp-playwright-test
./deploy/deploy.sh
```

This will:
- Build backend and frontend
- Copy files to `/opt/playwright-platform`
- Restart PM2 processes

## Testing the Changes

### 1. Create a New Test
- Go to UI: `http://your-ec2-dns/record`
- Enter test name: "My Login Test"
- Start recording

### 2. Verify File Structure
```bash
# On EC2
ls -la /opt/playwright-platform/backend/storage/tests/

# Should see folder named: my-login-test/
# Not: 295ad15e-7d01-44a3-97e2-8451759dbea/
```

### 3. Check File Name
```bash
# On EC2
ls -la /opt/playwright-platform/backend/storage/tests/my-login-test/

# Should see: my-login-test.spec.ts
# Not: test.spec.ts
```

### 4. Test Download
- Go to UI dashboard
- Click "Download" on the test
- File should download as: `my-login-test.spec.ts`

## Important Notes

### Existing Tests
- **Old tests** (with UUID folders) will continue to work
- They won't be automatically renamed
- Only **new tests** will use the new naming scheme

### Migration (Optional)
If you want to rename existing tests:

```bash
# On EC2 - Manual migration script
cd /opt/playwright-platform/backend
node << 'EOF'
const sqlite3 = require('sqlite3');
const fs = require('fs');
const path = require('path');

function sanitizeFileName(name) {
  return name.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

const db = new sqlite3.Database('./data/platform.db');
const storagePath = '/opt/playwright-platform/backend/storage';

db.all("SELECT id, name, file_path FROM tests WHERE file_path IS NOT NULL", (err, tests) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  tests.forEach(test => {
    const oldPath = test.file_path;
    if (!oldPath || !fs.existsSync(oldPath)) return;
    
    const sanitizedName = sanitizeFileName(test.name);
    const newDir = path.join(storagePath, 'tests', sanitizedName);
    const newPath = path.join(newDir, `${sanitizedName}.spec.ts`);
    
    // Create new directory
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }
    
    // Copy file
    fs.copyFileSync(oldPath, newPath);
    
    // Update database
    db.run("UPDATE tests SET file_path = ? WHERE id = ?", [newPath, test.id], (err) => {
      if (err) console.error(`Error updating ${test.id}:`, err);
      else console.log(`Migrated: ${test.name} → ${sanitizedName}`);
    });
  });
  
  setTimeout(() => db.close(), 2000);
});
EOF
```

## Troubleshooting

### Issue: "Folder already exists" error
**Solution**: The `getUniqueTestFolder()` function handles this by appending numbers.

### Issue: Special characters in test name
**Solution**: The `sanitizeFileName()` function removes all special characters.

### Issue: Files not appearing with new names
**Solution**: 
1. Make sure you rebuilt the backend
2. Restarted PM2 process
3. Created a NEW test (old tests keep old structure)

### Issue: Download filename has special characters
**Solution**: The download function now uses `sanitizeFileName()` to ensure safe filenames.

## Summary

✅ **Folders**: Now use test names (sanitized) instead of UUIDs
✅ **Files**: Now use test names (sanitized) instead of "test.spec.ts"
✅ **Unique names**: Handles duplicates automatically
✅ **Backward compatible**: Old tests still work
✅ **Safe filenames**: Special characters are removed/escaped

## Files Modified

- `backend/src/routes/tests.ts` - Added sanitization and updated upload/download/delete functions

No changes needed in:
- Agent code (still uploads to same endpoint)
- Frontend code (still works the same)
- Database schema (still stores file_path)

