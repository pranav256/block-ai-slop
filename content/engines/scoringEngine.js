/**
 * NoSlop - Multi-Signal Bayesian & Heuristic Scoring Engine (v5.1)
 * Combines YouTube platform disclosures, creator hashtags, structural genre tropes,
 * lexical diversity, and statistical semantic vectors into an explainable score.
 */

(() => {
  'use strict';

  function normalize(value) {
    if (window.NoSlopText?.normalizeText) return window.NoSlopText.normalizeText(value);
    return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  const SLOP_HASHTAG_RE = /(?:^|[^\p{L}\p{N}])#(?:minidrama|shortdrama|microdrama|playlet|aidrama|aistory|aifilm|aiart|aivideo|aianimation|aigenerated|aivoice|aicover|aislop|aiphilosophy|aistoic|aifacts|aimindset|aihistory|ai)(?=$|[^\p{L}\p{N}])/iu;
  const GENERATION_DISCLOSURE_RE = /(?:\b(?:ai|ia)\b[\s-]+(?:generated|created|made|generated|voice)|\b(?:generated|created|made|gerado|generado|criado|creado)\b[\s-]+(?:with|using|by|com|con|por)\s+(?:ai|ia)\b|\b(?:video|vídeo|filme|pel[ií]cula|historia|história)\b[\s-]+(?:generado|gerado|criado|creado)\b[\s-]+(?:por|com|con)\s+(?:ia|ai)\b|\b(?:voice|voz|narração|narration)\b[\s-]+(?:generated|gerada|generada|created|cloned|clonada)\b)/iu;
  const SCRIPT_DISCLOSURE_RE = /(?:how this content was made|altered or synthetic(?: content)?|significantly edited or digitally generated|digitally generated content|synthetic media|voiceover?\s+(?:generated|created)\s+(?:by|with|using)|images?\s+(?:generated|created)\s+(?:by|with|using)|fictional scripted drama|scenes are created for narrative and artistic purposes|where love meets temptation|unforgettable ai-generated|full ai drama)/iu;
  const GENERATOR_TOOL_RE = /(?:sora|kling|runway(?:ml)?|elevenlabs?|luma dream machine|pika labs?|flux(?:\.1)?|haiper|stable diffusion|stablediffusion|synthesia|heygen|minimax|hailuo|suno|udio)/iu;
  const GENERATION_CONTEXT_RE = /(?:generat(?:e|ed|es|ing|ion)|creat(?:e|ed|es|ing|ion)|made\s+with|using\s+(?:ai|sora|kling|runway)|workflow|prompt(?:ing)?|text[\s-]+to[\s-]+(?:video|speech)|voiceover\s+(?:generated|created)|synthetic|clone[sd]?)/iu;

  function hasNearbyGenerationContext(text, source) {
    const toolMatch = String(source).match(GENERATOR_TOOL_RE);
    if (!toolMatch) return true;
    const toolIndex = text.search(new RegExp(toolMatch[0], 'iu'));
    if (toolIndex < 0) return false;
    const nearby = text.slice(Math.max(0, toolIndex - 48), toolIndex + toolMatch[0].length + 48);
    return GENERATION_CONTEXT_RE.test(nearby);
  }

  function keywordMatch(compiledKeywords, text) {
    if (!Array.isArray(compiledKeywords) || !compiledKeywords.length) return null;
    for (const rule of compiledKeywords) {
      if (!rule || typeof rule.test !== 'function' || !rule.test(text)) continue;
      const source = String(rule.source || '');
      if (GENERATOR_TOOL_RE.test(source) && !hasNearbyGenerationContext(text, source)) continue;
      return source;
    }
    return null;
  }

  function structuralSignals(text) {
    const signals = [];
    const hasAny = terms => terms.some(term => text.includes(term));

    // 1. Pseudo-philosophy & dark psychology clickbait
    if (hasAny(['marcus aurelius', 'seneca', 'epictetus', 'stoic', 'stoicism', 'carl jung', 'dark psychology', 'sigma male']) &&
        hasAny(['rules', 'habits', 'secrets', 'lessons', 'dangerous', 'destroy',
          'cold and emotionless', 'unbothered', 'fear you', 'untouchable', 'integrate your shadow', 'make anyone obsessed'])) {
      signals.push({ score: 0.55, reason: 'Philosophy/Dark Psychology Slop Formula' });
    }

    // 2. Sensational science / space clickbait
    if (hasAny(['james webb', 'scientists', 'nasa', 'astronomers']) &&
        hasAny(['detected', 'discovered', 'terrifying', 'terrified', 'broke physics',
          'cannot explain', 'secret signal', 'hiding this', 'antarctica'])) {
      signals.push({ score: 0.55, reason: 'Sensational Science/Space Slop Formula' });
    }

    // 3. Formulaic synthetic mini-drama / melodrama
    if (hasAny(['mafia boss', 'secret wife', 'hidden billionaire', 'contract marriage', 'flash marriage',
                'ex-wife', 'ex husband', 'billionaire ex', 'ruthless president', 'alpha male',
                'triplets', 'quadruplets', 'genius kids', 'unloved daughter', 'surrogate mother',
                'heiress', 'donna seat', 'married a mafia']) &&
        hasAny(['betrayed by', 'gave my seat', 'banquet', 'marry a mafia', 'divorced', 'kicked out',
                'begs for mercy', 'revenge', 'remarried', 'kneel', 'humiliated', 'are they his kids',
                'minidrama', 'mini drama', 'short drama', 'micro drama', '【full】', 'full version', 'full ai drama'])) {
      signals.push({ score: 0.85, reason: 'Melodrama Slop Formula' });
    }

    // 4. Reddit TTS / automated narration loops
    if (hasAny(['r/aita', 'r/askreddit', 'reddit stories', 'cheating wife', 'entitled parents', 'aitah']) &&
        hasAny(['elevenlabs', 'ai voice', 'tts', 'minecraft parkour', 'subway surfers', 'update:', 'part 2', 'part 1'])) {
      signals.push({ score: 0.85, reason: 'Reddit TTS Slop Formula' });
    }

    return signals;
  }

  function calculateSlopScore(meta = {}, compiledKeywordsOrOptions = [], maybeOptions = {}) {
    let compiledKeywords = [];
    let options = {};

    if (Array.isArray(compiledKeywordsOrOptions)) {
      compiledKeywords = compiledKeywordsOrOptions;
      options = maybeOptions || {};
    } else if (compiledKeywordsOrOptions && typeof compiledKeywordsOrOptions === 'object') {
      options = compiledKeywordsOrOptions;
      compiledKeywords = options.compiledKeywords || [];
    }

    // 1. YouTube Native UI Altered/Synthetic Badge Check (Authoritative Ground Truth)
    if (options.blockSyntheticDisclosures !== false && meta.hasAiInfoButton) {
      return {
        score: 1.0,
        isBlocked: true,
        reasons: ['YouTube synthetic-media disclosure'],
        evidence: { source: 'youtube-dom' }
      };
    }

    // 2. Verified Human Creator Protection
    if (options.whitelistVerified !== false && meta.isVerified) {
      return {
        score: 0.0,
        isBlocked: false,
        reasons: ['Verified creator protected'],
        evidence: { source: 'youtube-dom' }
      };
    }

    const text = normalize([
      meta.title,
      meta.fullUntruncatedTitle,
      meta.snippet,
      meta.scriptText,
      meta.channelName,
      meta.badgeText,
      meta.cardText
    ].filter(Boolean).join(' '));

    const reasons = [];
    const evidence = {};
    let score = 0.0;

    // 3. Explicit Creator Hashtags & Text Disclosures
    if (options.blockSyntheticDisclosures !== false) {
      if (SLOP_HASHTAG_RE.test(text)) {
        score = Math.max(score, 0.95);
        reasons.push('Synthetic-media hashtag');
        evidence.disclosure = text.match(SLOP_HASHTAG_RE)?.[0];
      }
      if (GENERATION_DISCLOSURE_RE.test(text) || SCRIPT_DISCLOSURE_RE.test(text)) {
        score = Math.max(score, 0.90);
        reasons.push('Synthetic-media disclosure text');
        evidence.disclosure = evidence.disclosure || text.match(GENERATION_DISCLOSURE_RE)?.[0] || text.match(SCRIPT_DISCLOSURE_RE)?.[0];
      }
    }

    // 4. Custom & Default Keyword Rules
    if (options.blockKeywords !== false && compiledKeywords.length > 0) {
      const matchedRule = keywordMatch(compiledKeywords, text);
      if (matchedRule) {
        score = Math.max(score, 0.85);
        reasons.push('User keyword rule');
        evidence.keywordRule = matchedRule;
      }
    }

    // 5. Structural Genre Archetypes (Pseudo-philosophy, sensational science, drama mills, Reddit TTS)
    for (const signal of structuralSignals(text)) {
      score = Math.max(score, signal.score);
      reasons.push(signal.reason);
    }

    // 6. Semantic Vectorizer & Perplexity Style Model
    const semantic = window.NoSlopSemantic?.predict?.(meta);
    if (semantic && typeof semantic.score === 'number') {
      if (semantic.score > score) {
        score = semantic.score;
      }
      if (Array.isArray(semantic.reasons)) {
        reasons.push(...semantic.reasons);
      }
      evidence.model = semantic.evidence;
    }

    const threshold = Number.isFinite(options.sensitivityThreshold)
      ? options.sensitivityThreshold
      : 0.50;

    const finalScore = Number(Math.min(1.0, Math.max(0.0, score)).toFixed(3));
    return {
      score: finalScore,
      isBlocked: finalScore >= threshold,
      reasons: Array.from(new Set(reasons)),
      evidence
    };
  }

  window.NoSlopScoring = {
    calculate: calculateSlopScore,
    calculateScore: calculateSlopScore,
    isDisclosureText: text => {
      const normalized = normalize(text);
      return SLOP_HASHTAG_RE.test(normalized) ||
        GENERATION_DISCLOSURE_RE.test(normalized) ||
        SCRIPT_DISCLOSURE_RE.test(normalized);
    }
  };
})();
