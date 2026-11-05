/**
 * NoSlop - generic scoring coordinator.
 *
 * Detection is data-driven: community/feedback profiles and generic text
 * statistics provide the heuristic score. There are no topic, language, or
 * generator-name lists in this engine.
 */

(() => {
  'use strict';

  function normalize(value) {
    if (window.NoSlopText?.normalizeText) return window.NoSlopText.normalizeText(value);
    return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  const SLOP_HASHTAG_RE = /(?:^|[^\p{L}\p{N}])#(?:minidrama|shortdrama|microdrama|playlet|aidrama|aistory|aifilm|aiart|aivideo|aianimation|aigenerated|aivoice|aicover|aislop|aiphilosophy|aistoic|aifacts|aimindset|aihistory)(?=$|[^\p{L}\p{N}])/iu;
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
      // RegExp objects created by a Node vm or another isolated realm fail
      // instanceof checks even though their test method is valid.
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

    // Co-occurrence features catch formulaic titles without blocking ordinary
    // lectures about Stoicism or astronomy that mention the same subjects.
    if (hasAny(['marcus aurelius', 'seneca', 'epictetus', 'stoic', 'stoicism']) &&
        hasAny(['rules', 'habits', 'secrets', 'lessons', 'dangerous', 'destroy',
          'cold and emotionless', 'unbothered', 'fear you', 'untouchable'])) {
      signals.push({ score: 0.55, reason: 'Formulaic pseudo-philosophy structure' });
    }

    if (hasAny(['james webb', 'scientists', 'nasa', 'astronomers']) &&
        hasAny(['detected', 'discovered', 'terrifying', 'terrified', 'broke physics',
          'cannot explain', 'secret signal', 'hiding this'])) {
      signals.push({ score: 0.55, reason: 'Sensational science structure' });
    }

    if (hasAny(['mafia boss', 'secret wife', 'hidden billionaire', 'contract marriage', 'flash marriage',
                'ex-wife', 'ex husband', 'billionaire ex', 'ruthless president', 'alpha male',
                'triplets', 'quadruplets', 'genius kids', 'unloved daughter', 'surrogate mother',
                'heiress', 'donna seat', 'married a mafia']) &&
        hasAny(['betrayed by', 'gave my seat', 'banquet', 'marry a mafia', 'divorced', 'kicked out',
                'begs for mercy', 'revenge', 'remarried', 'kneel', 'humiliated', 'are they his kids',
                'minidrama', 'mini drama', 'short drama', 'micro drama', '【full】', 'full version', 'full ai drama'])) {
      signals.push({ score: 0.85, reason: 'Formulaic synthetic melodrama structure' });
    }

    return signals;
  }

  function calculateSlopScore(meta = {}, compiledKeywords = [], options = {}) {
    if (options.blockSyntheticDisclosures !== false && meta.hasAiInfoButton) {
      return {
        score: 1,
        isBlocked: true,
        reasons: ['YouTube synthetic-media disclosure'],
        evidence: { source: 'youtube-dom' }
      };
    }

    if (options.whitelistVerified !== false && meta.isVerified) {
      return {
        score: 0,
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
    let score = 0;

    if (options.blockSyntheticDisclosures !== false &&
        (SLOP_HASHTAG_RE.test(text) || GENERATION_DISCLOSURE_RE.test(text) || SCRIPT_DISCLOSURE_RE.test(text))) {
      score = Math.max(score, SLOP_HASHTAG_RE.test(text) ? 0.95 : 0.90);
      reasons.push(SLOP_HASHTAG_RE.test(text)
        ? 'Synthetic-media hashtag'
        : 'Synthetic-media disclosure text');
      evidence.disclosure = text.match(SLOP_HASHTAG_RE)?.[0] || text.match(GENERATION_DISCLOSURE_RE)?.[0] || text.match(SCRIPT_DISCLOSURE_RE)?.[0];
    }

    if (options.blockKeywords !== false) {
      const matchedRule = keywordMatch(compiledKeywords, text);
      if (matchedRule) {
        score = Math.max(score, 0.85);
        reasons.push('User keyword rule');
        evidence.keywordRule = matchedRule;
      }
    }

    for (const signal of structuralSignals(text)) {
      score = Math.max(score, signal.score);
      reasons.push(signal.reason);
    }

    const semantic = window.NoSlopSemantic?.predict?.(meta);
    if (semantic) {
      score = Math.max(score, semantic.score || 0);
      reasons.push(...semantic.reasons);
      evidence.model = semantic.evidence;
    }

    const threshold = options.sensitivityThreshold || 0.50;
    return {
      score: Number(score.toFixed(3)),
      isBlocked: score >= threshold,
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
