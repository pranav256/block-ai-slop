/**
 * NoSlop - Engine 1: Multi-Signal Weighted Heuristic Scoring Engine (v5.0)
 * Comprehensive multi-domain detection:
 *  - Melodrama / Romance / Mafia Mills
 *  - Philosophy / Pseudo-Stoic / Dark Psychology / Sigma Slop
 *  - Sensational Space & Science Clickbait ("Broke Physics", "Scientists Terrified")
 *  - Automated Reddit TTS / Text-to-Speech Narration Mills
 *  - AI Brainrot Facts & 1% IQ Tests
 *  - AI Money / Faceless Channel Hustle Slop
 *  - AI Voice Clones & Song Covers
 * 
 * Whitelists verified human creators and renowned educational institutions.
 */

(() => {
  'use strict';

  // YouTube's official AI Info Button & Disclosure markers
  const YOUTUBE_AI_DISCLOSURE_REGEX = /(how this content was made|altered or synthetic content|made with ai|significantly edited or digitally generated|digitally generated content|generated using artificial intelligence|generated with ai)/i;

  // Specific generative slop hashtags (matches #ai, #aidrama, #aistory, #aiphilosophy, #stoicai, etc.)
  const AI_SLOP_HASHTAG_REGEX = /(?:^|[^\w])#ai(?:story|drama|film|art|video|animation|generated|voice|cover|slop|philosophy|stoic|facts|mindset|history|[a-z0-9_-]+)?(?=[^\w]|$)/iu;

  // Automated disclaimers (EDSA boilerplate, ElevenLabs TTS, Midjourney, ChatGPT disclosures)
  const AI_DISCLAIMER_REGEX = /(complies with edsa standards|not a real-life scenario|not a real life scenario|please do not imitate|days full of humiliation are over|fictional drama scenario|all characters and events are fictional|fictional scripted drama|all scenes are created for narrative|(voice generated (by|using)|voiceover by|narrated with) (elevenlabs|eleven labs|murf|speechify|uberduck|lovo|wellsaid|ai voice)|(images?|visuals?|footage) generated (with|using|by) (midjourney|stable diffusion|dall-e|runway|sora|kling|flux)|(script|story) generated (with|by|using) (chatgpt|claude|ai)|synthetic voice|ai narrator|faceless automation)/i;

  // 1. Melodrama / Romance / Mafia Story Mills
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
    /(disowned|kicked out|expelled|thrown out) by (the family|the clan|the elders)/i,
    /(disguised as|dressed as|pretended to be).*(janitor|cleaner|driver|security guard|poor|waiter|beggar)/i,
    /(she rejected the poor guy|rejected the beggar|rejected him for being poor|mocked for being poor)/i,
    /(he bought the (company|restaurant|hotel|store|building)|bought the entire store)/i,
    /(turns out he is the (boss|ceo|owner|billionaire|president|chairman|heir))/i,
    /(she had no idea who he really was|they had no idea who (he|she) (really )?was)/i,
    /(wife cheated|husband cheated|caught (my|his|her) (wife|husband|fiancee|partner) cheating)/i,
    /(the daughter they threw away|the son they threw away|abandoned child returns|abandoned (son|daughter) becomes)/i,
    /(humiliated at the (gala|wedding|party|reunion|banquet|dinner))/i,
    /(billionaire in disguise|secret identity revealed)/i,
    /(forced to marry|arranged to marry|marry the ugly|marry the disabled|marry the vegetative)/i,
    /(cruel mother-in-law|evil mother-in-law|wicked stepmother)/i,
    /(after 5 years, he returns|after 10 years, he returns|5 years later, the)/i,
    /(the true heiress|real heiress|fake heiress|swapped at birth)/i,
    /(pregnant with (the )?(ceo|billionaire|mafia|boss)'s (baby|child|twins|triplets))/i,
    /(ceo's secret (lover|surrogate|contract|bride|wife))/i,
    /(she signed the divorce papers|divorced the cold-blooded ceo)/i
  ];

  // 2. Philosophy / Pseudo-Stoic / Dark Psychology / Sigma Slop
  const PHILOSOPHY_SLOP_FORMULAS = [
    /(marcus aurelius|seneca|epictetus|stoic|stoicism).*(rules|habits|secrets|lessons|laws).*(become dangerous|destroy|never be weak|rule your mind|silently win|master yourself|fear you|be untouchable|win in silence)/i,
    /(how to (be|become) (cold and emotionless|dangerous|feared|untouchable|a ghost|unbothered|emotionless))/i,
    /(why 99% of (men|people)|99% of people will never).*(understand|figure out|realize|reach this level|be successful)/i,
    /(carl jung|friedrich nietzsche|machiavelli).*(dark secret|shadow work|integrate your shadow|brutal truth|terrifying truth|human nature.*dangerous)/i,
    /(dark psychology|dark manipulation|psychological tricks).*(control (anyone|any conversation|her|him)|make (anyone|her) obsessed|manipulate (anyone|people)|read minds|dark tricks)/i,
    /(sigma male|alpha male).*(rule|mindset|mentality|grindset|quote|routine|silent killer|unspoken rules)/i,
    /(48 laws of power|art of war).*(master manipulation|silently destroy|make them pay|dark power)/i,
    /(comment ["']?i am ready["']?|subscribe for daily (wisdom|stoic|quotes))/i,
    /(10|7|5|8|6|9) (stoic|rules|habits|lessons|signs|tricks).*(become dangerous|destroy|never be weak|rule your mind|silently win|master yourself|fear you|be untouchable|win in silence|control your emotions)/i,
    /(psychology says|psychological facts about|dark psychology tricks|manipulation techniques)/i,
    /(how to manipulate (anyone|people|conversations|her|him))/i,
    /(rules of the sigma|sigma rule #[0-9]+|how to be a sigma)/i,
    /(why intelligent people|why smart people|why high-value (men|women)).*(are always alone|have no friends|stay quiet)/i
  ];

  // 3. Space / Science / History Sensationalist AI Slop
  const SCIENCE_SENSATIONAL_SLOP_FORMULAS = [
    /(james webb( telescope)?|scientists|nasa|astronomers) (just )?(found|discovered|detected|announced|revealed).*(broke physics|terrifying discovery|secret signal|terrified|cannot explain|something terrifying|hiding this|outside the solar system)/i,
    /(why scientists are (terrified|scared|shocked)|what scientists found in).*(antarctica|mariana trench|deep ocean|moon|space|permafrost)/i,
    /(voyager 1|voyager 2) (just )?(sent|transmitted|detected).*(terrifying (message|signal|recording)|outside the solar system|final message)/i,
    /(what (spartans|romans|vikings|ancient greeks|gladiators) did to).*(weak babies|captives|women|criminals|enemies).*(will terrify you|shocked the world|is horrifying)/i,
    /(nikola tesla|tesla).*(3[- ]?6[- ]?9|secret code|frequency|energy|manifestation|free energy).*(revealed|they hid from you)/i,
    /(scientists are (terrified|shocked|speechless|baffled)|nasa is (terrified|hiding))/i,
    /(something terrifying (happened|discovered|found|detected)|terrifying discovery)/i,
    /(they are hiding this from you|what they don't want you to know about)/i,
    /(this discovery (broke|destroys|rewrote) physics)/i
  ];

  // 4. Automated Reddit TTS / Text-to-Speech Narration
  const REDDIT_TTS_SLOP_FORMULAS = [
    /(aita for|r\/aita|r\/relationship_advice|tifu by|r\/askreddit).*(cheating wife|mother-in-law|cheating husband|entitled mother|karen|caught my wife|divorce)/i,
    /(reddit stories|reddit updates|best of reddit|cheating stories|revenge stories).*(part [0-9]+|update|cheating ex)/i
  ];

  // 5. Brainrot Facts / Riddle / 1% Genius Loops
  const BRAINROT_FACTS_SLOP_FORMULAS = [
    /(random facts|psychology facts|creepy facts|disturbing facts).*(that might save your life|about girls|you didn't know|will blow your mind|before you sleep)/i,
    /(if you can (answer|solve) (all )?[0-9]+|only 1% can solve).*(you are a genius|brain test|iq test|impossible riddle)/i
  ];

  // 6. AI Money / Faceless Channel Hustle Slop
  const AI_MONEY_SLOP_FORMULAS = [
    /(how i made \$[0-9,]+ in [0-9]+ (days|hours) with (chatgpt|ai|midjourney))/i,
    /(chatgpt passive income|make money with ai|faceless youtube channel|ai side hustle).*(step[- ]by[- ]step|automation|autopilot|\$[0-9,]+)/i,
    /(best ai tools to (make money|get rich|replace your job))/i
  ];

  // 7. AI Music / Voice Covers / Cloned Vocals
  const AI_MUSIC_SLOP_FORMULAS = [
    /\b(ai cover|ai song|ai singing|ai voice cover|suno ai|udio ai|cloned voice|deepfake voice)\b/i
  ];

  const SLOP_SNIPPET_CLICHES = [
    /billionaire stories.*mafia dramas/i,
    /ceo revenge.*action thrillers/i,
    /cinematic ai storytelling/i,
    /storytelling you're in the right place/i,
    /rusty pickup.*front steps.*papers upstairs/i
  ];

  const ALL_CAPS_CLICHE = /\b(MAFIA BOSS|BILLIONAIRE|REVENGE|BETRAYAL|SHOCKING|SECRET IDENTITY|RUNAWAY BRIDE|MAFIA DON)\b/;

  // Curated whitelist of renowned human philosophy, science, and educational channels
  const CORE_HUMAN_EDUCATIONAL_CHANNELS = new Set([
    "crashcourse", "crash course", "einzelganger", "pursuit of wonder", "philosophize this!",
    "academy of ideas", "the school of life", "daily stoic", "ryan holiday", "philosophy tube",
    "contrapoints", "wisecrack", "gregory b sadler", "plastic pills", "carefree wandering", "then & now",
    "veritasium", "kurzgesagt – in a nutshell", "kurzgesagt", "pbs space time", "anton petrov",
    "sean carroll", "sabine hossenfelder", "scishow", "minutephysics", "numberphile", "smarter every day",
    "vsauce", "overly sarcastic productions", "ted-ed", "ted ed", "vox", "johnny harris",
    "wendover productions", "real engineering", "cleo abram", "mark rober", "stand-up maths",
    "3blue1brown", "startalk", "the diary of a ceo", "the diary of a ceo clips", "lex fridman"
  ]);

  /**
   * Calculates the composite slop probability [0.0 - 1.0] using Bayesian independence
   */
  function calculateSlopScore(meta, compiledKeywords = [], options = {}) {
    // 1. YouTube Official AI Info Button & Synthetic Disclosure (Always checked)
    if (options.blockSyntheticDisclosures !== false) {
      if (
        meta.hasAiInfoButton ||
        YOUTUBE_AI_DISCLOSURE_REGEX.test(meta.badgeText)
      ) {
        return {
          score: 1.0,
          isBlocked: true,
          reasons: ['YouTube Official AI Info / Synthetic Disclosure']
        };
      }
    }

    // 2. Protect Verified Human Creators & Renowned Educational Channels
    if (options.whitelistVerified !== false && meta.isVerified) {
      return {
        score: 0.0,
        isBlocked: false,
        reasons: ['Verified Creator Whitelisted']
      };
    }

    const rawChannel = (meta.channelName || '').toLowerCase().trim();
    if (CORE_HUMAN_EDUCATIONAL_CHANNELS.has(rawChannel)) {
      return {
        score: 0.0,
        isBlocked: false,
        reasons: ['Renowned Educational Creator Whitelisted']
      };
    }

    const signals = [];
    const reasons = [];

    const testTitle = `${meta.title} ${meta.fullUntruncatedTitle || ''}`;
    const testFullText = `${testTitle} ${meta.snippet || ''} ${meta.cardText || ''} ${meta.channelName || ''}`;

    // Signal 2: AI Slop Hashtag (#AIStory, #AIDrama, #AIPhilosophy, etc.)
    if (AI_SLOP_HASHTAG_REGEX.test(testFullText)) {
      const match = testFullText.match(AI_SLOP_HASHTAG_REGEX);
      signals.push(0.95);
      reasons.push(`AI Slop Hashtag (${match[0]})`);
    }

    // Signal 3: Automated Disclaimers (EDSA, ElevenLabs, Midjourney, ChatGPT disclosures)
    if (AI_DISCLAIMER_REGEX.test(testFullText)) {
      signals.push(0.90);
      reasons.push('AI Content / Generator Disclaimer');
    }

    // Signal 4: Explicit AI Generator Keywords (Title / Channel / Snippet / Card)
    if (compiledKeywords.length > 0) {
      const normChannel = (meta.channelName || '').replace(/\bal\b/gi, 'ai');
      let keywordFound = false;

      for (const kw of compiledKeywords) {
        if (kw.test(meta.channelName) || kw.test(normChannel)) {
          signals.push(0.85);
          reasons.push(`AI Channel Name (${meta.channelName})`);
          keywordFound = true;
          break;
        }
      }

      if (!keywordFound && meta.title) {
        for (const kw of compiledKeywords) {
          if (kw.test(meta.title)) {
            signals.push(0.85);
            reasons.push(`Title Keyword (${kw.source})`);
            keywordFound = true;
            break;
          }
        }
      }

      if (!keywordFound && testFullText.trim()) {
        for (const kw of compiledKeywords) {
          if (kw.test(testFullText)) {
            signals.push(0.75);
            reasons.push(`Card Keyword (${kw.source})`);
            break;
          }
        }
      }
    }

    // Signal 5: Formulaic Slop Categorization
    const formulaGroups = [
      { list: MELODRAMA_SLOP_FORMULAS, name: 'Melodrama Slop Formula', weight: 0.55 },
      { list: PHILOSOPHY_SLOP_FORMULAS, name: 'Philosophy/Dark Psychology Slop Formula', weight: 0.55 },
      { list: SCIENCE_SENSATIONAL_SLOP_FORMULAS, name: 'Sensational Science/Space Slop Formula', weight: 0.55 },
      { list: REDDIT_TTS_SLOP_FORMULAS, name: 'Reddit TTS Slop Formula', weight: 0.55 },
      { list: BRAINROT_FACTS_SLOP_FORMULAS, name: 'Brainrot Facts Slop Formula', weight: 0.55 },
      { list: AI_MONEY_SLOP_FORMULAS, name: 'AI Get-Rich Slop Formula', weight: 0.55 },
      { list: AI_MUSIC_SLOP_FORMULAS, name: 'AI Voice Cover Formula', weight: 0.55 }
    ];

    for (const group of formulaGroups) {
      for (const formula of group.list) {
        if (formula.test(testTitle) || formula.test(testFullText)) {
          signals.push(group.weight);
          reasons.push(group.name);
          break;
        }
      }
    }

    // Signal 6: Snippet Cliché Formula
    for (const cliche of SLOP_SNIPPET_CLICHES) {
      if (cliche.test(testFullText)) {
        signals.push(0.65);
        reasons.push('AI Cliché Formula');
        break;
      }
    }

    // Signal 7: ALL-CAPS Clichés
    if (ALL_CAPS_CLICHE.test(testTitle)) {
      signals.push(0.40);
      reasons.push('Sensational Cliché Keywords');
    }

    // Combine probabilities: P(A ∪ B) = 1 - ∏(1 - P_i)
    if (signals.length === 0) {
      return { score: 0.0, isBlocked: false, reasons: [] };
    }

    let complement = 1.0;
    for (const weight of signals) {
      complement *= (1.0 - weight);
    }
    const finalScore = Number((1.0 - complement).toFixed(3));

    const threshold = options.sensitivityThreshold || 0.50;
    const isBlocked = finalScore >= threshold;

    return {
      score: finalScore,
      isBlocked,
      reasons
    };
  }

  window.NoSlopScoring = {
    calculate: calculateSlopScore,
    calculateScore: calculateSlopScore,
    isDisclosureText: (text) => YOUTUBE_AI_DISCLOSURE_REGEX.test(text)
  };
})();
