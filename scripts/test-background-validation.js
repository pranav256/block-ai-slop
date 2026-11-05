const fs = require('fs');
const vm = require('vm');

const noopEvent = { addListener: () => {} };
let messageHandler;
const chrome = {
  storage: {
    local: { get: async () => ({}), set: async () => {} },
    sync: { get: (_, callback) => callback({}), set: async () => {} }
  },
  runtime: {
    onInstalled: noopEvent,
    onStartup: noopEvent,
    onMessage: { addListener: handler => { messageHandler = handler; } }
  },
  alarms: { create: async () => {}, onAlarm: noopEvent },
  tabs: { onUpdated: noopEvent, onRemoved: noopEvent, sendMessage: () => {} },
  action: { setBadgeBackgroundColor: () => {}, setBadgeText: () => {} }
};

const sandbox = { chrome, console, fetch: async () => ({ ok: false }) };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('background/background.js', 'utf8'), sandbox);

const valid = sandbox.validateBlocklist({
  version: '2.1.0',
  updatedAt: '2026-11-03T00:00:00.000Z',
  channelsCount: 2,
  channels: [' Alpha ', 'Alpha', '@Beta']
});

if (!valid || valid.channels.length !== 2) {
  throw new Error('Valid blocklist was not normalized and deduplicated');
}
const bundled = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));
const bundledResult = sandbox.validateBlocklist(bundled);
if (!bundledResult || bundledResult.channels.length !== bundled.channelsCount) {
  throw new Error('Bundled blocklist failed validation');
}
if (sandbox.validateBlocklist({ version: '2', updatedAt: valid.updatedAt, channels: ['x'] })) {
  throw new Error('Malformed version was accepted');
}
if (sandbox.validateBlocklist({ version: '2.1.0', updatedAt: valid.updatedAt, channelsCount: 99, channels: ['x'] })) {
  throw new Error('Mismatched channel count was accepted');
}
if (sandbox.validateBlocklist({ version: '2.1.0', updatedAt: 'invalid', channels: ['x'] })) {
  throw new Error('Malformed timestamp was accepted');
}
if (sandbox.compareVersions('2.0.0', '1.9.9') <= 0 || sandbox.compareVersions('1.0.0', '1.0.0') !== 0) {
  throw new Error('Version comparison failed');
}

let countResponse;
messageHandler(
  { action: 'tabCountSync', count: 4 },
  { tab: { id: 12 } },
  response => { countResponse = response; }
);
if (countResponse?.currentTabCount !== 4) {
  throw new Error('Tab count sync failed');
}

messageHandler(
  { action: 'tabCountSync', count: -2 },
  { tab: { id: 12 } },
  response => { countResponse = response; }
);
if (countResponse?.currentTabCount !== 0) {
  throw new Error('Negative tab count was not clamped');
}

console.log('Background blocklist validation checks passed.');
