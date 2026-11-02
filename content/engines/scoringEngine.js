/**
 * NoSlop - Engine 1: Multi-Signal Weighted Heuristic Scoring Engine (v2.3)
 * Full integration with YouTube's "How this content was made" / "Altered or synthetic content"
 * info buttons, plus deep coverage for automated drama mills and AI storytelling.
 */

(() => {
  'use strict';

  // YouTube's official AI Info Button & Disclosure markers
  const YOUTUBE_AI_DISCLOSURE_REGEX = /(how this content was made|altered or synthetic|made with ai|significantly edited or digitally generated|digitally generated|synthetic media|auto-dubbed|generated using artificial intelligence|generated with ai)/i;

  const AI_HASHTAG_REGEX = /#ai[a-z0-9_-]*/i;

  const EDSA_DISCLAIMER_REGEX = /(complies with edsa standards|not a real-life scenario|not a real life scenario|please do not imitate|days full of humiliation are over|generated with ai|fictional drama scenario|all characters and events are fictional)/i;

  // Real-world tropes used by AI story & melodrama mills
  const MELODRAMA_SLOP_FORMULAS = [
    /(she|he) (called security|humiliated|divorced|fired|mocked|left|married|loved|saved|helped) (her|his|their|a) (ex|husband|wife|stranger|boss|assistant|billionaire|beggar)/i,
    /(then the chairman|then the billionaire|then the ceo|then the owner|then the president)/i,
    /(he|she) made (his|her) (wife|husband|assistant|stranger) a (billionaire|millionaire)/i,
    /(feared the mafia|mafia don|feared boss|everyone feared)/i,
    /(secret wife|secret billionaire|hidden billionaire|fake poor|runaway bride|seat to another|trillionaire)/i,
    /(unaware he was|unaware she was|turns out he is)/i,
    /(crushes rich clans|gains x-ray vision|reborn as|cultivation)/i,
    /(useless|abandoned|crippled|mocked) (son-in-law|heir|daughter|orphan|husband|heiress)/i,
    /(god of war|dragon king|asura|immortal emperor|warlord) (returns|awaken|descend)/i,
    /(pretended to be poor|fake poor|disguised as|dressed as a beggar|homeless beggar)/i,
    /(luxury cars arrived|hundreds of black cars|rolls royce|luxury cars)/i,
    /(flash marriage|contract marriage|arranged marriage|accidental marriage|after divorce)/i,
    /(ex-husband|ex-wife|cold-blooded ceo|cruel ceo|domineering ceo|disabled ceo|surrogate)/i,
    /(his|her|the) (3|4|5|6|7|8|9|10)-year-old (girl|boy|daughter|son|child)/i,
    /(secret daughter|secret son|hidden child|pregnant with)/i,
    /(dramabox|shortmax|reelshort|dramawave|snackshort|goodshort|moboreels|kalos tv)/i,
    /(micro[- ]?drama|vertical drama|short drama|ai drama|mini[- ]?series)/i,
    /(betrayal|revenge|cheated on|mistress|affair|stepmother|stepfather).*ceo/i,
    /(slap in the face|regret|begs for mercy|on (his|her) knees)/i,
    /(disowned|kicked out|expelled|thrown out) (by|from)/i,
    /what happens next will (blow your mind|shock you|leave you speechless)/i
  ];

  const SLOP_SNIPPET_CLICHES = [
    /billionaire stories.*mafia dramas/i,
    /ceo revenge.*action thrillers/i,
    /cinematic ai storytelling/i,
    /storytelling you're in the right place/i,
    /rusty pickup.*front steps.*papers upstairs/i
  ];

  const ALL_CAPS_CLICHE = /\b(MAFIA BOSS|BILLIONAIRE|REVENGE|BETRAYAL|SHOCKING|SECRET IDENTITY|RUNAWAY BRIDE|MAFIA DON)\b/;

  /**
   * Calculates the composite slop probability [0.0 - 1.0] using Bayesian independence
   */
  function calculateSlopScore(meta, compiledKeywords = [], options = {}) {
    const signals = [];
    const reasons = [];

    // Signal 1: YouTube Official AI Info Button & Synthetic Disclosure (Instant Block 1.0)
    if (options.blockSyntheticDisclosures !== false) {
      if (
        meta.hasAiInfoButton ||
        YOUTUBE_AI_DISCLOSURE_REGEX.test(meta.badgeText) ||
        YOUTUBE_AI_DISCLOSURE_REGEX.test(meta.cardText) ||
        YOUTUBE_AI_DISCLOSURE_REGEX.test(meta.ariaLabels)
      ) {
        signals.push(1.0);
        reasons.push('YouTube Official AI Info / Synthetic Disclosure');
      }
    }

    // Signal 2: AI Hashtag (#AIStory, #AIDrama, #AIFilm, etc.)
    if (AI_HASHTAG_REGEX.test(meta.title) || AI_HASHTAG_REGEX.test(meta.snippet) || AI_HASHTAG_REGEX.test(meta.cardText)) {
      const match = meta.title.match(AI_HASHTAG_REGEX) ||
                    meta.snippet.match(AI_HASHTAG_REGEX) ||
                    meta.cardText.match(AI_HASHTAG_REGEX);
      signals.push(0.95);
      reasons.push(`AI Hashtag (${match[0]})`);
    }

    // Signal 3: EDSA / Boilerplate Automated Disclaimers
    if (EDSA_DISCLAIMER_REGEX.test(meta.snippet) || EDSA_DISCLAIMER_REGEX.test(meta.cardText)) {
      signals.push(0.90);
      reasons.push('AI Content Disclaimer (EDSA/Automated Script Boilerplate)');
    }

    // Signal 4: Explicit AI Generator Keywords (Title / Channel / Snippet)
    let keywordFound = false;
    if (compiledKeywords.length > 0) {
      const normChannel = meta.channelName.replace(/\bal\b/gi, 'ai');
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

      if (!keywordFound && meta.snippet) {
        for (const kw of compiledKeywords) {
          if (kw.test(meta.snippet)) {
            signals.push(0.75);
            reasons.push(`Snippet Keyword (${kw.source})`);
            break;
          }
        }
      }
    }

    // Signal 5: Melodrama Slop Story Formula
    const testTitle = `${meta.title} ${meta.fullUntruncatedTitle || ''}`;
    for (const formula of MELODRAMA_SLOP_FORMULAS) {
      if (formula.test(testTitle)) {
        signals.push(0.80);
        reasons.push(`Melodrama Slop Formula (${formula.source})`);
        break;
      }
    }

    // Signal 6: Snippet Cliché Formula
    for (const cliche of SLOP_SNIPPET_CLICHES) {
      if (cliche.test(meta.snippet) || cliche.test(meta.cardText)) {
        signals.push(0.65);
        reasons.push('AI Drama Snippet Cliché');
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

    const threshold = options.sensitivityThreshold || 0.45;
    const isBlocked = finalScore >= threshold;

    return {
      score: finalScore,
      isBlocked,
      reasons
    };
  }

  window.NoSlopScoring = {
    calculate: calculateSlopScore,
    isDisclosureText: (text) => YOUTUBE_AI_DISCLOSURE_REGEX.test(text)
  };
})();
