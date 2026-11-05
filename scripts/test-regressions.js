const fs = require('fs');
const vm = require('vm');

function loadEngine(fileName) {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(fileName, 'utf8'), sandbox);
  return sandbox.window;
}

const community = loadEngine('content/engines/communityEngine.js').NoSlopCommunity;
community.init(['@MyChannel'], [], ['@HumanChannel']);

if (!community.isChannelBlocked('MyChannel').blocked) {
  throw new Error('User block override failed');
}
if (community.isChannelBlocked('Unknown Channel').blocked) {
  throw new Error('Unknown channel was directly blocked');
}
if (!community.isChannelAllowed('Human Channel', '/@HumanChannel')) {
  throw new Error('User allowlist failed');
}

console.log('Statistical blocking regressions passed.');
