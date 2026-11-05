const fs = require('fs');
global.window = {};
require('../content/engines/textNormalization.js');
require('../content/engines/semanticEngine.js');
require('../content/engines/communityEngine.js');
require('../content/engines/scoringEngine.js');

const DEFAULT_KEYWORDS = [
  'ai generated', 'ai-generated', 'ai drama', 'ai-drama', 'ai dub',
  'ai dubbed', 'ai romance', 'ai series', 'ai recap', 'ai video',
  'ai animation', 'ai animated', 'ai film', 'ai movie', 'ai story',
  'ai stories', 'ai voice', 'ai cover', 'ai song', 'ai slop',
  'made with ai', 'created with ai', 'minidrama', 'mini drama',
  'short drama', 'sora', 'kling', 'runway gen', 'runwayml',
  'elevenlabs', 'luma dream machine', 'pika labs', 'flux.1',
  'flux ai', 'haiper', 'stable diffusion', 'stablediffusion',
  'deepfake', 'synthesia', 'heygen', 'minimax', 'hailuo', 'suno ai',
  'udio ai', 'ai philosophy', 'ai stoic', 'ai stoicism', 'ai quotes',
  'ai motivation', 'ai psychology', 'dark psychology ai',
  'faceless channel', 'chatgpt stories', 'reddit ai', 'ai facts'
];

function buildKeywordRegex(kw) {
  const clean = kw.trim();
  if (!clean) return null;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escaped.startsWith('#')) {
    return new RegExp('(?:^|[^a-zA-Z0-9])' + escaped + '(?=[^a-zA-Z0-9]|$)', 'iu');
  }
  return new RegExp('\\b' + escaped.replace(/\\s+/g, '[\\s_-]+') + '\\b', 'iu');
}

const compiledRegexes = DEFAULT_KEYWORDS.map(buildKeywordRegex).filter(Boolean);

const sample1 = {
  title: 'I Was His Secret Wife—Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
  channelName: 'Tempting Dramas',
  snippet: 'Welcome to Tempting Dramas - Where Love Meets Temptation. ❤️ Dive into unforgettable AI-generated mini dramas filled with...',
  isVerified: false
};


const sampleOnlyTitle = {
  title: 'I Was His Secret Wife—Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
  channelName: 'Tempting Dramas',
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

// Also test human creator controls to ensure ZERO false positives
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


console.log('Sample 1 (Tempting Dramas):', window.NoSlopScoring.calculateScore(sample1, compiledRegexes, { blockSyntheticDisclosures: true, whitelistVerified: true }));
console.log('Sample 1 (Title only, no snippet):', window.NoSlopScoring.calculateScore(sampleOnlyTitle, compiledRegexes, { blockSyntheticDisclosures: true, whitelistVerified: true }));
console.log('Sample 2 (Next Episode Drama):', window.NoSlopScoring.calculateScore(sample2, compiledRegexes, { blockSyntheticDisclosures: true, whitelistVerified: true }));
console.log('Sample Top (Genius Kids):', window.NoSlopScoring.calculateScore(sampleTop, compiledRegexes, { blockSyntheticDisclosures: true, whitelistVerified: true }));
console.log('Clean Control (StarTalk):', window.NoSlopScoring.calculateScore(cleanStarTalk, compiledRegexes, { blockSyntheticDisclosures: true, whitelistVerified: true }));
console.log('Clean Control (Techy Imran Laptop):', window.NoSlopScoring.calculateScore(cleanLaptopReview, compiledRegexes, { blockSyntheticDisclosures: true, whitelistVerified: true }));
