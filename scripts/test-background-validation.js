const fs = require('fs');
const vm = require('vm');

const noopEvent = { addListener: () => {} };
const chrome = {
  storage: {
    local: { get: async () => ({}), set: async () => {} },
    sync: { get: (_, callback) => callback({}), set: async () => {} }
  },
  runtime: { onInstalled: noopEvent, onStartup: noopEvent, onMessage: noopEvent },
  alarms: { create: async () => {}, onAlarm: noopEvent },
  tabs: { onUpdated: noopEvent, onRemoved: noopEvent },
  action: { setBadgeBackgroundColor: () => {}, setBadgeText: () => {} }
};

const sandbox = { chrome, console, fetch: async () => ({ ok: false }) };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('background/background.js', 'utf8'), sandbox);

const valid = sandbox.validateBlocklist({
  version: '2.1.0',
  updatedAt: '2026-11-03T00:00:00.000Z',
  channels: [' Alpha ', 'Alpha', '@Beta'],
  videoIds: ['abc123', 'abc123', 'bad!']
});

if (!valid || valid.channels.length !== 2 || valid.videoIds.length !== 1) {
  throw new Error('Valid blocklist was not normalized and deduplicated');
}
if (sandbox.validateBlocklist({ version: '2', updatedAt: valid.updatedAt, channels: ['x'] })) {
  throw new Error('Malformed version was accepted');
}
if (sandbox.validateBlocklist({ version: '2.1.0', updatedAt: 'invalid', channels: ['x'] })) {
  throw new Error('Malformed timestamp was accepted');
}
if (sandbox.compareVersions('2.0.0', '1.9.9') <= 0 || sandbox.compareVersions('1.0.0', '1.0.0') !== 0) {
  throw new Error('Version comparison failed');
}

console.log('Background blocklist validation checks passed.');
