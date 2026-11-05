/**
 * NoSlop - Shared text normalization utilities.
 * Kept dependency-free so every content-script engine can use the same input.
 */

(() => {
  'use strict';

  const ZERO_WIDTH_RE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180d\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\u3164\ufe00-\ufe0f\ufeff]/g;
  const HOMOGLYPHS = new Map([
    ['а', 'a'], ['е', 'e'], ['і', 'i'], ['о', 'o'], ['р', 'p'], ['с', 'c'], ['х', 'x'],
    ['Α', 'A'], ['Β', 'B'], ['Ε', 'E'], ['Ι', 'I'], ['Κ', 'K'], ['Μ', 'M'], ['Ν', 'N'],
    ['Ο', 'O'], ['Ρ', 'P'], ['Τ', 'T'], ['Χ', 'X'], ['Υ', 'Y'],
    ['А', 'A'], ['Е', 'E'], ['І', 'I'], ['О', 'O'], ['Р', 'P'], ['С', 'C'], ['Х', 'X']
  ]);

  function normalizeText(value) {
    if (typeof value !== 'string' || !value) return '';

    let text = value
      .normalize('NFKC')
      .replace(ZERO_WIDTH_RE, '')
      .replace(/[‐‑‒–—―]/g, '-')
      .replace(/[“”„‟]/g, '"')
      .replace(/[‘’‚‛]/g, "'");

    text = Array.from(text, char => HOMOGLYPHS.get(char) || char).join('');
    return text.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  }

  function compactText(value) {
    return normalizeText(value)
      .replace(/\bal\b/g, 'ai')
      .replace(/[^\p{L}\p{N}#@]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeChannel(value) {
    return compactText(value)
      .replace(/^@/, '')
      .replace(/\bai\b/g, 'ai');
  }

  window.NoSlopText = {
    normalizeText,
    compactText,
    normalizeChannel,
    stripZeroWidth: value => typeof value === 'string' ? value.replace(ZERO_WIDTH_RE, '') : ''
  };
})();
