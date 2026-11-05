const fs = require('fs');

const blocklist = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));

const channelName = 'Techy Imran';
const channelId = 'UCz3-FpMsEyyGvryZULBLuxA';
console.log('1. Training corpus channel sample:');
const nameMatches = blocklist.channels.filter(c => c.toLowerCase().includes('techy imran') || c.toLowerCase().includes('imran'));
console.log('   Matches for "Techy Imran" or "Imran":', nameMatches);

console.log('\n2. Training corpus channel ID sample:');
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

sandbox.window.NoSlopCommunity.init([], blocklist.channels, []);

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
  badgeText: ''
};

const commResult = sandbox.window.NoSlopCommunity.isChannelBlocked(meta.channelName, meta.channelHref);
console.log('\n3. User override result:', commResult);

const scoringResult = sandbox.window.NoSlopScoring.calculateScore(meta, { sensitivityThreshold: 0.50 });
console.log('4. Statistical scoring result:', scoringResult);
