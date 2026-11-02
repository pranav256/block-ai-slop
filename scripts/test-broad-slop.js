const fs = require('fs');

const YOUTUBE_AI_DISCLOSURE_REGEX = /(how this content was made|altered or synthetic content|made with ai|significantly edited or digitally generated|digitally generated content|generated using artificial intelligence|generated with ai)/i;

const AI_SLOP_HASHTAG_REGEX = /(?:^|[^\w])#ai(?:story|drama|film|art|video|animation|generated|voice|cover|slop|philosophy|stoic|facts|mindset|history|[a-z0-9_-]+)?(?=[^\w]|$)/iu;

const AI_DISCLAIMER_REGEX = /(complies with edsa standards|not a real-life scenario|not a real life scenario|please do not imitate|days full of humiliation are over|fictional drama scenario|all characters and events are fictional|fictional scripted drama|all scenes are created for narrative|(voice generated (by|using)|voiceover by|narrated with) (elevenlabs|eleven labs|murf|speechify|uberduck|lovo|wellsaid|ai voice)|(images?|visuals?|footage) generated (with|using|by) (midjourney|stable diffusion|dall-e|runway|sora|kling|flux)|(script|story) generated (with|by|using) (chatgpt|claude|ai))/i;

const MELODRAMA_SLOP_FORMULAS = [
  /(she|he) (called security on|humiliated|fired|mocked|mistook him for a beggar|threw out|abandoned) (her|his|their|a) (ex|husband|wife|stranger|boss|assistant|billionaire|beggar)/i,
  /(then the chairman|then the billionaire|then the ceo|then the owner|then the president)/i,
  /(he|she) made (his|her) (wife|husband|assistant|stranger) a (billionaire|millionaire)/i,
  /(feared the mafia don|feared mafia boss|most feared mafia|married a mafia|mafia banquet|billionaire banquet)/i,
  /(secret wife|secret billionaire|hidden billionaire|fake poor|runaway bride|seat to another|trillionaire)/i,
  /(unaware he was the|unaware she was the|turns out he is the)/i,
  /(crushes rich clans|gains x-ray vision|reborn as.*emperor)/i,
  /(useless|abandoned|crippled|mocked) (son-in-law|heir|daughter|orphan|husband|heiress).*(dragon king|god of war|tycoon|billionaire)/i,
  /(god of war|dragon king|asura|immortal emperor|warlord) (returns|awaken|descend)/i,
  /(pretended to be poor|fake poor|disguised as a beggar|dressed as a beggar)/i,
  /(luxury cars arrived|hundreds of black cars|rolls royce fleet)/i,
  /(flash marriage|contract marriage|arranged marriage).*(ceo|billionaire|mafia)/i,
  /(ex-husband|ex-wife).*(cold-blooded ceo|cruel ceo|domineering ceo|disabled ceo|mafia)/i,
  /(his|her|the) (3|4|5|6|7|8|9|10)-year-old (girl|daughter|kids).*(mafia|don|boss|billionaire|genius)/i,
  /(secret daughter|secret son|hidden child|genius kids).*(billionaire|ceo|mafia|call her mom)/i,
  /(now three genius kids|genius kids call her mom|are they his kids)/i,
  /(divorce (his|her) wife|divorce (his|her) husband|fell in love with (his|her) own wife)/i,
  /(dramabox|shortmax|reelshort|dramawave|snackshort|goodshort|moboreels|kalos tv|tempting dramas|drama diary|velvet romance|dunvaris|next episode drama)/i,
  /(micro[- ]?drama|vertical drama|short drama|ai drama|mini[- ]?drama)/i,
  /(betrayed by ex|revenge on ex|cheated on by ex)/i,
  /(betrayed by ex.*married a mafia)/i,
  /(seat to another woman|mafia banquet|secret wife)/i,
  /(slap in the face|regret|begs for mercy|on (his|her) knees).*(ceo|billionaire|chairman)/i,
  /(disowned|kicked out|expelled|thrown out) by (the family|the clan|the elders)/i
];

const PHILOSOPHY_SLOP_FORMULAS = [
  /(marcus aurelius|seneca|epictetus|stoic|stoicism).*(rules|habits|secrets|lessons|laws).*(become dangerous|destroy|never be weak|rule your mind|silently win|master yourself|fear you|be untouchable|win in silence)/i,
  /(how to (be|become) (cold and emotionless|dangerous|feared|untouchable|a ghost|unbothered|emotionless))/i,
  /(why 99% of (men|people)|99% of people will never).*(understand|figure out|realize|reach this level|be successful)/i,
  /(carl jung|friedrich nietzsche|machiavelli).*(dark secret|shadow work|integrate your shadow|brutal truth|terrifying truth|human nature.*dangerous)/i,
  /(dark psychology|dark manipulation|psychological tricks).*(control (anyone|any conversation|her|him)|make (anyone|her) obsessed|manipulate (anyone|people)|read minds|dark tricks)/i,
  /(sigma male|alpha male).*(rule|mindset|mentality|grindset|quote|routine|silent killer|unspoken rules)/i,
  /(48 laws of power|art of war).*(master manipulation|silently destroy|make them pay|dark power)/i,
  /(comment ["']?i am ready["']?|subscribe for daily (wisdom|stoic|quotes))/i
];

const SCIENCE_SENSATIONAL_SLOP_FORMULAS = [
  /(james webb( telescope)?|scientists|nasa|astronomers) (just )?(found|discovered|detected|announced|revealed).*(broke physics|terrifying discovery|secret signal|terrified|cannot explain|something terrifying|hiding this|outside the solar system)/i,
  /(why scientists are (terrified|scared|shocked)|what scientists found in).*(antarctica|mariana trench|deep ocean|moon|space|permafrost)/i,
  /(voyager 1|voyager 2) (just )?(sent|transmitted|detected).*(terrifying (message|signal|recording)|outside the solar system|final message)/i,
  /(what (spartans|romans|vikings|ancient greeks|gladiators) did to).*(weak babies|captives|women|criminals|enemies).*(will terrify you|shocked the world|is horrifying)/i,
  /(nikola tesla|tesla).*(3[- ]?6[- ]?9|secret code|frequency|energy|manifestation|free energy).*(revealed|they hid from you)/i
];

const REDDIT_TTS_SLOP_FORMULAS = [
  /(aita for|r\/aita|r\/relationship_advice|tifu by|r\/askreddit).*(cheating wife|mother-in-law|cheating husband|entitled mother|karen|caught my wife|divorce)/i,
  /(reddit stories|reddit updates|best of reddit|cheating stories|revenge stories).*(part [0-9]+|update|cheating ex)/i
];

const BRAINROT_FACTS_SLOP_FORMULAS = [
  /(random facts|psychology facts|creepy facts|disturbing facts).*(that might save your life|about girls|you didn't know|will blow your mind|before you sleep)/i,
  /(if you can (answer|solve) (all )?[0-9]+|only 1% can solve).*(you are a genius|brain test|iq test|impossible riddle)/i
];

const AI_MONEY_SLOP_FORMULAS = [
  /(how i made \$[0-9,]+ in [0-9]+ (days|hours) with (chatgpt|ai|midjourney))/i,
  /(chatgpt passive income|make money with ai|faceless youtube channel|ai side hustle).*(step[- ]by[- ]step|automation|autopilot|\$[0-9,]+)/i,
  /(best ai tools to (make money|get rich|replace your job))/i
];

const AI_MUSIC_SLOP_FORMULAS = [
  /\b(ai cover|ai song|ai singing|ai voice cover|suno ai|udio ai|cloned voice|deepfake voice)\b/i
];

const CORE_HUMAN_EDUCATIONAL_CHANNELS = new Set([
  "crashcourse", "crash course", "einzelganger", "pursuit of wonder", "philosophize this!",
  "academy of ideas", "the school of life", "daily stoic", "ryan holiday", "philosophy tube",
  "contrapoints", "wisecrack", "veritasium", "kurzgesagt – in a nutshell", "kurzgesagt",
  "pbs space time", "anton petrov", "sean carroll", "sabine hossenfelder", "scishow",
  "minutephysics", "numberphile", "smarter every day", "vsauce", "overly sarcastic productions",
  "ted-ed", "ted ed", "vox", "johnny harris", "wendover productions", "real engineering",
  "cleo abram", "mark rober", "stand-up maths", "numberphile2", "3blue1brown"
]);

const DEFAULT_KEYWORDS = [
  "ai generated", "ai-generated", "ai drama", "ai-drama", "ai dub", "ai dubbed",
  "ai romance", "ai series", "ai recap", "ai video", "ai animation", "ai animated",
  "ai film", "ai movie", "ai story", "ai stories", "ai voice", "ai cover", "ai song",
  "ai slop", "made with ai", "created with ai", "minidrama", "mini drama", "short drama",
  "sora", "kling", "runway gen", "runwayml", "elevenlabs", "luma dream machine", "pika labs",
  "flux.1", "flux ai", "haiper", "stable diffusion", "stablediffusion", "deepfake",
  "synthesia", "heygen", "minimax", "hailuo", "suno ai", "udio ai",
  "ai philosophy", "ai stoic", "ai stoicism", "ai quotes", "ai motivation", "ai psychology",
  "dark psychology ai", "faceless channel", "chatgpt stories", "reddit ai", "ai facts"
];

function buildKeywordRegex(kw) {
  const clean = kw.trim();
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escaped.startsWith('#')) return new RegExp('(?:^|[^\\w])' + escaped + '(?=[^\\w]|$)', 'iu');
  return new RegExp('\\b' + escaped.replace(/\\s+/g, '[\\s_-]+') + '\\b', 'iu');
}

const compiledKeywords = DEFAULT_KEYWORDS.map(buildKeywordRegex).filter(Boolean);

function calculateSlopScore(meta, compiled = compiledKeywords, options = {}) {
  if (options.whitelistVerified !== false && meta.isVerified) {
    return { score: 0.0, isBlocked: false, reasons: ['Verified Creator Whitelisted'] };
  }

  const rawChannel = (meta.channelName || '').toLowerCase().trim();
  if (CORE_HUMAN_EDUCATIONAL_CHANNELS.has(rawChannel)) {
    return { score: 0.0, isBlocked: false, reasons: ['Renowned Educational Creator Whitelisted'] };
  }

  const signals = [];
  const reasons = [];

  const testTitle = `${meta.title} ${meta.fullUntruncatedTitle || ''}`;
  const testFullText = `${testTitle} ${meta.snippet || ''} ${meta.cardText || ''} ${meta.channelName || ''}`;

  // 1. Hashtags
  if (AI_SLOP_HASHTAG_REGEX.test(testFullText)) {
    const match = testFullText.match(AI_SLOP_HASHTAG_REGEX);
    signals.push(0.95);
    reasons.push(`AI Slop Hashtag (${match[0]})`);
  }

  // 2. Disclaimers
  if (AI_DISCLAIMER_REGEX.test(testFullText)) {
    signals.push(0.90);
    reasons.push('AI Content / Generator Disclaimer');
  }

  // 3. Keywords
  for (const kw of compiled) {
    if (kw.test(testFullText)) {
      signals.push(0.75);
      reasons.push(`AI Keyword (${kw.source})`);
      break;
    }
  }

  // 4. Multi-Category Slop Formulas
  const formulas = [
    { list: MELODRAMA_SLOP_FORMULAS, name: 'Melodrama Slop Formula', weight: 0.55 },
    { list: PHILOSOPHY_SLOP_FORMULAS, name: 'Philosophy/Dark Psychology Slop Formula', weight: 0.55 },
    { list: SCIENCE_SENSATIONAL_SLOP_FORMULAS, name: 'Sensational Science/Space Slop Formula', weight: 0.55 },
    { list: REDDIT_TTS_SLOP_FORMULAS, name: 'Reddit TTS Slop Formula', weight: 0.55 },
    { list: BRAINROT_FACTS_SLOP_FORMULAS, name: 'Brainrot Facts Slop Formula', weight: 0.55 },
    { list: AI_MONEY_SLOP_FORMULAS, name: 'AI Get-Rich Slop Formula', weight: 0.55 },
    { list: AI_MUSIC_SLOP_FORMULAS, name: 'AI Voice Cover Formula', weight: 0.55 }
  ];

  for (const group of formulas) {
    for (const f of group.list) {
      if (f.test(testTitle) || f.test(testFullText)) {
        signals.push(group.weight);
        reasons.push(group.name);
        break;
      }
    }
  }

  if (signals.length === 0) {
    return { score: 0.0, isBlocked: false, reasons: [] };
  }

  let complement = 1.0;
  for (const s of signals) complement *= (1.0 - s);
  const finalScore = Number((1.0 - complement).toFixed(3));
  const isBlocked = finalScore >= (options.sensitivityThreshold || 0.50);

  return { score: finalScore, isBlocked, reasons };
}

const testCases = [
  // Philosophy Slop
  {
    name: "Marcus Aurelius 7 Rules to Become Dangerous",
    meta: {
      title: "Marcus Aurelius: 7 Rules to Become Dangerous (Stoicism)",
      snippet: "Discover Marcus Aurelius's rules to become dangerous and rule your mind in silence.",
      channelName: "Stoic Mindset",
      isVerified: false
    },
    expected: true
  },
  {
    name: "Dark Psychology Tricks to Make Anyone Obsessed",
    meta: {
      title: "Dark Psychology: 5 Psychological Tricks to Make Anyone Obsessed With You",
      snippet: "Master dark psychology and manipulation tricks to control any conversation.",
      channelName: "Dark Manipulation Daily",
      isVerified: false
    },
    expected: true
  },
  {
    name: "Carl Jung Integrate Your Shadow",
    meta: {
      title: "Carl Jung: Integrate Your Shadow Before It Destroys You",
      snippet: "Carl Jung dark secret on how to integrate your shadow before it destroys you.",
      channelName: "Shadow Wisdom",
      isVerified: false
    },
    expected: true
  },
  {
    name: "How to Be Cold and Emotionless - Sigma Male",
    meta: {
      title: "How to Be Cold and Emotionless - Sigma Male Mindset",
      snippet: "Rules to become a cold and emotionless man that everyone respects.",
      channelName: "Sigma Mindset",
      isVerified: false
    },
    expected: true
  },
  // Real Philosophy Channels (MUST NOT BE BLOCKED)
  {
    name: "Einzelgänger: Stoicism as a Way of Life",
    meta: {
      title: "Stoicism as a Way of Life - Seneca, Epictetus, Marcus Aurelius",
      snippet: "An introduction to the philosophy of Stoicism and its historical background.",
      channelName: "Einzelgänger",
      isVerified: true
    },
    expected: false
  },
  {
    name: "Pursuit of Wonder: The Meaning of Sisyphus",
    meta: {
      title: "The Meaning of Sisyphus: Camus and Absurdism",
      snippet: "A short exploration of Albert Camus and his philosophical essay on absurdity.",
      channelName: "Pursuit of Wonder",
      isVerified: true
    },
    expected: false
  },
  {
    name: "Philosophize This! (Unverified mirror)",
    meta: {
      title: "Episode 180 - The Philosophy of Artificial Intelligence",
      snippet: "In this episode we discuss the emergence of intelligent systems from a philosophical lens.",
      channelName: "Philosophize This!",
      isVerified: false
    },
    expected: false
  },
  // Science Slop
  {
    name: "James Webb Terrifying Discovery Broke Physics",
    meta: {
      title: "James Webb Telescope Just Detected Something Terrifying That Broke Physics",
      snippet: "Scientists are terrified by what James Webb just detected outside our solar system.",
      channelName: "Cosmo Space Hub",
      isVerified: false
    },
    expected: true
  },
  {
    name: "Scientists Terrified of Antarctica",
    meta: {
      title: "Why Scientists Are Terrified of What They Found in Antarctica",
      snippet: "What scientists found deep inside Antarctica permafrost will terrify you.",
      channelName: "Mystery Space",
      isVerified: false
    },
    expected: true
  },
  // Real Science Channels (MUST NOT BE BLOCKED)
  {
    name: "Veritasium: How James Webb Telescope Changed Astronomy",
    meta: {
      title: "How The James Webb Telescope Changed Astronomy",
      snippet: "We visit NASA to see how the mirrors were built and what new galaxy data shows.",
      channelName: "Veritasium",
      isVerified: true
    },
    expected: false
  },
  {
    name: "Kurzgesagt: Mariana Trench",
    meta: {
      title: "What is the Mariana Trench Really Like?",
      snippet: "Exploring the deepest point on Earth and the organisms adapted to high pressure.",
      channelName: "Kurzgesagt – In a Nutshell",
      isVerified: true
    },
    expected: false
  },
  // Reddit TTS Slop
  {
    name: "Reddit AITA cheating wife ElevenLabs",
    meta: {
      title: "r/AITA for leaving my cheating wife with nothing after she brought her AP home?",
      snippet: "Voice generated using ElevenLabs. Best of Reddit updates and drama.",
      channelName: "Reddit Stories Daily",
      isVerified: false
    },
    expected: true
  },
  // Brainrot Facts Slop
  {
    name: "Random facts that might save your life",
    meta: {
      title: "Random Facts That Might Save Your Life One Day #shorts",
      snippet: "Random facts that might save your life before you sleep.",
      channelName: "Facts Pulse",
      isVerified: false
    },
    expected: true
  },
  // AI Money / Hustle Slop
  {
    name: "How I Made $12,500 with ChatGPT",
    meta: {
      title: "How I Made $12,500 in 7 Days With ChatGPT and AI Automation",
      snippet: "Step-by-step faceless YouTube channel on autopilot using AI tools.",
      channelName: "AI Hustle Lab",
      isVerified: false
    },
    expected: true
  },
  // AI Music / Covers
  {
    name: "Plankton AI Cover Fly Me to the Moon",
    meta: {
      title: "Plankton Sings 'Fly Me to the Moon' (AI Cover)",
      snippet: "Plankton AI voice singing Frank Sinatra with cloned voice.",
      channelName: "AI Music Hub",
      isVerified: false
    },
    expected: true
  },
  // Melodrama Slop (Existing check)
  {
    name: "Behind #drama Velvet Romance",
    meta: {
      title: "Behind 🔥 #drama",
      snippet: "Watch the complete AI-generated romance drama from Velvet Romance A cinematic love story...",
      channelName: "Velvet Romance",
      isVerified: false
    },
    expected: true
  }
];

let allPassed = true;
for (const tc of testCases) {
  const res = calculateSlopScore(tc.meta, compiledKeywords, { sensitivityThreshold: 0.50, whitelistVerified: true });
  const passed = res.isBlocked === tc.expected;
  if (!passed) allPassed = false;
  console.log(`${passed ? '✅' : '❌'} [${tc.name}]: Blocked=${res.isBlocked} (Expected=${tc.expected}) | Score=${res.score.toFixed(2)} | Reasons=${res.reasons.join(', ')}`);
}

console.log('\nResult:', allPassed ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED');
