const fs = require('fs');
global.window = {};
require('../content/engines/textNormalization.js');
require('../content/engines/semanticEngine.js');
require('../content/engines/communityEngine.js');
require('../content/engines/scoringEngine.js');

const bl = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));
window.NoSlopCommunity.init([], bl.channels, [], []);

function testVideo(name, meta, expectedBlocked) {
  let isBlocked = false;
  let reason = 'Clean';
  let score = 0;

  const commCheck = window.NoSlopCommunity.isChannelBlocked(meta.channelName, meta.channelHref);
  if (commCheck.blocked) {
    isBlocked = true;
    score = 1.0;
    reason = commCheck.source;
  } else {
    const res = window.NoSlopScoring.calculate(meta, {
      sensitivityThreshold: 0.50,
      whitelistVerified: true,
      blockSyntheticDisclosures: true
    });
    isBlocked = res.isBlocked;
    score = res.score;
    reason = res.reasons.join(' + ') || 'Clean';
  }

  console.log(`${name}: Blocked=${isBlocked} | Score=${score} | Reason=${reason}`);
  if (isBlocked !== expectedBlocked) {
    throw new Error(`Test failed for "${name}": expected ${expectedBlocked}, got ${isBlocked}`);
  }
}

testVideo('Video 1: Behind #drama (Velvet Romance)', {
  title: 'Behind 🔥 #drama',
  channelName: 'Velvet Romance',
  snippet: 'Drama series'
}, true);

testVideo('Video 2: He Thought His Plan Was Perfect!#ai (Drama Diary)', {
  title: '💔 He Thought His Plan Was Perfect!#ai',
  channelName: 'Drama Diary',
  snippet: 'Emotional drama'
}, true);

testVideo('Video 3: I Was His Secret Wife (Tempting Dramas)', {
  title: 'I Was His Secret Wife—Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
  channelName: 'Tempting Dramas',
  snippet: 'AI-generated mini dramas'
}, true);

testVideo('Video 4: Betrayed by Ex, I Married a Mafia Boss (Next Episode Drama)', {
  title: '【FULL】Betrayed by Ex, I Married a Mafia Boss 💔',
  channelName: 'Next Episode Drama',
  snippet: 'This is a fictional scripted drama.'
}, true);

testVideo('Video 5: Three Genius Kids Call Her Mom', {
  title: 'NOW THREE GENIUS KIDS CALL HER MOM - FULL AI DRAMA!',
  channelName: 'Brand New Channel',
  snippet: '7 videos'
}, true);

testVideo('Safe Video 1: StarTalk Geoffrey Hinton', {
  title: 'Is AI Hiding Its Full Power? With Geoffrey Hinton',
  channelName: 'StarTalk',
  snippet: 'Neil deGrasse Tyson interview',
  isVerified: true
}, false);

testVideo('Safe Video 2: Diary of a CEO Geoffrey Hinton', {
  title: 'AI Godfather: "I Saw What Comes Next & It Terrifies Me!" Geoffrey Hinton',
  channelName: 'The Diary Of A CEO',
  snippet: 'Steven Bartlett interview',
  isVerified: true
}, false);

console.log('All detection tests passed successfully!');
