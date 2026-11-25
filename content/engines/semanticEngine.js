/** Bounded, local nearest-example classifier with positive and human controls. */
(() => {
  'use strict';

  const DIMENSIONS = 8192;
  const MAX_LEARNED_EXAMPLES = 2000;
  const MAX_PROTOTYPES_PER_LABEL = 256;
  let positive = [], negative = [];
  let positiveCount = 0, negativeCount = 0;
  let sourceSignature = '';
  let basePositive = [], baseNegative = [];
  let feedback = new Map();
  const predictions = new Map();

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
    return String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function vectorize(value) {
    const normalized = normalize(value).slice(0, 6000);
    const text = ` ${normalized} `;
    const features = new Map();
    if (normalized.length < 3) return features;
    const add = (key, weight) => {
      const bucket = hash(key) % DIMENSIONS;
      features.set(bucket, (features.get(bucket) || 0) + weight);
    };
    for (let length = 3; length <= 5; length++) {
      for (let index = 0; index <= text.length - length; index++) {
        const gram = text.slice(index, index + length);
        add(`${length}:${gram}`, (hash(`s:${gram}`) & 1) ? -0.5 : 0.5);
      }
    }
    const words = normalized.split(' ');
    for (let index = 0; index < words.length; index++) {
      if (words[index].length > 2) add(`w:${words[index]}`, 2);
      if (index) add(`b:${words[index - 1]} ${words[index]}`, 1.5);
    }
    let norm = 0;
    for (const [bucket, value] of features) {
      const weighted = Math.sign(value) * Math.sqrt(Math.abs(value));
      features.set(bucket, weighted);
      norm += weighted * weighted;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [bucket, value] of features) features.set(bucket, value / norm);
    return features;
  }

  function train(text, label) {
    if (typeof text !== 'string') return;
    const features = vectorize(text);
    if (!features.size) return;
    const examples = label > 0 ? positive : negative;
    if (label > 0) positiveCount++; else negativeCount++;
    examples.push(features);
    if (examples.length > MAX_PROTOTYPES_PER_LABEL) examples.shift();
    predictions.clear();
  }

  function rebuild() {
    positive = []; negative = [];
    positiveCount = 0; negativeCount = 0;
    predictions.clear();
    for (const example of feedback.values()) train(example.text, example.label);
    for (const example of basePositive) train(example, 1);
    for (const example of baseNegative) train(example, -1);
  }

  function initialize(positiveExamples = [], negativeExamples = []) {
    const positives = Array.isArray(positiveExamples) ? positiveExamples.filter(value => typeof value === 'string').slice(-2000) : [];
    const negatives = Array.isArray(negativeExamples) ? negativeExamples.filter(value => typeof value === 'string').slice(-2000) : [];
    const signature = JSON.stringify([positives, negatives]);
    if (signature === sourceSignature) return;
    sourceSignature = signature;
    basePositive = positives;
    baseNegative = negatives;
    rebuild();
  }

  function initializeDefaults() {
    initialize(window.NoSlopTrainingData?.positive || [], window.NoSlopTrainingData?.negative || []);
  }

  function setExamples(examples = []) {
    const next = new Map();
    for (const example of (Array.isArray(examples) ? examples : []).slice(-MAX_LEARNED_EXAMPLES)) {
      if (!example || typeof example.text !== 'string' || ![1, -1].includes(example.label)) continue;
      const text = example.text.slice(0, 6000);
      const key = normalize(text);
      if (!key) continue;
      // The newest explicit correction replaces an older label for identical text.
      next.delete(key);
      next.set(key, { text, label: example.label });
    }
    if (JSON.stringify([...next]) === JSON.stringify([...feedback])) return;
    feedback = next;
    rebuild();
  }

  function learnExamples(examples = []) {
    setExamples([...feedback.values(), ...(Array.isArray(examples) ? examples : [])]);
  }

  function nearest(features, examples) {
    const top = [0, 0, 0];
    for (const example of examples) {
      let dot = 0;
      for (const [bucket, value] of features) dot += value * (example.get(bucket) || 0);
      dot = Math.max(0, Math.min(1, dot));
      if (dot > top[0]) { top[2] = top[1]; top[1] = top[0]; top[0] = dot; }
      else if (dot > top[1]) { top[2] = top[1]; top[1] = dot; }
      else if (dot > top[2]) top[2] = dot;
    }
    return top[0] * 0.75 + (top.slice(0, Math.min(3, examples.length)).reduce((sum, value) => sum + value, 0) / Math.max(1, Math.min(3, examples.length))) * 0.25;
  }

  function predict(meta = {}) {
    const text = [...new Set([meta.fullUntruncatedTitle || meta.title || '', meta.snippet || '', meta.scriptText || ''])].join(' ').slice(0, 6000);
    const key = normalize(text);
    if (predictions.has(key)) return predictions.get(key);
    const features = vectorize(text);
    const positiveSimilarity = nearest(features, positive);
    const negativeSimilarity = nearest(features, negative);
    const margin = positiveSimilarity - negativeSimilarity;
    const enoughEvidence = positiveCount >= 8 && negativeCount >= 1 && positiveSimilarity >= 0.38 && margin >= 0.10;
    const rawScore = Math.min(0.88, Math.max(0, 0.35 + margin * 0.85 + Math.max(0, positiveSimilarity - 0.45) * 0.35));
    const result = {
      score: enoughEvidence ? rawScore : 0,
      rawScore,
      isTrained: positiveCount >= 8 && negativeCount >= 1,
      reasons: enoughEvidence ? ['Learned video-text similarity'] : [],
      evidence: {
        positiveSimilarity: Number(positiveSimilarity.toFixed(3)),
        negativeSimilarity: Number(negativeSimilarity.toFixed(3)),
        margin: Number(margin.toFixed(3))
      }
    };
    if (predictions.size >= 256) predictions.delete(predictions.keys().next().value);
    predictions.set(key, result);
    return result;
  }

  window.NoSlopSemantic = {
    initialize, initializeDefaults, learnExamples, setExamples, train, predict, vectorize, normalize,
    getModelStats: () => ({ positiveCount, negativeCount, dimensions: DIMENSIONS, feedbackCount: feedback.size, prototypes: positive.length + negative.length })
  };
})();
