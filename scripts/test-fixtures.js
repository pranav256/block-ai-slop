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
community.init([], ['/@knownslop'], [], ['@human-ai-channel']);

const keywords = [
  'ai generated', 'ai drama', 'ai video', 'ai story', 'ai voice',
  'sora', 'elevenlabs', 'deepfake', 'text to speech'
].map(keyword => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped.replace(/\s+/g, '[\\s_-]+')}\\b`, 'iu');
});

const fixtures = [
  {
    name: 'Unrelated hashtag remains clean',
    meta: { title: 'Best airplane facts #airplane', channelName: 'Aviation Weekly' },
    expected: false
  },
  {
    name: 'Standalone Sora mention remains clean',
    meta: { title: 'Sora at the museum', channelName: 'Film History' },
    expected: false
  },
  {
    name: 'Explicit Sora generation context blocks',
    meta: { title: 'Sora generated film workflow', channelName: 'AI Video Lab' },
    expected: true
  },
  {
    name: 'Zero-width AI drama is normalized',
    meta: { title: 'A\u200bI Drama: The Billionaire Returns', channelName: 'Drama Feed' },
    expected: true
  },
  {
    name: 'Multilingual semantic pattern blocks',
    meta: { title: 'Video generado por IA: el millonario busca venganza por su esposa', channelName: 'Historias' },
    expected: true
  },
  {
    name: 'Formulaic philosophy title blocks',
    meta: { title: 'Marcus Aurelius: 7 Rules to Become Dangerous', channelName: 'Mindset Feed' },
    expected: true
  },
  {
    name: 'Ordinary astronomy lecture remains clean',
    meta: { title: 'How the James Webb Telescope Changed Astronomy', channelName: 'Science Classroom' },
    expected: false
  },
  {
    name: 'Verified human AI discussion remains clean',
    meta: { title: 'How AI is changing science', channelName: 'StarTalk', isVerified: true },
    expected: false
  }
];

for (const fixture of fixtures) {
  const result = scoring.calculateScore(fixture.meta, keywords, {
    sensitivityThreshold: 0.50,
    whitelistVerified: true,
    blockSyntheticDisclosures: true
  });
  if (result.isBlocked !== fixture.expected) {
    throw new Error(`${fixture.name}: expected ${fixture.expected}, got ${result.isBlocked} (${result.reasons.join(', ')})`);
  }
  console.log(`PASS ${fixture.name}: ${result.isBlocked} (${result.reasons.join(', ') || 'clean'})`);
}

if (!community.isChannelBlocked('Unknown', '/@knownslop').blocked) {
  throw new Error('Known slop handle was not blocked');
}
if (!community.isChannelAllowed('Human AI Channel', '/@human-ai-channel')) {
  throw new Error('Human allowlist handle was not honored');
}

console.log('All detection fixtures passed.');
