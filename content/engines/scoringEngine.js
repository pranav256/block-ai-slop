/** Local evidence scoring. Scores express filtering strength, not AI probabilities. */
(() => {
  'use strict';

  const normalize = value => window.NoSlopText?.normalizeText(value) || String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  const TOOL = /\b(?:sora|veo(?:\s*\d(?:\.\d)?)?|kling|runway(?:ml|\s*gen-?\d)?|elevenlabs?|midjourney|luma(?: dream machine)?|pika(?: labs?)?|flux(?:\.1)?|haiper|stable diffusion|stablediffusion|synthesia|heygen|minimax|hailuo|suno|udio|higgsfield|seedance)\b/iu;
  const AI = /(?:\b(?:ai|ia|ki)\b|artificial intelligence|inteligencia artificial|inteligência artificial|intelligence artificielle|künstlich\w* intelligenz|kunstlich\w* intelligenz|एआई|कृत्रिम बुद्धिमत्ता)/iu;
  const GENERATED = /(?:\b(?:ai|ia|ki)[\s-]*(?:generat\w*|creat\w*|made|animated|animation|voice(?:over)?|narrat\w*|music|cover|film|movie|drama|interview|asmr|(?:concept\s+)?trailer)\b|\b(?:generated|created|made|produced|gerad[oa]s?|generad[oa]s?|criad[oa]s?|cread[oa]s?|générée?s?|generee?s?|erstellt)\b.{0,45}(?:\b(?:ai|ia|ki)\b|intelligenc\w*|intelig[eê]ncia|inteligencia)|\b(?:synthetic|cloned)\s+(?:voice|vocals|narrat\w*)\b|\b(?:voice|vocals)\s+clon(?:e|ed|ing)\b|एआई से बन|कृत्रिम बुद्धिमत्ता से निर्मित)/iu;
  const SYNTHETIC_TAG = /(?:^|[^\p{L}\p{N}])#(?:ai(?:generat(?:ed|ion)|art|video[sz]?|animation|animated|voice|cover|music|film|movie|drama|story|stories|cat[sz]?|dog[sz]?|animal[sz]?|monkey|asmr|slop)|sora(?:ai)?|klingai|veo[23]?|suno(?:ai)?|midjourney|inteligenciaartificial)(?=$|[^\p{L}\p{N}])/iu;
  const GENRE_TAG = /(?:^|[^\p{L}\p{N}])#(?:minidrama|shortdrama|microdrama|playlet|brainrot)(?=$|[^\p{L}\p{N}])/iu;
  const BROAD_AI_TAG = /(?:^|[^\p{L}\p{N}])#ai(?=$|[^\p{L}\p{N}])/iu;
  const ANALYSIS = /(?:\b(?:tutorial|review|comparison|compared|comparing|tested|explained|explaining|analysis|analy[sz](?:e|ing|es)|investigat\w*|debunk\w*|fact.check\w*|detect(?:ing|ion|or)s?|recogniz\w*|recognis\w*|reconna[iî]tre|identificar|erkennen|scams?|misinformation|dangers?|copyright|critique|critical|reacting|reaction|behind the scenes|making of)\b|\b(?:how to (?:make|use|spot|identify|create)|why .{0,70}(?:problem|fake|mislead|not realistic)|the (?:problem|truth) (?:with|about))\b|पहचान|ट्यूटोरियल)/iu;
  const PRODUCTION = /(?:\b(?:this|our|the|all|every)\s+(?:\w+\s+){0,3}(?:video|visuals?|frames?|images?|music|songs?|voice|vocals|narration)\b.{0,50}\b(?:generated|created|made|produced|gerad\w*|generad\w*)\b|\b(?:made|created|generated|produced|powered|voiced|narrated)\s+(?:entirely\s+)?(?:with|using|by)\b|\b(?:visuals?|narration|voiceover|vocals?)\s*:)/iu;
  const NEGATION = /(?:\b(?:not|never|no|without|non)[\s-]+(?:\w+[\s-]+){0,2}$|\b(?:do not|don't|does not|doesn't|never)\s+use\s*$|\bfree\s+of\s*$)/iu;

  function affirmative(text, pattern) {
    const matches = text.matchAll(new RegExp(pattern.source, 'giu'));
    for (const match of matches) {
      const prefix = text.slice(Math.max(0, match.index - 65), match.index);
      if (!NEGATION.test(prefix) && !/\b(?:without|not|never|no)\b/iu.test(match[0])) return match[0];
    }
    return '';
  }

  function toolProduction(text) {
    for (const match of text.matchAll(new RegExp(TOOL.source, 'giu'))) {
      const prefix = text.slice(Math.max(0, match.index - 70), match.index);
      const suffix = text.slice(match.index + match[0].length, match.index + match[0].length + 35);
      if (NEGATION.test(prefix)) continue;
      if (/(?:\b(?:made|created|generated|produced|powered|voiced|narrated|rendered|animated)\s+(?:entirely\s+)?(?:with|using|by)|\b(?:using|used)|\b(?:visuals?|narration|voiceover|vocals?|images?|music)\s*(?::|by|with|using))\s*$/iu.test(prefix) || /^[\s-]+generated\b/iu.test(suffix)) return match[0];
    }
    return '';
  }

  function disclosureSignal(text, isAnalysis) {
    // Negation applies to a sentence, so a disclaimer cannot suppress a separate admission.
    for (const sentence of text.split(/[.!?\n]+(?=\s|$)/u)) {
      const generated = affirmative(sentence, GENERATED);
      const tool = toolProduction(sentence);
      const production = PRODUCTION.test(sentence);
      const tag = affirmative(sentence, SYNTHETIC_TAG);
      if (isAnalysis && !production) continue;
      if (/\b(?:do not|don't|never) use\b.{0,80}(?:ai|synthetic|generated)/iu.test(sentence)) continue;
      if (tag) return { score: 0.96, match: tag };
      if (generated || tool) {
        return { score: 0.93, match: generated || tool };
      }
      if (AI.test(sentence) && /(?:génér\w*|generiert|erstellt|gerad\w*|generad\w*|criad\w*|बनाया|निर्मित)/iu.test(sentence)) {
        return { score: 0.93, match: sentence.slice(0, 160) };
      }
    }
    return null;
  }

  function structuralSignals(text, isAnalysis) {
    if (isAnalysis) return [];
    const signals = [];
    const add = (test, score, reason) => { if (test) signals.push({ score, reason, family: 'formula' }); };
    add(/(?:marcus aurelius|seneca|epictetus|stoic|carl jung|dark psychology|sigma male)/u.test(text) &&
      /(?:become dangerous|destroy (?:your enemies|someone)|cold and emotionless|fear (?:you|and respect)|untouchable|make (?:anyone|them|your ex|her|him).{0,25}(?:obsess|addict|chase)|control people|chosen one)/u.test(text),
      0.70, 'Manipulative philosophy formula');
    add(/(?:nasa|james webb|jwst|scientists|astronomers|voyager|archaeologists)/u.test(text) &&
      /(?:terrify|terrified|terrifying|broke physics|breaks physics|secret signal|hiding this|tried to hide|chilling (?:warning|message)|rewrites? (?:human )?history|changes everything|forbidden (?:chamber|tomb)|cannot explain)/u.test(text),
      0.68, 'Sensational discovery formula');
    add(/(?:mafia boss|secret wife|hidden billionaire|contract (?:marriage|wife|bride)|flash marriage|billionaire (?:ex|husband)|ruthless (?:president|ceo)|triplets|quadruplets|genius kids|unloved daughter|surrogate mother|heiress|married a mafia)/u.test(text) &&
      /(?:betray|gave my seat|banquet|divorc|kicked out|beg(?:s|ged)? for mercy|revenge|remarr|kneel|humiliat|his kids|minidrama|mini drama|short drama|micro drama|full version|full ai drama)/u.test(text),
      0.85, 'Melodrama mill formula');
    add(/(?:r\/aita|r\/askreddit|reddit|cheating (?:wife|husband)|entitled parents|aitah)/u.test(text) &&
      /(?:elevenlabs|ai (?:voice|narrat)|\btts\b|text.to.speech|minecraft parkour|subway surfers)/u.test(text),
      0.85, 'Automated Reddit narration');
    add(/(?:chosen ones?|universe.{0,20}chosen you)/u.test(text) &&
      /(?:enemies|jealous|divine power|hidden power|terrified|fear you)/u.test(text),
      0.65, 'Chosen-one content mill formula');
    add(/(?:italian brainrot|tung tung (?:sahur|sahoor)|tralalero tralala|ballerina cappuccina|bombardiro crocodilo)/u.test(text),
      0.70, 'Brainrot character formula');
    add(/(?:kitten|baby cat|baby monkey|puppy)/u.test(text) &&
      /(?:superhero|giant (?:shark|dinosaur)|police officer|firefighter|bullied.{0,20}school|mocked.{0,20}school|works? (?:in|at) a (?:factory|restaurant))/u.test(text),
      0.42, 'Anthropomorphic animal story');
    add(/(?:earn|make|made|income|cash)/u.test(text) &&
      /(?:\$\s*[\d,.]+|\d[\d,.]*\s*(?:dollars|per day|a month))/u.test(text) &&
      /(?:faceless|autopilot|zero work|no work|copy.{0,10}ai videos|ai automation|chatgpt)/u.test(text),
      0.80, 'Automated income-spam formula');
    if (GENRE_TAG.test(text)) signals.push({ score: 0.55, reason: 'Content-mill genre hashtag', family: 'formula' });
    return signals;
  }

  function calculateSlopScore(meta = {}, compiledKeywordsOrOptions = [], maybeOptions = {}) {
    const options = Array.isArray(compiledKeywordsOrOptions) ? maybeOptions : compiledKeywordsOrOptions || {};
    const keywords = Array.isArray(compiledKeywordsOrOptions) ? compiledKeywordsOrOptions : options.compiledKeywords || [];
    const threshold = Number.isFinite(options.sensitivityThreshold) ? options.sensitivityThreshold : 0.50;
    if (options.blockSyntheticDisclosures !== false && meta.hasAiInfoButton) {
      return { score: 1, isBlocked: true, reasons: ['YouTube synthetic-media disclosure'], evidence: { source: 'youtube-dom' } };
    }
    // Card text contains menus, accessibility text and sometimes neighbouring videos.
    const text = normalize([...new Set([meta.fullUntruncatedTitle || meta.title, meta.snippet, meta.scriptText, meta.badgeText].filter(Boolean))].join(' ')).slice(0, 12000);
    const isAnalysis = ANALYSIS.test(normalize(meta.fullUntruncatedTitle || meta.title));
    const signals = [];
    const evidence = {};
    const disclosure = options.blockSyntheticDisclosures !== false ? disclosureSignal(text, isAnalysis) : null;
    if (disclosure) {
      signals.push({ score: disclosure.score, reason: 'Synthetic-media production disclosure', family: 'provenance' });
      evidence.disclosure = disclosure.match;
    }
    if (options.blockKeywords !== false) {
      for (const rule of keywords) {
        if (!rule || typeof rule.test !== 'function') continue;
        rule.lastIndex = 0;
        if (rule.test(text)) {
          signals.push({ score: 0.95, reason: 'User keyword rule', family: 'personal' });
          evidence.keywordRule = rule.source;
          break;
        }
      }
    }
    // Verification is an identity signal; explicit production disclosures still win.
    if (!signals.length && options.whitelistVerified !== false && meta.isVerified) {
      return { score: 0, isBlocked: false, reasons: ['Verified creator protected'], evidence: { source: 'youtube-dom' } };
    }
    signals.push(...structuralSignals(text, isAnalysis));
    if (!isAnalysis) {
      const channel = normalize(meta.channelName);
      if (/\bai\s+(?:stories|dramas?|cinema|animation|music|animals?|history|facts|narrat\w*)\b|\b(?:stories|dramas?|cinema|animation|music|animals?)\s+ai\b/u.test(channel)) {
        signals.push({ score: 0.30, reason: 'Synthetic-content channel identity', family: 'channel' });
      }
      if (options.blockSyntheticDisclosures !== false && BROAD_AI_TAG.test(text)) {
        signals.push({ score: 0.30, reason: 'AI hashtag', family: 'provenance' });
      }
    }
    const strongest = Math.max(0, ...signals.map(signal => signal.score));
    const deniesGeneration = /\b(?:do not|don't|never) use\b.{0,80}(?:ai|synthetic|generated)|\b(?:not|without|non)[\s-]+ai[\s-]+generated/iu.test(text);
    if (strongest < threshold && !isAnalysis && !deniesGeneration) {
      const model = window.NoSlopSemantic?.predict?.(meta);
      if (model?.score > 0) signals.push({ score: model.score, reason: 'Learned video-text similarity', family: 'text' });
      if (model) evidence.model = model.evidence;
    }
    // Correlated text formulas share one vote. Independent channel/provenance evidence can reinforce it.
    const families = new Map();
    for (const signal of signals) {
      const family = signal.family === 'formula' ? 'text' : signal.family;
      families.set(family, Math.max(families.get(family) || 0, signal.score));
    }
    const votes = [...families.values()];
    const score = Number((1 - votes.reduce((remaining, vote) => remaining * (1 - vote), 1)).toFixed(3));
    return { score, isBlocked: score >= threshold, reasons: [...new Set(signals.map(signal => signal.reason))], evidence: { ...evidence, families: Object.fromEntries(families) } };
  }

  window.NoSlopScoring = {
    calculate: calculateSlopScore,
    calculateScore: calculateSlopScore,
    isDisclosureText: text => Boolean(disclosureSignal(normalize(text), false))
  };
})();
