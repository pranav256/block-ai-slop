const fs = require('fs');
const vm = require('vm');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
for (const file of [
  'content/engines/textNormalization.js',
  'content/engines/semanticEngine.js',
  'content/engines/communityEngine.js',
  'content/engines/scoringEngine.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
}

const scoring = sandbox.window.NoSlopScoring;
const community = sandbox.window.NoSlopCommunity;

community.init(
  ['@BlockedSpamChannel', 'User Bad Mill'],
  ['Tempting Dramas', 'Velvet Romance', 'Drama Diary', 'Next Episode Drama'],
  [],
  ['Human Educational Channel', '@FriendlyCreator']
);

// 1. Clean video should stay clean
const clean1 = scoring.calculateScore({
  title: 'A calm lecture about astronomy and orbital mechanics',
  channelName: 'Science Classroom',
  snippet: 'A teacher explains how orbital mechanics shape satellite missions.'
}, { sensitivityThreshold: 0.50 });
if (clean1.isBlocked) throw new Error('Clean astronomy lecture was falsely blocked');

// 2. Verified creator talking about AI should remain clean
const cleanVerified = scoring.calculateScore({
  title: 'Is AI Hiding Its Full Power? With Geoffrey Hinton',
  channelName: 'StarTalk',
  isVerified: true
}, { sensitivityThreshold: 0.50, whitelistVerified: true });
if (cleanVerified.isBlocked) throw new Error('Verified creator StarTalk was falsely blocked');

// 3. YouTube native synthetic disclosure button should block with 1.0
const syntheticBtn = scoring.calculateScore({
  title: 'Futuristic Cyberpunk City Timelapse',
  channelName: 'Future Visions',
  hasAiInfoButton: true
}, { sensitivityThreshold: 0.50, blockSyntheticDisclosures: true });
if (!syntheticBtn.isBlocked || syntheticBtn.score !== 1.0) {
  throw new Error('YouTube native synthetic disclosure was not blocked');
}

// 4. Formulaic melodrama should be blocked
const melodrama = scoring.calculateScore({
  title: 'I Was His Secret Wife—Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
  channelName: 'Brand New Mill',
  snippet: 'Welcome to brand new - AI-generated mini dramas'
}, { sensitivityThreshold: 0.50 });
if (!melodrama.isBlocked) throw new Error('Melodrama slop was not blocked');

// 5. Sensational science clickbait should be blocked
const scienceSlop = scoring.calculateScore({
  title: 'James Webb Telescope Just Detected Terrifying Secret Signal Broke Physics',
  channelName: 'Space Daily',
  snippet: 'NASA detected something scientists cannot explain'
}, { sensitivityThreshold: 0.50 });
if (!scienceSlop.isBlocked) throw new Error('Sensational science slop was not blocked');

// 6. Community blocklist channel should be blocked
const commBlocked = community.isChannelBlocked('Velvet Romance');
if (!commBlocked.blocked) throw new Error('Community blocklist channel Velvet Romance was not blocked');

// 7. User block override should be blocked
const userBlocked = community.isChannelBlocked('BlockedSpamChannel', '/@BlockedSpamChannel');
if (!userBlocked.blocked) throw new Error('User blocked channel was not blocked');

// 8. User allowlist should be honored
if (!community.isChannelAllowed('Human Educational Channel', '/@FriendlyCreator')) {
  throw new Error('User allowlist was not honored');
}

console.log('All detection and safety fixtures passed.');
