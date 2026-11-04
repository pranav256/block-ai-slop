const fs = require('fs');
const vm = require('vm');

let scoringCode = fs.readFileSync('content/engines/scoringEngine.js', 'utf8');

// Also load communityEngine
const communityCode = fs.readFileSync('content/engines/communityEngine.js', 'utf8');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(communityCode, sandbox);
vm.runInContext(scoringCode, sandbox);

const calculateScore = sandbox.window.NoSlopScoring.calculateScore;
const isChannelBlocked = sandbox.window.NoSlopCommunity.isChannelBlocked;

const DEFAULT_KEYWORDS = [
  'ai generated', 'ai-generated', 'ai drama', 'ai-drama', 'ai dub', 'ai dubbed',
  'ai romance', 'ai series', 'ai recap', 'ai video', 'ai animation', 'ai animated',
  'ai film', 'ai movie', 'ai story', 'ai stories', 'ai voice', 'ai cover', 'ai song',
  'ai slop', 'made with ai', 'created with ai', 'minidrama', 'mini drama', 'short drama'
];

function buildKeywordRegex(kw) {
  const clean = kw.trim();
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escaped.startsWith('#')) return new RegExp('(?:^|[^\\w])' + escaped + '(?=[^\\w]|$)', 'iu');
  return new RegExp('\\b' + escaped.replace(/\\s+/g, '[\\s_-]+') + '\\b', 'iu');
}

const compiled = DEFAULT_KEYWORDS.map(buildKeywordRegex).filter(Boolean);

const testCases = [
  {
    name: 'Video 1: Behind #drama (Velvet Romance)',
    meta: {
      title: 'Behind 🔥 #drama',
      fullUntruncatedTitle: 'Behind 🔥 #drama',
      channelName: 'Velvet Romance',
      snippet: 'Watch the complete AI-generated romance drama from Velvet Romance A cinematic love story filled with betrayal, obsession...',
      cardText: 'Behind 🔥 #drama 1.6M 10d ago Velvet Romance Watch the complete AI-generated romance drama from Velvet Romance A cinematic love story filled with betrayal, obsession...',
      isVerified: false
    }
  },
  {
    name: 'Video 2: He Thought His Plan Was Perfect!#ai (Drama Diary)',
    meta: {
      title: '💔 He Thought His Plan Was Perfect... But His Wife Knew Everything!#ai',
      fullUntruncatedTitle: '💔 He Thought His Plan Was Perfect... But His Wife Knew Everything!#ai',
      channelName: 'Drama Diary',
      snippet: 'English Dub AI Drama ❤️ Welcome to the world of Drama Diary! Enjoy the full series without interruptions ✨ This video uses...',
      cardText: '💔 He Thought His Plan Was Perfect... But His Wife Knew Everything!#ai 96K 4d ago Drama Diary English Dub AI Drama ❤️ Welcome to the world of Drama Diary! Enjoy the full series without interruptions ✨ This video uses...',
      isVerified: false
    }
  },
  {
    name: 'Video 3: I Was His Secret Wife Mafia Banquet!#minidrama #ai (Tempting Dramas)',
    meta: {
      title: 'I Was His Secret Wife-Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
      fullUntruncatedTitle: 'I Was His Secret Wife-Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai',
      channelName: 'Tempting Dramas',
      snippet: 'Welcome to Tempting Dramas - Where Love Meets Temptation. ❤️ Dive into unforgettable AI-generated mini dramas filled with...',
      cardText: 'I Was His Secret Wife-Until He Gave My Seat to Another Woman at the Mafia Banquet!#minidrama #ai 53K 3d ago Tempting Dramas Welcome to Tempting Dramas - Where Love Meets Temptation. ❤️ Dive into unforgettable AI-generated mini dramas filled with...',
      isVerified: false
    }
  },
  {
    name: 'Video 4: Betrayed by Ex, I Married a Mafia Boss (Next Episode Drama)',
    meta: {
      title: '【FULL】Betrayed by Ex, I Married a Mafia Boss 💔',
      fullUntruncatedTitle: '【FULL】Betrayed by Ex, I Married a Mafia Boss 💔',
      channelName: 'Next Episode Drama',
      snippet: 'This is a fictional scripted drama. All scenes are created for narrative and artistic purposes only, without any intention of sexual...',
      cardText: '【FULL】Betrayed by Ex, I Married a Mafia Boss 💔 2.4M 2w ago Next Episode Drama This is a fictional scripted drama. All scenes are created for narrative and artistic purposes only, without any intention of sexual...',
      isVerified: false
    }
  },
  {
    name: 'Video 5: Dunvaris Divorce His Wife',
    meta: {
      title: 'He Wanted to Divorce His Wife... Then He Fell in Love With His Own Wife.',
      fullUntruncatedTitle: 'He Wanted to Divorce His Wife... Then He Fell in Love With His Own Wife.',
      channelName: 'Dunvaris',
      snippet: 'He Wanted to Divorce His Wife... Then He Fell in Love With His Own Wife.',
      cardText: 'He Wanted to Divorce His Wife... Then He Fell in Love With His Own Wife. 1.3M 10d ago Dunvaris',
      isVerified: false
    }
  },
  {
    name: 'Video 6: Three Genius Kids Call Her Mom',
    meta: {
      title: 'NOW THREE GENIUS KIDS CALL HER MOM FULL AI DRAMA!',
      fullUntruncatedTitle: 'NOW THREE GENIUS KIDS CALL HER MOM FULL AI DRAMA!',
      channelName: 'DramaBox Official',
      snippet: 'Three genius kids call her mom in this full AI drama...',
      cardText: 'NOW THREE GENIUS KIDS CALL HER MOM FULL AI DRAMA! DramaBox Official',
      isVerified: false
    }
  },
  {
    name: 'Safe Video 1: StarTalk Geoffrey Hinton',
    meta: {
      title: 'Is AI Hiding Its Full Power? With Geoffrey Hinton',
      fullUntruncatedTitle: 'Is AI Hiding Its Full Power? With Geoffrey Hinton',
      channelName: 'StarTalk',
      snippet: 'Go to https://ground.news/startalk to stay fully informed...',
      cardText: 'Is AI Hiding Its Full Power? With Geoffrey Hinton 4.2M 8mo ago StarTalk',
      isVerified: true
    }
  },
  {
    name: 'Safe Video 2: Diary of a CEO Geoffrey Hinton',
    meta: {
      title: 'Godfather of AI WARNS: "You Have No Idea What\'s Coming"',
      fullUntruncatedTitle: 'Godfather of AI WARNS: "You Have No Idea What\'s Coming"',
      channelName: 'The Diary Of A CEO Clips',
      snippet: 'He pioneered the technology that powers modern AI...',
      cardText: 'Godfather of AI WARNS: "You Have No Idea What\'s Coming" 8.3M 1y ago The Diary Of A CEO Clips',
      isVerified: true
    }
  }
];

testCases.forEach(tc => {
  const commCheck = isChannelBlocked(tc.meta.channelName);
  const res = calculateScore(tc.meta, compiled, { blockSyntheticDisclosures: true, whitelistVerified: true });
  const isBlocked = commCheck.blocked || res.isBlocked;
  const reason = commCheck.blocked ? commCheck.source : res.reasons.join(', ');
  console.log(`${tc.name}:`);
  console.log(`  Blocked: ${isBlocked} | Reason: ${reason} | Score: ${res.score.toFixed(2)}`);
});
