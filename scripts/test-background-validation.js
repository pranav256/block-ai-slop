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

const sandbox = { chrome, console, fetch: async () => ({ ok: false }), AbortController, TextDecoder, setTimeout, clearTimeout };
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

(async () => {
  const id = 'abcdefghijk';
  const details = { videoId: id, title: 'A title with } braces; "quotes" and \\slashes', author: 'A creator', channelId: 'UCabcdefghijklmnopqrstuv', shortDescription: 'Generated with Kling. A string with { braces } and ; semicolons.' };
  const html = `<script>var ytInitialPlayerResponse = ${JSON.stringify({ playabilityStatus: { status: 'OK' }, videoDetails: details })}; otherCode();</script>`;
  assertMetadata(sandbox.parseVideoMetadata(html, id), details);
  if (sandbox.parseVideoMetadata(html, 'other_video') !== null) throw new Error('Wrong video metadata was accepted');
  if (sandbox.parseVideoMetadata(html.replace('"OK"', '"LOGIN_REQUIRED"'), id) !== null) throw new Error('Restricted video must fail open');
  if (sandbox.parseVideoMetadata('ytInitialPlayerResponse = {broken}', id) !== null) throw new Error('Malformed JSON was accepted');
  let requests = 0;
  sandbox.fetch = async (url, options) => {
    requests++;
    if (options.credentials !== 'omit') throw new Error('Metadata must not include account cookies');
    return new Response(html);
  };
  const [first, second] = await Promise.all([sandbox.getVideoMetadata(id), sandbox.getVideoMetadata(id)]);
  assertMetadata(first, details);
  assertMetadata(second, details);
  await sandbox.getVideoMetadata(id);
  if (requests !== 1) throw new Error('Concurrent and cached requests were not deduplicated');
  await sandbox.getVideoMetadata('https://attacker.example/');
  if (requests !== 1) throw new Error('Untrusted video ID reached fetch');

  let active = 0, maximum = 0;
  const releases = [];
  sandbox.fetch = async () => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => releases.push(resolve));
    active--;
    return new Response('Not found', { status: 404 });
  };
  const jobs = Array.from({ length: 30 }, (_, index) => sandbox.getVideoMetadata(String(index).padStart(11, '0')));
  for (let iteration = 0; iteration < 30; iteration++) {
    releases.splice(0).forEach(resolve => resolve());
    await new Promise(resolve => setImmediate(resolve));
  }
  const results = await Promise.all(jobs);
  if (maximum !== 2 || results.some(result => result !== null)) throw new Error('Concurrency limit or fail-open behavior failed');
  sandbox.fetch = async () => new Response('x'.repeat(3000001));
  if (await sandbox.getVideoMetadata('oversized01') !== null) throw new Error('Oversized response was accepted');
  let limitedRequests = 0;
  sandbox.fetch = async () => { limitedRequests++; return new Response('Rate limited', { status: 429 }); };
  await sandbox.getVideoMetadata('limited0001');
  await sandbox.getVideoMetadata('limited0002');
  if (limitedRequests !== 1) throw new Error('Rate limiting must pause further lookups');
  console.log('Public metadata parsing, credentials, cache, concurrency and failure checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });

function assertMetadata(actual, expected) {
  if (!actual || actual.title !== expected.title || actual.description !== expected.shortDescription || actual.channelId !== expected.channelId) {
    throw new Error('Metadata extraction failed');
  }
}
