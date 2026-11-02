const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const stageDir = path.join(distDir, 'stage');

console.log('🚀 Building production ZIP for Chrome Web Store...');

// 1. Create dist and stage directories
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// 2. Validate manifest.json
const manifestPath = path.join(rootDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) {
  throw new Error('Manifest version must be 3 for Chrome Web Store!');
}
if (manifest.description.length > 132) {
  throw new Error(`Manifest description exceeds 132 chars (${manifest.description.length})!`);
}
console.log(`✅ Manifest V3 validated: version ${manifest.version}, desc length ${manifest.description.length}`);

// 3. Define runtime files to include
const filesToCopy = [
  'manifest.json',
  'community-blocklist.json',
  'LICENSE'
];

const dirsToCopy = [
  'background',
  'content',
  'popup',
  'icons'
];

for (const f of filesToCopy) {
  const src = path.join(rootDir, f);
  const dest = path.join(stageDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  + ${f}`);
  }
}

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

for (const d of dirsToCopy) {
  const src = path.join(rootDir, d);
  const dest = path.join(stageDir, d);
  if (fs.existsSync(src)) {
    copyDirRecursive(src, dest);
    console.log(`  + ${d}/`);
  }
}

// 4. Create ZIP package using PowerShell Compress-Archive
const zipName = `noslop-v${manifest.version}-chrome-web-store.zip`;
const zipPath = path.join(distDir, zipName);

console.log(`\n📦 Compressing into ${zipName}...`);
const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`;
execSync(psCmd);

// Clean up staging directory
fs.rmSync(stageDir, { recursive: true, force: true });

const stats = fs.statSync(zipPath);
console.log(`\n✨ Build Complete!`);
console.log(`   Output: ${zipPath}`);
console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB (${(stats.size / (1024*1024)).toFixed(2)} MB)`);
