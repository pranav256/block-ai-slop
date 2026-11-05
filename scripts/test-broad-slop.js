const fs = require('fs');
global.window = {};
require('../content/engines/textNormalization.js');
require('../content/engines/semanticEngine.js');
require('../content/engines/communityEngine.js');
require('../content/engines/scoringEngine.js');

const bl = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));
window.NoSlopCommunity.init([], bl.channels, [], [
  'Einzelgänger', 'Pursuit of Wonder', 'Philosophize This!', 'Veritasium', 'Kurzgesagt – In a Nutshell'
]);

const TEST_CASES = [
  {
    name: 'Marcus Aurelius 7 Rules to Become Dangerous',
    meta: {
      title: 'Marcus Aurelius: 7 Rules to Become Dangerous and Cold',
      channelName: 'Sigma Mindset Daily',
      snippet: 'Ancient Stoic secrets to make your enemies fear you.'
    },
    expectedBlocked: true
  },
  {
    name: 'Dark Psychology Tricks to Make Anyone Obsessed',
    meta: {
      title: 'Dark Psychology Tricks to Make Anyone Obsessed With You',
      channelName: 'Dark Wisdom Hub',
      snippet: 'Dangerous psychological hacks to destroy someone\'s ego.'
    },
    expectedBlocked: true
  },
  {
    name: 'Carl Jung Integrate Your Shadow',
    meta: {
      title: 'Carl Jung: Integrate Your Shadow and Become Untouchable',
      channelName: 'Shadow Archetype',
      snippet: 'Carl Jung lessons to become unbothered and cold.'
    },
    expectedBlocked: true
  },
  {
    name: 'How to Be Cold and Emotionless - Sigma Male',
    meta: {
      title: 'How to Be Cold and Emotionless Like a True Stoic',
      channelName: 'Stoic Matrix AI',
      snippet: '7 habits of highly dangerous and unbothered men.'
    },
    expectedBlocked: true
  },
  {
    name: 'Einzelgänger: Stoicism as a Way of Life',
    meta: {
      title: 'Stoicism as a Way of Life - Seneca, Epictetus, Marcus Aurelius',
      channelName: 'Einzelgänger',
      snippet: 'An introduction to the philosophy of Stoicism and living virtuously.',
      isVerified: true
    },
    expectedBlocked: false
  },
  {
    name: 'Pursuit of Wonder: The Meaning of Sisyphus',
    meta: {
      title: 'Albert Camus and The Myth of Sisyphus: Overcoming the Absurd',
      channelName: 'Pursuit of Wonder',
      snippet: 'An essay on existentialism and finding meaning in a meaningless world.',
      isVerified: true
    },
    expectedBlocked: false
  },
  {
    name: 'Philosophize This! (Educational Creator)',
    meta: {
      title: 'Episode 180 - The Philosophy of Mind and Artificial Thought',
      channelName: 'Philosophize This!',
      snippet: 'Stephen West explores the history of cognitive philosophy.',
      isVerified: false
    },
    expectedBlocked: false
  },
  {
    name: 'James Webb Terrifying Discovery Broke Physics',
    meta: {
      title: 'James Webb Telescope Just Detected Terrifying Secret Signal Broke Physics',
      channelName: 'Cosmo Space AI',
      snippet: 'NASA astronomers cannot explain what they just discovered in deep space.'
    },
    expectedBlocked: true
  },
  {
    name: 'Scientists Terrified of Antarctica',
    meta: {
      title: 'Scientists Detected Terrifying Object Deep Under Antarctica Ice',
      channelName: 'Mystery Science Hub',
      snippet: 'What NASA and astronomers are hiding about Antarctica.'
    },
    expectedBlocked: true
  },
  {
    name: 'Veritasium: How James Webb Telescope Changed Astronomy',
    meta: {
      title: 'How The James Webb Space Telescope Actually Works',
      channelName: 'Veritasium',
      snippet: 'Derek Muller visits the clean rooms and explains the engineering of JWST.',
      isVerified: true
    },
    expectedBlocked: false
  },
  {
    name: 'Kurzgesagt: Mariana Trench',
    meta: {
      title: 'What Is Hiding at the Bottom of the Mariana Trench?',
      channelName: 'Kurzgesagt – In a Nutshell',
      snippet: 'A colorful animated deep dive into the deepest part of the ocean.',
      isVerified: true
    },
    expectedBlocked: false
  },
  {
    name: 'Reddit AITA cheating wife ElevenLabs',
    meta: {
      title: 'r/AITA for leaving my cheating wife after 10 years of marriage? Update:',
      channelName: 'Reddit AI Stories',
      snippet: 'Voiced with ElevenLabs. Minecraft parkour gameplay background.'
    },
    expectedBlocked: true
  },
  {
    name: 'Behind #drama Velvet Romance',
    meta: {
      title: 'Behind 🔥 #drama',
      channelName: 'Velvet Romance',
      snippet: 'AI generated short series about betrayal and revenge.'
    },
    expectedBlocked: true
  },
  {
    name: 'I Was His Secret Wife - Tempting Dramas',
    meta: {
      title: 'I Was His Secret Wife—Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
      channelName: 'Tempting Dramas',
      snippet: 'Dive into unforgettable AI-generated mini dramas.'
    },
    expectedBlocked: true
  }
];

let failed = 0;
for (const tc of TEST_CASES) {
  let blocked = false;
  let reason = 'Clean';
  let score = 0;

  if (window.NoSlopCommunity.isChannelAllowed(tc.meta.channelName)) {
    blocked = false;
    reason = 'Allowed';
  } else {
    const commCheck = window.NoSlopCommunity.isChannelBlocked(tc.meta.channelName);
    if (commCheck.blocked) {
      blocked = true;
      score = 1.0;
      reason = commCheck.source;
    } else {
      const res = window.NoSlopScoring.calculate(tc.meta, {
        sensitivityThreshold: 0.50,
        whitelistVerified: true,
        blockSyntheticDisclosures: true
      });
      blocked = res.isBlocked;
      score = res.score;
      reason = res.reasons.join(' + ') || 'Clean';
    }
  }

  const pass = (blocked === tc.expectedBlocked);
  const mark = pass ? '✅' : '❌';
  console.log(`${mark} [${tc.name}]: Blocked=${blocked} (Expected=${tc.expectedBlocked}) | Score=${score} | Reason=${reason}`);
  if (!pass) failed++;
}

if (failed > 0) {
  throw new Error(`${failed} broad slop tests failed!`);
}

console.log('\nResult: ALL BROAD SLOP TESTS PASSED!');
