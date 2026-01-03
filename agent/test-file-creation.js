const fs = require('fs');
const path = require('path');

const testDir = path.join(process.cwd(), 'temp-tests', 'test-check');
const testFile = path.join(testDir, 'test.spec.ts');

// Create directory
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create test file
const content = `import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com');
});
`;

fs.writeFileSync(testFile, content, 'utf-8');

if (fs.existsSync(testFile)) {
  const stats = fs.statSync(testFile);
  console.log('✅ File created successfully!');
  console.log('📁 Location:', testFile);
  console.log('📝 Size:', stats.size, 'bytes');
} else {
  console.log('❌ File creation failed');
}

// Cleanup
setTimeout(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up');
  }
}, 2000);
