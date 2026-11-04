const fs = require('fs');

const blocklist = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));

const channelName = 'Techy Imran';
const channelId = 'UCz3-FpMsEyyGvryZULBLuxA';
const videoId = '1GpyOA5SdAE';

console.log('1. Check Blocklist for Video ID:');
console.log('   Video ID blocked:', blocklist.videoIds ? blocklist.videoIds.includes(videoId) : false);

console.log('\n2. Check Blocklist for Channel Name:');
const nameMatches = blocklist.channels.filter(c => c.toLowerCase().includes('techy imran') || c.toLowerCase().includes('imran'));
console.log('   Matches for "Techy Imran" or "Imran":', nameMatches);

console.log('\n3. Check Blocklist for Channel ID:');
const idMatches = blocklist.channels.filter(c => c.includes(channelId));
console.log('   Channel ID in blocklist:', idMatches);

// Now test scoringEngine
const vm = require('vm');
const scoringCode = fs.readFileSync('content/engines/scoringEngine.js', 'utf8');
const communityCode = fs.readFileSync('content/engines/communityEngine.js', 'utf8');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(communityCode, sandbox);
vm.runInContext(scoringCode, sandbox);

sandbox.window.NoSlopCommunity.init([], blocklist.channels, blocklist.videoIds);

const meta = {
  title: 'ASUS Expertbook P1 Intel Core 5 210H - Best laptops under ₹60,000 🔥 #Laptop',
  fullUntruncatedTitle: 'ASUS Expertbook P1 Intel Core 5 210H - Best laptops under ₹60,000 🔥 #Laptop',
  channelName: 'Techy Imran',
  channelHref: '/@TechyImran',
  videoId: '1GpyOA5SdAE',
  isVerified: false,
  isShort: true,
  snippet: 'ASUS Expertbook P1 Intel Core 5 210H - Best laptops under ₹60,000 🔥 #Laptop',
  cardText: 'ASUS Expertbook P1 Intel Core 5 210H - Best laptops under ₹60,000 🔥 #Laptop Techy Imran',
  hasAiInfoButton: false,
  badgeText: ''
};

const commResult = sandbox.window.NoSlopCommunity.isChannelBlocked(meta.channelName, meta.channelHref);
console.log('\n4. Community check result:', commResult);

const scoringResult = sandbox.window.NoSlopScoring.calculateScore(meta, [], { sensitivityThreshold: 0.50, whitelistVerified: true });
console.log('5. Scoring check result:', scoringResult);
