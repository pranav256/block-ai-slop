const fs = require('fs');
const vm = require('vm');

const scoringCode = fs.readFileSync('content/engines/scoringEngine.js', 'utf8');
const communityCode = fs.readFileSync('content/engines/communityEngine.js', 'utf8');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(communityCode, sandbox);
vm.runInContext(scoringCode, sandbox);

const calculateScore = sandbox.window.NoSlopScoring.calculateScore;

const metaAsus = {
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

const res = calculateScore(metaAsus, { sensitivityThreshold: 0.50 });
console.log('ASUS Short Evaluation:');
console.log('  Score:', res.score);
console.log('  isBlocked:', res.isBlocked);
console.log('  Reasons:', res.reasons);
