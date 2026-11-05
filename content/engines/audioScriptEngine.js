/**
 * NoSlop - Generic script/style analyzer.
 *
 * No phrase dictionary is used. The analyzer measures repetition, lexical
 * diversity, sentence rhythm, and punctuation regularity. Audio capture is
 * intentionally not attached to feed cards: MediaElementSource can interfere
 * with YouTube playback and cannot provide reliable provenance by itself.
 */

(() => {
  'use strict';

  function normalize(text) {
    if (window.NoSlopText?.compactText) return window.NoSlopText.compactText(text);
    return String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function analyzeScriptPerplexity(text) {
    const normalized = normalize(text);
    if (normalized.length < 80) return { score: 0, reason: null, evidence: {} };

    const tokens = normalized.split(' ').filter(Boolean);
    const unique = new Set(tokens).size;
    const lexicalDiversity = unique / Math.max(1, tokens.length);
    const trigrams = new Map();
    for (let i = 0; i < tokens.length - 2; i++) {
      const gram = tokens.slice(i, i + 3).join(' ');
      trigrams.set(gram, (trigrams.get(gram) || 0) + 1);
    }
    const repeatedTrigrams = Array.from(trigrams.values()).filter(count => count > 1).length;
    const repetition = repeatedTrigrams / Math.max(1, trigrams.size);
    const sentences = normalized.split(/[.!?]+/).map(sentence => sentence.trim()).filter(Boolean);
    const sentenceLengths = sentences.map(sentence => sentence.split(' ').length);
    const mean = sentenceLengths.length
      ? sentenceLengths.reduce((sum, value) => sum + value, 0) / sentenceLengths.length
      : 0;
    const variance = sentenceLengths.length
      ? sentenceLengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sentenceLengths.length
      : 0;
    const rhythmRegularity = mean ? Math.max(0, 1 - Math.sqrt(variance) / mean) : 0;
    const score = Math.min(0.70,
      Math.max(0, 1 - lexicalDiversity) * 0.35 +
      repetition * 0.35 +
      rhythmRegularity * 0.20 +
      Math.min(1, normalized.length / 2000) * 0.10
    );

    return {
      score: Number(score.toFixed(3)),
      reason: score >= 0.50 ? 'Repetitive script structure' : null,
      evidence: { lexicalDiversity, repetition, rhythmRegularity, sentenceCount: sentences.length }
    };
  }

  window.NoSlopAudioScript = {
    analyzeScript: analyzeScriptPerplexity
  };
})();
