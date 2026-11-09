/**
 * NoSlop - Data-driven, vocabulary-free text classifier.
 *
 * The model does not contain a list of AI words, genres, countries, or title
 * formulas. It learns a positive profile from the community blocklist and a
 * negative profile from baseline/allowed creator names and local feedback. Text is
 * represented with hashed character n-grams plus language-neutral style
 * features. Similar spelling is evidence, not semantic understanding.
 */

(() => {
  'use strict';

  const DIMENSIONS = 2048;
  const NGRAM_MIN = 3;
  const NGRAM_MAX = 5;
  const MAX_LEARNED_EXAMPLES = 2000;
  const PROFILE_CONFIG = Object.freeze({
    minimumPositiveSimilarity: 0.34,
    minimumMargin: 0.06,
    styleWeight: 0.20,
    channelWeight: 0.25
  });

  let positive = new Float64Array(DIMENSIONS);
  let negative = new Float64Array(DIMENSIONS);
  let positiveCount = 0;
  let negativeCount = 0;
  let sourceSignature = '';

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i++) {
      result ^= value.charCodeAt(i);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function normalize(value) {
    if (window.NoSlopText?.compactText) return window.NoSlopText.compactText(value);
    return String(value || '').normalize('NFKC').toLowerCase()
      .replace(/[\u200b-\u200f\ufeff]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function addFeature(features, value, amount) {
    features.set(value, (features.get(value) || 0) + amount);
  }

  function vectorize(value) {
    const text = ` ${normalize(value)} `;
    const features = new Map();
    if (text.trim().length < NGRAM_MIN) return features;

    for (let length = NGRAM_MIN; length <= NGRAM_MAX; length++) {
      for (let index = 0; index <= text.length - length; index++) {
        const gram = text.slice(index, index + length);
        const bucket = hash(`${length}:${gram}`) % DIMENSIONS;
        const sign = (hash(`s:${gram}`) & 1) === 0 ? 1 : -1;
        addFeature(features, bucket, sign);
      }
    }

    let norm = 0;
    for (const amount of features.values()) norm += amount * amount;
    norm = Math.sqrt(norm) || 1;
    for (const [bucket, amount] of features) features.set(bucket, amount / norm);
    return features;
  }

  function addToProfile(profile, features) {
    for (const [bucket, value] of features) {
      // Cosine similarity is unchanged by averaging the accumulated vectors.
      profile[bucket] += value;
    }
  }

  function cosine(features, profile, count) {
    if (!count || !features.size) return 0;
    let dot = 0;
    let profileNorm = 0;
    for (let index = 0; index < profile.length; index++) profileNorm += profile[index] ** 2;
    if (!profileNorm) return 0;
    for (const [bucket, value] of features) dot += value * profile[bucket];
    return Math.max(0, Math.min(1, dot / Math.sqrt(profileNorm)));
  }

  function train(text, label) {
    const features = vectorize(text);
    if (!features.size) return;
    if (label > 0) {
      positiveCount++;
      addToProfile(positive, features);
    } else {
      negativeCount++;
      addToProfile(negative, features);
    }
  }

  const DEFAULT_NEGATIVE_BASELINE = [
    'veritasium', 'startalk', 'kurzgesagt', 'einzelganger', 'techy imran',
    'smarter every day', 'mark rober', 'pbs space time', 'numberphile',
    'linus tech tips', 'mkbhd', 'marques brownlee', 'dave2d', 'cleo abram'
  ];

  function initialize(positiveExamples = [], negativeExamples = []) {
    const effectiveNegative = (Array.isArray(negativeExamples) && negativeExamples.length > 0)
      ? negativeExamples
      : DEFAULT_NEGATIVE_BASELINE;

    const nextSignature = JSON.stringify([positiveExamples, effectiveNegative]);
    if (nextSignature === sourceSignature) return;
    sourceSignature = nextSignature;

    positive = new Float64Array(DIMENSIONS);
    negative = new Float64Array(DIMENSIONS);
    positiveCount = 0;
    negativeCount = 0;

    for (const example of (Array.isArray(positiveExamples) ? positiveExamples : [])) {
      if (typeof example === 'string') train(example, 1);
    }
    for (const example of effectiveNegative) {
      if (typeof example === 'string') train(example, -1);
    }
  }

  function learnExamples(examples = []) {
    const bounded = Array.isArray(examples) ? examples.slice(-MAX_LEARNED_EXAMPLES) : [];
    for (const example of bounded) {
      if (example && typeof example.text === 'string') train(example.text, example.label > 0 ? 1 : -1);
    }
  }

  function entropy(tokens) {
    if (!tokens.length) return 0;
    const counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
    let value = 0;
    for (const count of counts.values()) {
      const probability = count / tokens.length;
      value -= probability * Math.log2(probability);
    }
    return value / Math.log2(Math.max(2, counts.size));
  }

  function styleFeatures(meta, text) {
    const title = String(meta.title || '');
    const snippet = normalize(meta.snippet || '');
    const tokens = normalize(`${title} ${snippet}`).split(' ').filter(Boolean);
    const uniqueTokens = new Set(tokens).size;
    const titleLetters = title.match(/[\p{L}]/gu) || [];
    const uppercaseLetters = title.match(/[A-Z]/g) || [];
    const punctuation = (title.match(/[^\p{L}\p{N}\s]/gu) || []).length;
    const titleTokens = normalize(title).split(' ').filter(Boolean);
    const snippetTokens = new Set(snippet.split(' ').filter(Boolean));
    const overlap = titleTokens.length
      ? titleTokens.filter(token => snippetTokens.has(token)).length / titleTokens.length
      : 0;
    const lexicalDiversity = tokens.length ? uniqueTokens / tokens.length : 1;
    const upperRatio = titleLetters.length ? uppercaseLetters.length / titleLetters.length : 0;
    const punctuationDensity = title.length ? punctuation / title.length : 0;
    const repetition = Math.max(0, 1 - lexicalDiversity);
    const lowEntropy = 1 - entropy(tokens);
    const generatedStyle = Math.min(1, repetition * 0.30 + lowEntropy * 0.25 + overlap * 0.25 +
      Math.min(1, upperRatio * 1.5) * 0.10 + Math.min(1, punctuationDensity * 8) * 0.10);

    return {
      generatedStyle,
      lexicalDiversity,
      repetition,
      overlap,
      upperRatio,
      punctuationDensity,
      textLength: text.length
    };
  }

  function predict(meta = {}) {
    const title = meta.title || '';
    const snippet = meta.snippet || '';
    const channel = meta.channelName || '';
    const text = normalize([...new Set([meta.fullUntruncatedTitle || title, snippet, meta.scriptText || ''])].join(' '));
    const features = vectorize(text);
    const positiveSimilarity = cosine(features, positive, positiveCount);
    const negativeSimilarity = cosine(features, negative, negativeCount);
    const channelSimilarity = cosine(vectorize(channel), positive, positiveCount);
    const margin = positiveSimilarity - negativeSimilarity;
    const style = styleFeatures(meta, text);
    const learnedEvidence = Math.max(0, margin) * (1 - PROFILE_CONFIG.channelWeight) +
      channelSimilarity * PROFILE_CONFIG.channelWeight;
    const rawScore = Math.max(0, Math.min(1,
      learnedEvidence * (1 - PROFILE_CONFIG.styleWeight) + style.generatedStyle * PROFILE_CONFIG.styleWeight
    ));
    const enoughEvidence = positiveCount >= 8 && positiveSimilarity >= PROFILE_CONFIG.minimumPositiveSimilarity &&
      (negativeCount === 0 || margin >= PROFILE_CONFIG.minimumMargin);

    const reasons = [];
    if (enoughEvidence) reasons.push('Community-trained text similarity');
    if (style.generatedStyle >= 0.55) reasons.push('Repetitive title/description structure');

    return {
      score: enoughEvidence ? rawScore : 0,
      rawScore,
      isTrained: positiveCount >= 8,
      reasons,
      evidence: {
        positiveSimilarity: Number(positiveSimilarity.toFixed(3)),
        negativeSimilarity: Number(negativeSimilarity.toFixed(3)),
        channelSimilarity: Number(channelSimilarity.toFixed(3)),
        margin: Number(margin.toFixed(3)),
        style
      }
    };
  }

  window.NoSlopSemantic = {
    initialize,
    learnExamples,
    train,
    predict,
    vectorize,
    normalize,
    getModelStats: () => ({ positiveCount, negativeCount, dimensions: DIMENSIONS })
  };
})();
