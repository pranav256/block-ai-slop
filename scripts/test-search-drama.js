const fs = require('fs');
global.window = {};
require('../content/engines/textNormalization.js');
require('../content/engines/semanticEngine.js');
require('../content/engines/communityEngine.js');
require('../content/engines/scoringEngine.js');

const bl = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));
window.NoSlopCommunity.init([], bl.channels, [], []);

const sample1 = {
  title: 'I Was His Secret Wife—Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
  channelName: 'Tempting Dramas',
  snippet: 'Welcome to Tempting Dramas - Where Love Meets Temptation. ❤️ Dive into unforgettable AI-generated mini dramas filled with...',
  isVerified: false
};

const sampleOnlyTitle = {
  title: 'I Was His Secret Wife—Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
  channelName: 'Unknown Mill',
  snippet: '',
  isVerified: false
};

const sample2 = {
  title: '【FULL】Betrayed by Ex, I Married a Mafia Boss 💔',
  channelName: 'Next Episode Drama',
  snippet: 'This is a fictional scripted drama. All scenes are created for narrative and artistic purposes only, without any intention of sexual...',
  isVerified: false
};

const sampleTop = {
  title: 'NOW THREE GENIUS KIDS CALL HER MOM - FULL AI DRAMA!',
  channelName: 'Drama Channel',
  snippet: 'Business Genius Tech Genius Medical Genius Are They His Kids? 7 videos',
  isVerified: false
};

const cleanStarTalk = {
  title: 'Is AI Hiding Its Full Power? With Geoffrey Hinton',
  channelName: 'StarTalk',
  snippet: 'Neil deGrasse Tyson and Geoffrey Hinton discuss the future of artificial intelligence.',
  isVerified: true
};

const cleanLaptopReview = {
  title: 'ASUS ExpertBook P5 (2024) - Real World Review & Benchmarks',
  channelName: 'Techy Imran',
  snippet: 'Full review of the Asus ExpertBook P5 with Intel Core Ultra 7 processor.',
  isVerified: false
};

function evaluate(card) {
  const commCheck = window.NoSlopCommunity.isChannelBlocked(card.channelName);
  if (commCheck.blocked) {
    return { isBlocked: true, score: 1.0, reason: commCheck.source };
  }
  return window.NoSlopScoring.calculate(card, {
    sensitivityThreshold: 0.50,
    whitelistVerified: true,
    blockSyntheticDisclosures: true
  });
}

console.log('Sample 1 (Tempting Dramas):', evaluate(sample1));
console.log('Sample 1 (Title only, no snippet):', evaluate(sampleOnlyTitle));
console.log('Sample 2 (Next Episode Drama):', evaluate(sample2));
console.log('Sample Top (Genius Kids):', evaluate(sampleTop));
console.log('Clean Control (StarTalk):', evaluate(cleanStarTalk));
console.log('Clean Control (Techy Imran Laptop):', evaluate(cleanLaptopReview));

if (!evaluate(sample1).isBlocked) throw new Error('Sample 1 should be blocked');
if (!evaluate(sampleOnlyTitle).isBlocked) throw new Error('Sample 1 title only should be blocked');
if (!evaluate(sample2).isBlocked) throw new Error('Sample 2 should be blocked');
if (!evaluate(sampleTop).isBlocked) throw new Error('Sample Top should be blocked');
if (evaluate(cleanStarTalk).isBlocked) throw new Error('StarTalk should remain clean');
if (evaluate(cleanLaptopReview).isBlocked) throw new Error('Laptop review should remain clean');

console.log('All search drama tests passed successfully!');
