/**
 * NoSlop - Content Script (Orchestrator v5.0)
 * Ultra-low CPU/RAM via IntersectionObserver lazy viewport evaluation.
 * Clean, non-intrusive action buttons near video titles.
 * Frictionless 1-click slop reporting with zero watch-page playback disruption.
 * Verified creator safety and instant placeholder unhiding.
 */

(() => {
  'use strict';

  console.log('%c[NoSlop 5.0]%c Active with Lazy Viewport Evaluation & Creator Safety.', 'color: #f43f5e; font-weight: bold', 'color: #94a3b8');

  const SENSITIVITY_THRESHOLDS = {
    aggressive: 0.35,
    balanced: 0.50,
    conservative: 0.65
  };

  const CARD_SELECTORS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-playlist-renderer',
    'ytd-playlist-video-renderer',
    'ytd-shelf-renderer',
    'ytd-reel-shelf-renderer',
    'ytd-reel-item-renderer',
    'ytd-reel-video-renderer',
    'ytd-radio-renderer',
    'ytd-movie-renderer',
    'ytd-channel-renderer',
    'ytd-notification-renderer',
    'ytm-rich-item-renderer',
    'ytm-video-with-context-renderer',
    'ytm-compact-video-renderer',
    'ytm-reel-item-renderer',
    'ytm-shorts-lockup-view-model',
    'ytm-shorts-lockup-view-model-v2',
    'yt-lockup-view-model'
  ];
  const CARD_SELECTOR_TEXT = CARD_SELECTORS.join(', ');

  const ROOT_CONTAINER_SELECTORS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-playlist-renderer',
    'ytd-shelf-renderer',
    'ytd-reel-shelf-renderer',
    'ytd-radio-renderer',
    'ytd-movie-renderer',
    'ytd-channel-renderer',
    'ytd-notification-renderer',
    'ytm-rich-item-renderer',
    'ytm-video-with-context-renderer',
    'ytm-compact-video-renderer',
    'ytm-reel-item-renderer',
    'ytm-shorts-lockup-view-model',
    'ytm-shorts-lockup-view-model-v2'
  ];
  const ROOT_CONTAINER_SELECTOR_TEXT = ROOT_CONTAINER_SELECTORS.join(', ');

  // These are deliberately compound or context-gated signals. A bare "AI"
  // or a generator product name is not evidence that a video is synthetic.
  const DEFAULT_KEYWORDS = [
    'ai generated', 'ai-generated', 'ai drama', 'ai-drama', 'full ai drama',
    'ai dub', 'ai dubbed', 'ai romance', 'ai series', 'ai recap', 'ai video',
    'ai animation', 'ai animated', 'ai film', 'ai movie', 'ai story',
    'ai stories', 'ai voice', 'ai cover', 'ai song', 'ai slop',
    'made with ai', 'created with ai', 'minidrama', 'mini drama',
    'short drama', 'micro drama', 'sora', 'kling', 'runway gen', 'runwayml',
    'elevenlabs', 'luma dream machine', 'pika labs', 'flux.1',
    'flux ai', 'haiper', 'stable diffusion', 'stablediffusion',
    'deepfake', 'synthesia', 'heygen', 'minimax', 'hailuo', 'suno ai',
    'udio ai', 'ai philosophy', 'ai stoic', 'ai stoicism', 'ai quotes',
    'ai motivation', 'ai psychology', 'dark psychology ai',
    'faceless channel', 'chatgpt stories', 'reddit ai', 'ai facts',
    'mafia banquet', 'contract marriage', 'flash marriage',
    'tempting dramas', 'next episode drama'
  ];

  let settings = {
    enabled: true,
    engineScoring: true,        // Engine 1
    sensitivity: "balanced",
    engineThumbnails: false,    // Engine 2: DISABLED by default to protect human creators using AI art
    whitelistVerified: true,    // Protects verified channels (StarTalk, Diary of a CEO, etc.)
    engineCommunity: true,      // Engine 3
    engineAudioScript: true,    // Engine 4
    blockSyntheticDisclosures: true,
    blockKeywords: true,
    blockShorts: false,         // FALSE by default: only AI slop shorts are blocked, human shorts stay
    placeholderMode: false,     // Clean AdBlock style (default)
    customKeywords: [],
    blockedChannels: [],
    allowedChannels: [],
    remoteChannels: [],
    remoteVideos: []
  };

  let compiledKeywordRegexes = [];
  let blockedCountCurrentTab = 0;
  let lastUrl = window.location.href;
  let evaluationGeneration = 0;
  const processingCards = new WeakSet();
  const hydrationRetryCounts = new WeakMap();

  function buildKeywordRegex(kw) {
    const clean = kw.trim();
    if (!clean) return null;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped.startsWith('#')) {
      return new RegExp('(?:^|[^a-zA-Z0-9])' + escaped + '(?=[^a-zA-Z0-9]|$)', 'iu');
    }
    return new RegExp('\\b' + escaped.replace(/\s+/g, '[\\s_-]+') + '\\b', 'iu');
  }

  function updateCompiledKeywords() {
    const userList = Array.isArray(settings.customKeywords) ? settings.customKeywords : [];
    const combined = Array.from(new Set([...DEFAULT_KEYWORDS, ...userList]))
      .filter(k => typeof k === 'string' && k.trim().toLowerCase() !== 'ai');
    compiledKeywordRegexes = combined.map(buildKeywordRegex).filter(Boolean);
  }

  // Pre-compile default keywords synchronously on script bootstrap
  updateCompiledKeywords();

  function loadSettings() {
    updateCompiledKeywords();
    chrome.storage.sync.get(null, (syncData) => {
      if (chrome.runtime.lastError) {
        console.warn('[NoSlop] Could not read sync settings:', chrome.runtime.lastError.message);
      } else if (syncData && Object.keys(syncData).length > 0) {
        settings = { ...settings, ...syncData };
      }
      updateCompiledKeywords();

      // Load 46k+ community blocklist from local storage
      chrome.storage.local.get(['remoteChannels', 'remoteVideos', 'learningExamples'], (localData) => {
        if (localData?.remoteChannels) {
          settings.remoteChannels = localData.remoteChannels;
        }
        if (localData?.remoteVideos) {
          settings.remoteVideos = localData.remoteVideos;
        }

        if (window.NoSlopCommunity) {
          window.NoSlopCommunity.init(
            settings.blockedChannels,
            settings.remoteChannels,
            settings.remoteVideos,
            settings.allowedChannels
          );
        }
        window.NoSlopSemantic?.learnExamples?.(localData?.learningExamples || []);

        resetAllCards({ preserveRevealed: true });
        scanFeed();
      });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      let masterToggledOff = false;
      for (const [key, change] of Object.entries(changes)) {
        settings[key] = change.newValue;
        if (key === 'enabled' && change.newValue === false) {
          masterToggledOff = true;
        }
      }
      updateCompiledKeywords();
      if (window.NoSlopCommunity) {
        window.NoSlopCommunity.init(
          settings.blockedChannels,
          settings.remoteChannels,
          settings.remoteVideos,
          settings.allowedChannels
        );
      }

      if (masterToggledOff) {
        resetAllCards();
      } else {
        // Re-evaluate existing cards when any rule or engine changes. Leaving
        // the old status in place makes toggles appear broken until navigation.
        resetAllCards({ preserveRevealed: true });
        scanFeed();
      }
    } else if (area === 'local') {
      if (changes.remoteChannels) {
        settings.remoteChannels = changes.remoteChannels.newValue || [];
      }
      if (changes.remoteVideos) {
        settings.remoteVideos = changes.remoteVideos.newValue || [];
      }
      if (window.NoSlopCommunity) {
        window.NoSlopCommunity.init(
          settings.blockedChannels,
          settings.remoteChannels,
          settings.remoteVideos,
          settings.allowedChannels
        );
      }
      resetAllCards({ preserveRevealed: true });
      scanFeed();
    }
  });

  function cardPlaceholder(rootCard) {
    const previous = rootCard?.previousElementSibling;
    return previous?.classList.contains('noslop-placeholder') ? previous : null;
  }

  function clearCardVisualState(rootCard) {
    rootCard.classList.remove('noslop-hidden', 'noslop-revealed', 'noslop-collapsed');
    rootCard.style.removeProperty('display');
    rootCard.style.removeProperty('visibility');
    rootCard.style.removeProperty('height');
    rootCard.style.removeProperty('min-height');
    rootCard.style.removeProperty('max-height');
    rootCard.style.removeProperty('margin');
    rootCard.style.removeProperty('padding');
    rootCard.style.removeProperty('overflow');
    rootCard.style.removeProperty('opacity');
    rootCard.style.removeProperty('pointer-events');
    cardPlaceholder(rootCard)?.remove();
  }

  function resetAllCards({ preserveRevealed = false } = {}) {
    evaluationGeneration++;
    document.querySelectorAll('[data-noslop-sig]').forEach((el) => {
      const isRevealed = el.dataset.noslopStatus === 'revealed' || el.classList.contains('noslop-revealed');
      if (preserveRevealed && isRevealed) return;

      cardObserver.unobserve(el);
      el.removeAttribute('data-noslop-sig');
      el.removeAttribute('data-noslop-status');
      el.removeAttribute('data-noslop-reason');
      el.removeAttribute('data-noslop-observed');
      clearCardVisualState(el);
      hydrationRetryCounts.delete(el);
    });

    if (!preserveRevealed) {
      document.querySelectorAll('.noslop-title-actions').forEach((el) => el.remove());
    }
  }

  function findRootCard(el) {
    const outer = el.parentElement?.closest(ROOT_CONTAINER_SELECTOR_TEXT);
    if (outer) return outer;
    return el.closest(CARD_SELECTOR_TEXT) || el;
  }

  function metadataSignature(meta) {
    return `${meta.videoId || ''}||${meta.title}||${meta.channelName}||${(meta.snippet || '').slice(0, 30)}`;
  }

  function extractMetadata(rootCard) {
    const titleCandidates = [];
    let fullUntruncatedTitle = '';

    const titleEl = rootCard.querySelector(
      '#video-title, #video-title-link, a.yt-lockup-metadata-view-model-wiz__title, h3 a, h3, .yt-core-attributed-string, ytd-reel-player-header-renderer #title, #overlay h2'
    );

    if (titleEl) {
      if (titleEl.textContent) titleCandidates.push(titleEl.textContent);
      const attrTitle = titleEl.getAttribute('title');
      if (attrTitle) {
        titleCandidates.push(attrTitle);
        fullUntruncatedTitle = attrTitle;
      }
      const attrAria = titleEl.getAttribute('aria-label');
      if (attrAria) {
        titleCandidates.push(attrAria);
        if (!fullUntruncatedTitle) fullUntruncatedTitle = attrAria;
      }
    }

    const watchLink = rootCard.querySelector('a[href*="/watch?v="], a[href^="/shorts/"]');
    let videoId = '';
    if (watchLink) {
      const linkTitle = watchLink.getAttribute('title');
      if (linkTitle) {
        titleCandidates.push(linkTitle);
        if (!fullUntruncatedTitle) fullUntruncatedTitle = linkTitle;
      }
      const linkAria = watchLink.getAttribute('aria-label');
      if (linkAria) {
        titleCandidates.push(linkAria);
        if (!fullUntruncatedTitle) fullUntruncatedTitle = linkAria;
      }
      const href = watchLink.getAttribute('href') || '';
      const watchMatch = href.match(/[?&]v=([^&]+)/);
      const shortsMatch = href.match(/^\/shorts\/([^/?]+)/);
      if (watchMatch) videoId = watchMatch[1];
      else if (shortsMatch) videoId = shortsMatch[1];
    }

    const title = titleCandidates.join(' ').replace(/\s+/g, ' ').trim();

    // 2. Channel Name & Verified Status
    const channelEl = rootCard.querySelector(
      'ytd-channel-name, #channel-name, #text.ytd-channel-name, a.yt-simple-endpoint[href*="/@"], a.yt-simple-endpoint[href*="/channel/"], .yt-lockup-metadata-view-model-wiz__metadata a, #byline-container a, #channel-info, ytd-reel-player-header-renderer a'
    );
    const channelName = (channelEl?.textContent || '').replace(/\s+/g, ' ').trim();
    const channelLink = channelEl?.matches?.('a[href*="/@"], a[href*="/channel/"]')
      ? channelEl
      : channelEl?.querySelector?.('a[href*="/@"], a[href*="/channel/"]');
    const channelHref = channelLink?.getAttribute('href') || channelEl?.getAttribute('href') || '';

    // Check if channel has YouTube's verified badge
    const isVerified = Boolean(rootCard.querySelector(
      '[aria-label="Verified"], [aria-label*="Verified" i], .badge-style-type-verified, ytd-badge-supported-renderer [aria-label*="Verified"]'
    ));

    // 3. Description Snippet (Search Results)
    const snippetEl = rootCard.querySelector(
      '#description-text, .metadata-snippet-container, .metadata-snippet-text, yt-formatted-string.metadata-snippet-text, #snippet, yt-formatted-string[class*="snippet"], ytd-video-renderer .metadata-snippet-container span, ytd-playlist-renderer #description'
    );
    const snippet = (snippetEl?.textContent || '').replace(/\s+/g, ' ').trim();

    // 4. Badges
    const badgeText = Array.from(rootCard.querySelectorAll(
      'ytd-badge-supported-renderer, yt-badge-view-model, .badge-shape'
    )).map(b => b.textContent).join(' ');

    const cardText = (rootCard.textContent || '').replace(/\s+/g, ' ').trim();

    // 5. Explicit YouTube AI Info Button Check on the card (Precise UI element check only)
    const aiInfoBtn = rootCard.querySelector(
      'button[aria-label*="How this content was made" i], button[aria-label*="Altered or synthetic" i], [aria-label*="Altered or synthetic content" i]'
    );
    const hasAiInfoButton = Boolean(aiInfoBtn);

    const isShort = Boolean(
      rootCard.matches('ytd-reel-item-renderer, ytm-shorts-lockup-view-model-v2') ||
      rootCard.closest('ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts]') ||
      rootCard.querySelector('a[href^="/shorts/"]')
    );

    const thumbnailImg = rootCard.querySelector('#thumbnail img, ytd-thumbnail img, yt-image img');

    return {
      title,
      fullUntruncatedTitle,
      videoId,
      channelName,
      channelHref,
      isVerified,
      snippet,
      scriptText: snippet,
      badgeText,
      cardText,
      hasAiInfoButton,
      isShort,
      thumbnailImg
    };
  }

  async function evaluateVideo(meta) {
    const baseThreshold = SENSITIVITY_THRESHOLDS[settings.sensitivity] || 0.50;
    const threshold = (meta.isShort && settings.blockShorts)
      ? Math.min(baseThreshold, 0.40)
      : baseThreshold;

    if (window.NoSlopCommunity?.isChannelAllowed?.(meta.channelName, meta.channelHref)) {
      return { isBlocked: false, score: 0.0, reason: 'User Allowlist' };
    }

    // 1. Engine 3: Community & Curated Blocklist (Instant O(1) multi-index lookup)
    if (settings.engineCommunity !== false && window.NoSlopCommunity) {
      if (meta.videoId && window.NoSlopCommunity.isVideoBlocked(meta.videoId)) {
        return { isBlocked: true, score: 1.0, reason: 'Community Blocklisted Video ID' };
      }

      const commCheck = window.NoSlopCommunity.isChannelBlocked(meta.channelName, meta.channelHref);
      if (commCheck.blocked) {
        return { isBlocked: true, score: 1.0, reason: commCheck.source };
      }
    }

    // 2. Engine 1: Multi-Signal Bayesian Heuristic Scoring
    if (settings.engineScoring !== false && window.NoSlopScoring) {
      const scoreFn = (typeof window.NoSlopScoring.calculateScore === 'function')
        ? window.NoSlopScoring.calculateScore
        : (typeof window.NoSlopScoring.calculate === 'function' ? window.NoSlopScoring.calculate : null);

      if (scoreFn) {
        const scoringResult = scoreFn(
          meta,
          settings.blockKeywords !== false ? compiledKeywordRegexes : [],
          {
            blockSyntheticDisclosures: settings.blockSyntheticDisclosures !== false,
            whitelistVerified: settings.whitelistVerified !== false
          }
        );

        // If AI Shorts filter is toggled, enforce stricter sensitivity (0.40) on shorts, but NEVER blanket block clean human videos
        if (scoringResult && scoringResult.score >= threshold) {
          return {
            isBlocked: true,
            score: scoringResult.score,
            reason: (scoringResult.reasons && scoringResult.reasons.join(' + ')) || 'High AI Probability'
          };
        }
      }
    }

    // 3. Engine 4: lightweight script-pattern analysis. The audio engine is
    // intentionally metadata-only here; opening an AudioContext for every
    // feed card would interfere with playback and waste significant CPU.
    if (settings.engineAudioScript !== false && window.NoSlopAudioScript?.analyzeScript) {
      const scriptResult = window.NoSlopAudioScript.analyzeScript(meta.scriptText || '');
      if (scriptResult?.score >= threshold) {
        return {
          isBlocked: true,
          score: scriptResult.score,
          reason: scriptResult.reason || 'LLM Script Pattern'
        };
      }
    }

    // 4. Engine 2: Thumbnail Vision Texture Scanner (Disabled by default to protect human creators)
    if (settings.engineThumbnails && window.NoSlopVision && meta.thumbnailImg) {
      const visionResult = await window.NoSlopVision.scanThumbnail(meta.thumbnailImg);
      if (visionResult.isAI && visionResult.score >= 0.70) {
        return {
          isBlocked: true,
          score: visionResult.score,
          reason: `AI Thumbnail Vision (${visionResult.reason})`
        };
      }
    }

    return { isBlocked: false, score: 0.0, reason: 'Clean' };
  }

  function applyBlock(rootCard, meta, reason = 'AI Content', score = 1.0) {
    if (rootCard.dataset.noslopStatus === 'revealed' || rootCard.classList.contains('noslop-revealed')) {
      return;
    }

    rootCard.dataset.noslopStatus = 'blocked';
    rootCard.dataset.noslopReason = reason;

    if (settings.placeholderMode) {
      rootCard.classList.add('noslop-hidden');
      rootCard.style.setProperty('display', 'none', 'important');

      let placeholder = cardPlaceholder(rootCard);
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'noslop-placeholder';

        const info = document.createElement('div');
        info.className = 'noslop-placeholder-info';

        const badge = document.createElement('span');
        badge.className = 'noslop-placeholder-badge';
        badge.textContent = 'AI Hidden';

        const reasonEl = document.createElement('span');
        reasonEl.className = 'noslop-placeholder-reason';
        reasonEl.title = reason;
        reasonEl.textContent = `${(meta.title || 'AI Video').slice(0, 48)}...`;

        const revealBtn = document.createElement('button');
        revealBtn.type = 'button';
        revealBtn.className = 'noslop-reveal-btn';
        revealBtn.textContent = 'Show';

        info.append(badge, reasonEl);
        placeholder.append(info, revealBtn);

        revealBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          rootCard.classList.remove('noslop-hidden', 'noslop-collapsed');
          rootCard.classList.add('noslop-revealed');
          rootCard.dataset.noslopStatus = 'revealed';
          rootCard.style.removeProperty('display');
          rootCard.style.removeProperty('visibility');
          rootCard.style.removeProperty('height');
          rootCard.style.removeProperty('min-height');
          rootCard.style.removeProperty('max-height');
          rootCard.style.removeProperty('margin');
          rootCard.style.removeProperty('padding');
          rootCard.style.removeProperty('overflow');
          rootCard.style.removeProperty('opacity');
          rootCard.style.removeProperty('pointer-events');
          placeholder.remove();
        });

        rootCard.parentNode?.insertBefore(placeholder, rootCard);
      }
    } else {
      cardPlaceholder(rootCard)?.remove();

      rootCard.classList.add('noslop-hidden');
      rootCard.style.setProperty('display', 'none', 'important');
      rootCard.style.setProperty('height', '0px', 'important');
      rootCard.style.setProperty('min-height', '0px', 'important');
      rootCard.style.setProperty('margin', '0px', 'important');
      rootCard.style.setProperty('padding', '0px', 'important');
      rootCard.style.setProperty('overflow', 'hidden', 'important');
    }

    if (!rootCard.dataset.noslopCounted) {
      rootCard.dataset.noslopCounted = 'true';
      blockedCountCurrentTab++;
      try {
        chrome.runtime.sendMessage({ action: 'videoBlocked', count: 1 });
      } catch {}
    }
  }

  /**
   * Action buttons: Placed unobtrusively near title/3-dots, 1-Click Auto-Block & Report
   */
  function injectQuickBlockAction(rootCard, meta) {
    if (!rootCard || rootCard.querySelector('.noslop-title-actions')) return;

    // Prefer YouTube's #menu (next to 3-dots), fallback to title container or metadata
    const targetMenu = rootCard.querySelector('#menu, ytd-menu-renderer, #menu-container');
    const titleContainer = rootCard.querySelector('#title-wrapper, #meta, #details, .yt-lockup-metadata-view-model-wiz__metadata');
    const container = targetMenu || titleContainer;
    if (!container) return;

    const actionContainer = document.createElement('div');
    actionContainer.className = 'noslop-title-actions';

    // 1-Click Auto Slop Report & Block Button (Instant vanish + auto blacklist + auto queue)
    const reportBtn = document.createElement('button');
    reportBtn.className = 'noslop-title-btn noslop-report-btn';
    reportBtn.type = 'button';
    reportBtn.title = `1-Click: Auto-block channel "${meta.channelName || 'this channel'}" and report as AI slop`;
    reportBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
        <line x1="4" y1="22" x2="4" y2="15"></line>
      </svg>
      <span>⚑ Slop</span>
    `;

    reportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const freshMeta = extractMetadata(rootCard);
      const chName = freshMeta.channelName || meta.channelName || 'Reported Channel';

      // Immediately hide the card
      applyBlock(rootCard, freshMeta, 'User Reported AI Slop');

      if (chName && chName !== 'Reported Channel') {
        addChannelToBlocklist(chName);
      }

      // Auto-save to report queue
      chrome.storage.local.get(['reportedSlopQueue'], (data) => {
        const queue = data.reportedSlopQueue || [];
        const report = {
          channelName: chName,
          channelHref: freshMeta.channelHref || meta.channelHref,
          videoTitle: freshMeta.fullUntruncatedTitle || freshMeta.title || meta.title,
          videoId: freshMeta.videoId || meta.videoId,
          timestamp: new Date().toISOString()
        };
        const reportKey = report.videoId || `${report.channelHref}|${report.videoTitle}`;
        const withoutDuplicate = queue.filter(item =>
          (item.videoId || `${item.channelHref}|${item.videoTitle}`) !== reportKey
        );
        withoutDuplicate.push(report);
        chrome.storage.local.set({ reportedSlopQueue: withoutDuplicate.slice(-500) });

        chrome.storage.local.get(['learningExamples'], (learningData) => {
          const examples = Array.isArray(learningData.learningExamples) ? learningData.learningExamples : [];
          examples.push({
            label: 1,
            text: [report.videoTitle, report.channelName].filter(Boolean).join(' '),
            timestamp: report.timestamp
          });
          const bounded = examples.slice(-2000);
          chrome.storage.local.set({ learningExamples: bounded });
          window.NoSlopSemantic?.learnExamples?.([bounded[bounded.length - 1]]);
        });
      });

      try {
        chrome.runtime.sendMessage({
          action: 'openReport',
          channelName: chName,
          channelHref: freshMeta.channelHref || meta.channelHref,
          videoTitle: freshMeta.fullUntruncatedTitle || freshMeta.title || meta.title,
          videoId: freshMeta.videoId || meta.videoId
        });
      } catch {}

      showToast(`Blocked & Reported "${chName}" as AI slop`);
    });

    actionContainer.appendChild(reportBtn);

    if (targetMenu) {
      targetMenu.insertBefore(actionContainer, targetMenu.firstChild);
    } else {
      container.appendChild(actionContainer);
    }
  }

  function addChannelToBlocklist(channelName) {
    chrome.storage.sync.get('blockedChannels', (data) => {
      const list = data.blockedChannels || [];
      if (!list.includes(channelName)) {
        list.push(channelName);
        chrome.storage.sync.set({ blockedChannels: list }, () => {
          settings.blockedChannels = list;
          if (window.NoSlopCommunity) {
            window.NoSlopCommunity.init(list, settings.remoteChannels, settings.remoteVideos, settings.allowedChannels);
          }
          scanFeed();
        });
      }
    });
  }

  function showToast(message) {
    const existing = document.querySelector('.noslop-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'noslop-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  /**
   * Process an individual card that has entered the viewport or hydrated
   */
  function retryHydratingCard(rootCard) {
    const attempts = hydrationRetryCounts.get(rootCard) || 0;
    if (attempts >= 10) return false;

    hydrationRetryCounts.set(rootCard, attempts + 1);
    setTimeout(() => {
      if (!rootCard.isConnected || rootCard.dataset.noslopStatus === 'revealed') return;
      rootCard.removeAttribute('data-noslop-sig');
      processCard(rootCard);
    }, 150);
    return true;
  }

  async function processCard(rootCard) {
    if (!rootCard || !rootCard.isConnected) return;
    if (rootCard.dataset.noslopStatus === 'revealed' || rootCard.classList.contains('noslop-revealed')) return;

    const meta = extractMetadata(rootCard);
    if (!meta.title || meta.title.length < 2) {
      retryHydratingCard(rootCard);
      return;
    }

    // Do not make a final decision while Polymer/Wiz is still hydrating the
    // channel metadata. This prevents a title-only false positive from being
    // permanently applied before the channel whitelist/blocklist is visible.
    if (!meta.channelName && !meta.channelHref && retryHydratingCard(rootCard)) {
      return;
    }
    hydrationRetryCounts.delete(rootCard);

    const sig = metadataSignature(meta);
    if (rootCard.dataset.noslopSig === sig &&
        (rootCard.dataset.noslopStatus === 'clean' || rootCard.dataset.noslopStatus === 'blocked')) return;

    if (processingCards.has(rootCard)) return;
    processingCards.add(rootCard);
    const generationAtStart = evaluationGeneration;

    const wasBlocked = rootCard.dataset.noslopStatus === 'blocked';
    if (wasBlocked) {
      clearCardVisualState(rootCard);
      rootCard.removeAttribute('data-noslop-status');
    }
    rootCard.dataset.noslopSig = sig;

    try {
      const evalResult = await evaluateVideo(meta);

      // Thumbnail analysis is asynchronous. If YouTube recycled this node
      // while it was running, discard the stale result and evaluate the new
      // metadata instead of blocking the wrong video.
      if (!rootCard.isConnected) return;
      if (generationAtStart !== evaluationGeneration) {
        rootCard.removeAttribute('data-noslop-sig');
        rootCard.removeAttribute('data-noslop-status');
        clearCardVisualState(rootCard);
        setTimeout(() => processCard(rootCard), 0);
        return;
      }
      const latestMeta = extractMetadata(rootCard);
      const latestSig = metadataSignature(latestMeta);
      if (latestSig !== sig) {
        rootCard.removeAttribute('data-noslop-sig');
        rootCard.removeAttribute('data-noslop-status');
        clearCardVisualState(rootCard);
        setTimeout(() => processCard(rootCard), 0);
        return;
      }

      if (evalResult.isBlocked) {
        applyBlock(rootCard, meta, evalResult.reason, evalResult.score);
      } else {
        clearCardVisualState(rootCard);
        rootCard.dataset.noslopStatus = 'clean';
        if (meta.channelName) {
          injectQuickBlockAction(rootCard, meta);
        }
      }
    } finally {
      processingCards.delete(rootCard);
    }
  }

  function isElementInViewport(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom >= -200 && rect.top <= vh + 300;
  }

  /**
   * Ultra-low CPU IntersectionObserver: Only evaluates cards as they approach viewport
   */
  const cardObserver = new IntersectionObserver((entries) => {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.isIntersecting) {
        const rootCard = entry.target;
        cardObserver.unobserve(rootCard);
        processCard(rootCard);
      }
    }
  }, {
    root: null,
    rootMargin: '300px 0px 300px 0px',
    threshold: 0
  });

  /**
   * Main scan loop: Immediately processes viewport cards; queues offscreen cards
   */
  function scanFeed() {
    if (!settings.enabled) return;

    const elements = document.querySelectorAll(CARD_SELECTOR_TEXT);

    for (let i = 0; i < elements.length; i++) {
      const rootCard = findRootCard(elements[i]);
      if (!rootCard || !rootCard.isConnected) continue;
      if (rootCard.dataset.noslopStatus === 'revealed' || rootCard.classList.contains('noslop-revealed')) continue;

      if (isElementInViewport(rootCard)) {
        processCard(rootCard);
      } else if (!rootCard.dataset.noslopObserved) {
        rootCard.dataset.noslopObserved = 'true';
        cardObserver.observe(rootCard);
      }
    }
  }

  // DOM Mutation Observer (debounced, ignores NoSlop's own nodes to prevent feedback loops)
  let debounceTimeout = null;
  const observer = new MutationObserver((mutations) => {
    let hasExternalNodes = false;
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.type === 'childList') {
        for (let j = 0; j < m.addedNodes.length; j++) {
          const n = m.addedNodes[j];
          if (n.nodeType === 1) {
            const cl = n.classList;
            if (cl && (cl.contains('noslop-title-actions') || cl.contains('noslop-placeholder') || cl.contains('noslop-toast') || cl.contains('noslop-hidden') || cl.contains('noslop-revealed'))) {
              continue;
            }
            hasExternalNodes = true;
            break;
          }
        }
      }
      if (m.type === 'characterData') {
        const parent = m.target.parentElement;
        if (parent?.closest(CARD_SELECTOR_TEXT) &&
            !parent.closest('.noslop-title-actions, .noslop-placeholder, .noslop-toast')) {
          hasExternalNodes = true;
        }
      }
      if (m.type === 'attributes') {
        const target = m.target;
        if (target.closest?.(CARD_SELECTOR_TEXT) &&
            !target.closest('.noslop-title-actions, .noslop-placeholder, .noslop-toast')) {
          hasExternalNodes = true;
        }
      }
      if (hasExternalNodes) break;
    }
    if (!hasExternalNodes) return;

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(scanFeed, 150);
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['title', 'aria-label', 'href']
    });
    scanFeed();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title', 'aria-label', 'href']
      });
      scanFeed();
    });
  }

  // Handle YouTube SPA page transitions & dynamic feed updates
  window.addEventListener('yt-navigate-finish', () => {
    lastUrl = window.location.href;
    resetAllCards();
    setTimeout(scanFeed, 100);
    setTimeout(scanFeed, 500);
    setTimeout(scanFeed, 1200);
  });

  window.addEventListener('yt-page-data-updated', () => {
    setTimeout(scanFeed, 100);
    setTimeout(scanFeed, 500);
  });

  window.addEventListener('spfdone', scanFeed);
  window.addEventListener('popstate', () => {
    resetAllCards();
    setTimeout(scanFeed, 150);
  });

  loadSettings();
})();
