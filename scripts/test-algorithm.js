const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadEngines() {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  for (const name of ['textNormalization', 'semanticEngine', 'communityEngine', 'scoringEngine']) {
    vm.runInContext(fs.readFileSync(`content/engines/${name}.js`, 'utf8'), sandbox);
  }
  return sandbox;
}

const sandbox = loadEngines();
const model = sandbox.window.NoSlopSemantic;
const examples = ['orbital satellite mechanics', 'handmade ceramic pottery', 'forest wildlife photography'];
const probe = { title: examples[0], channelName: 'Science Classroom' };
model.initialize(examples, ['cooking lessons']);
const forward = model.predict(probe).evidence.positiveSimilarity;
model.initialize([...examples].reverse(), ['cooking lessons']);
assert.equal(model.predict(probe).evidence.positiveSimilarity, forward, 'Centroids must not depend on training order');

model.initialize(['aaaaa', 'bbbbb', 'ccccc'], ['cooking lessons']);
const before = model.predict({ title: 'bbbbb' }).evidence.positiveSimilarity;
model.initialize(['aaaaa', 'xxxxx', 'ccccc'], ['cooking lessons']);
assert.notEqual(model.predict({ title: 'bbbbb' }).evidence.positiveSimilarity, before, 'Changes in the middle of the corpus must retrain');

model.initialize(Array(7).fill(examples[0]), ['handmade ceramic pottery']);
assert.equal(model.predict(probe).score, 0, 'Too few positive samples must abstain');

model.initialize([], []);
assert.equal(model.predict({ title: 'WOW! WOW! WOW!', snippet: 'WOW! WOW! WOW!' }).score, 0, 'An untrained model must abstain');
model.initialize(Array(8).fill('orbital satellite mechanics'), ['orbital satellite mechanics']);
assert.equal(model.predict(probe).score, 0, 'Equal positive and negative evidence must abstain');
model.initialize(Array(8).fill('orbital satellite mechanics'), ['handmade ceramic pottery']);
assert.ok(model.predict(probe).score >= 0.50, 'Strong trained evidence must remain usable');
assert.equal(model.predict({ title: 'handmade ceramic pottery', channelName: examples[0] }).score, 0, 'Channel similarity cannot overrule negative title evidence');
assert.equal(model.predict(probe).score, model.predict({ ...probe, fullUntruncatedTitle: probe.title }).score, 'Duplicate full titles must not change model features');

const scoring = sandbox.window.NoSlopScoring;
model.initialize([], []);
for (const title of [
  'NASA discovered a new planet with the James Webb telescope',
  'Scientists detected gravitational waves',
  'Marcus Aurelius: 7 Lessons on Personal Resilience',
  'Stoic habits for a calmer daily life',
  'Carl Jung: An introduction to integrating your shadow'
]) {
  assert.equal(scoring.calculateScore({ title, channelName: 'Independent Classroom' }).isBlocked, false, title);
}
for (const title of [
  'James Webb Detected a Terrifying Signal That Broke Physics',
  'Marcus Aurelius: 7 Rules to Become Dangerous and Cold',
  'Dark Psychology Tricks to Make Anyone Obsessed With You'
]) {
  assert.equal(scoring.calculateScore({ title, channelName: 'Unknown Channel' }).isBlocked, true, title);
}
const predict = model.predict;
model.predict = () => { throw new Error('Strong disclosures should skip vectorization'); };
assert.equal(scoring.calculateScore({ title: 'An AI-generated mini drama' }).isBlocked, true);
model.predict = predict;

// Run the actual content-script functions without starting observers or storage hydration.
const noop = () => {};
Object.assign(sandbox, {
  chrome: { runtime: { onMessage: { addListener: noop } }, storage: { onChanged: { addListener: noop } } },
  document: { body: null, addEventListener: noop },
  IntersectionObserver: class { observe() {} unobserve() {} },
  MutationObserver: class { observe() {} },
  setTimeout: noop,
  clearTimeout: noop
});
sandbox.window.addEventListener = noop;
const contentSource = fs.readFileSync('content/content.js', 'utf8');
assert.ok(contentSource.includes('\n  loadSettings();'));
vm.runInContext(contentSource.replace('\n  loadSettings();', '\n  window.test = { extractMetadata, metadataSignature, evaluateVideo, settings };'), sandbox);
const { extractMetadata, metadataSignature, evaluateVideo, settings } = sandbox.window.test;
const community = sandbox.window.NoSlopCommunity;
community.init([], [], [], []);
assert.equal(community.isChannelBlocked('Drama Diary Review Classroom').blocked, false, 'A seeded name substring is not a channel identity');

const titleNode = { textContent: 'NASA discovered a new planet', getAttribute: name => name === 'title' ? 'NASA discovered a new planet' : '' };
const channelLink = { textContent: 'Science Classroom', getAttribute: () => '/@classroom' };
const channelNode = { textContent: 'Science Classroom ✓', matches: () => false, querySelector: () => channelLink };
const card = {
  textContent: 'NASA discovered a new planet Science Classroom',
  querySelector(selector) {
    if (selector.includes('#video-title')) return titleNode;
    if (selector.includes('ytd-channel-name')) return channelNode;
    if (selector.includes('Verified')) return {};
    if (selector.includes('How this content was made')) return {};
    return null;
  },
  querySelectorAll: () => [],
  matches: () => false,
  closest: () => null
};
const meta = extractMetadata(card);
assert.equal(meta.isVerified, true, 'Extract the native verified badge');
assert.equal(meta.hasAiInfoButton, true, 'Extract the native synthetic disclosure');
assert.equal(meta.channelName, 'Science Classroom', 'Channel identity must exclude badge text');
assert.equal(meta.title, titleNode.textContent, 'Do not duplicate identical title attributes');
assert.notEqual(metadataSignature(meta), metadataSignature({ ...meta, isVerified: false }), 'Verification hydration must invalidate the cache');
assert.notEqual(metadataSignature(meta), metadataSignature({ ...meta, hasAiInfoButton: false }), 'Disclosure hydration must invalidate the cache');
const snippetPrefix = 'An introduction to astronomy: ';
assert.notEqual(metadataSignature({ ...meta, snippet: `${snippetPrefix}human lecture` }), metadataSignature({ ...meta, snippet: `${snippetPrefix}AI-generated video` }), 'Snippet changes after 30 characters must invalidate the cache');

(async () => {
  community.init([], ['Science Classroom'], [], []);
  const clean = { title: 'A science lecture', channelName: 'Science Classroom', channelHref: '/@classroom', isVerified: true };
  assert.equal((await evaluateVideo(clean)).isBlocked, false, 'Verification protects against automatic community matches');
  assert.equal((await evaluateVideo({ ...clean, hasAiInfoButton: true })).isBlocked, true, 'A native synthetic disclosure takes priority over verification');
  settings.blockSyntheticDisclosures = false;
  assert.equal((await evaluateVideo({ ...clean, hasAiInfoButton: true })).isBlocked, false, 'Respect the native-disclosure toggle');
  settings.blockSyntheticDisclosures = true;
  settings.whitelistVerified = false;
  assert.equal((await evaluateVideo(clean)).isBlocked, true, 'Respect the verified-protection toggle');
  settings.whitelistVerified = true;

  community.init(['@classroom'], [], [], []);
  settings.engineCommunity = false;
  assert.equal((await evaluateVideo(clean)).isBlocked, true, 'Personal blocks work with the community engine disabled');
  community.init(['@classroom'], [], [], ['@classroom']);
  assert.equal((await evaluateVideo({ ...clean, hasAiInfoButton: true })).isBlocked, false, 'Personal allow choices take priority');
  const channelId = 'UCabcdefghijklmnopqrstuv';
  community.init([channelId], [], [], []);
  assert.equal((await evaluateVideo({ ...clean, channelHref: `/channel/${channelId}` })).isBlocked, true, 'Personal channel-ID blocks work');
  settings.engineCommunity = true;
  community.init([], [], [], []);
  assert.equal((await evaluateVideo({ title: 'ASUS ExpertBook P5 review', channelName: 'Techy Imran', isShort: true })).isBlocked, false, 'Clean Shorts remain visible');
  console.log('Algorithm math, creator safety, and live-pipeline regressions passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
