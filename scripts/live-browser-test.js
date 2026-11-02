const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const EXT_PATH = 'D:\\block-ai-slop';
const TEMP_PROFILE = 'C:\\Users\\Pranav\\AppData\\Local\\Temp\\noslop-test-profile';

console.log('🚀 Starting live browser test with Brave and NoSlop extension...');

// Clean temp profile if exists
if (fs.existsSync(TEMP_PROFILE)) {
  try {
    fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
  } catch {}
}

const args = [
  `--remote-debugging-port=9222`,
  `--user-data-dir=${TEMP_PROFILE}`,
  `--load-extension=${EXT_PATH}`,
  `--disable-gpu`,
  `--no-first-run`,
  `--no-default-browser-check`,
  'about:blank'
];

const browser = spawn(BRAVE_PATH, args, { stdio: 'ignore' });

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  // Wait for browser debugging port
  let connected = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const list = await getJson('http://localhost:9222/json/list');
      if (list && list.length > 0) {
        connected = true;
        console.log('✅ Connected to Brave debugging endpoint on port 9222.');
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error('❌ Failed to connect to browser on port 9222');
    browser.kill();
    process.exit(1);
  }

  const list = await getJson('http://localhost:9222/json/list');
  console.log(`Found ${list.length} browser targets:`);
  for (const t of list) {
    console.log(`  - [${t.type}] ${t.title} (${t.url})`);
  }

  // Find extension background / popup or page
  const extTarget = list.find(t => t.url.includes(EXT_PATH) || t.title.includes('NoSlop'));
  if (extTarget) {
    console.log(`✅ NoSlop Extension Service Worker active: ${extTarget.url}`);
  }

  // Close browser after check
  console.log('Closing test browser...');
  browser.kill();
  console.log('Test completed.');
}

run().catch(err => {
  console.error('Test error:', err);
  browser.kill();
});
