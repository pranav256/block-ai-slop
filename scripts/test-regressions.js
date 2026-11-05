const fs = require('fs');
const vm = require('vm');

function loadEngine(fileName) {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(fileName, 'utf8'), sandbox);
  return sandbox.window;
}

const scoring = loadEngine('content/engines/scoringEngine.js').NoSlopScoring;
const cleanAirplaneTag = scoring.calculateScore({
  title: 'Best airplane facts #airplane',
  channelName: 'Aviation Weekly',
  snippet: '',
  cardText: '',
  isVerified: false
}, [], { sensitivityThreshold: 0.50 });

const explicitSlopTag = scoring.calculateScore({
  title: 'AI Drama Story #AIDrama',
  channelName: 'Indie Channel',
  snippet: '',
  cardText: '',
  isVerified: false
}, [], { sensitivityThreshold: 0.50 });

if (cleanAirplaneTag.isBlocked) {
  throw new Error('Unrelated #airplane hashtag was incorrectly blocked');
}
if (!explicitSlopTag.isBlocked) {
  throw new Error('Explicit #AIDrama hashtag was not blocked');
}

const community = loadEngine('content/engines/communityEngine.js').NoSlopCommunity;
community.init(
  [null, 42, '@MyChannel'],
  ['/@RemoteChannel', null, { malformed: true }, '/channel/UC12345678901234567890'],
  []
);

if (!community.isChannelBlocked('Unrelated Name', '/@RemoteChannel').blocked) {
  throw new Error('Community handle lookup failed');
}
if (!community.isChannelBlocked('Unrelated Name', '/channel/UC12345678901234567890').blocked) {
  throw new Error('Community channel ID lookup failed');
}
if (!community.isChannelBlocked('MyChannel').blocked) {
  throw new Error('User channel lookup failed');
}

console.log('All regression checks passed.');
