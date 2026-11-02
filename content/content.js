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

  const DEFAULT_KEYWORDS = [
    "ai generated",
    "ai-generated",
    "ai drama",
    "ai-drama",
    "ai dub",
    "ai dubbed",
    "ai romance",
    "ai series",
    "ai recap",
    "ai video",
    "ai animation",
    "ai animated",
    "ai film",
    "ai movie",
    "ai story",
    "ai stories",
    "ai voice",
    "ai cover",
    "ai song",
    "ai slop",
    "made with ai",
    "created with ai",
    "minidrama",
    "mini drama",
    "short drama",
    "sora",
    "kling",
    "runway gen",
    "runwayml",
    "elevenlabs",
    "luma dream machine",
    "pika labs",
    "flux.1",
    "flux ai",
    "haiper",
    "stable diffusion",
    "stablediffusion",
    "deepfake",
    "synthesia",
    "heygen",
    "minimax",
    "hailuo",
    "suno ai",
    "udio ai",
    "ai philosophy",
    "ai stoic",
    "ai stoicism",
    "ai quotes",
    "ai motivation",
    "ai psychology",
    "dark psychology ai",
    "faceless channel",
    "chatgpt stories",
    "reddit ai",
    "ai facts",
    "cloned voice",
    "deepfake voice",
    "ai voice cover",
    "text to speech",
    "text-to-speech"
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
    customKeywords: DEFAULT_KEYWORDS,
    blockedChannels: [],
    remoteChannels: [],
    remoteVideos: []
  };

  let compiledKeywordRegexes = [];
  let blockedCountCurrentTab = 0;
  let lastUrl = window.location.href;

  function buildKeywordRegex(kw) {
    const clean = kw.trim();
    if (!clean) return null;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped.startsWith('#')) {
      return new RegExp('(?:^|[^a-zA-Z0-9])' + escaped + '(?=[^a-zA-Z0-9]|$)', 'iu');
    }
    return new RegExp('\\b' + escaped.replace(/\\s+/g, '[\\s_-]+') + '\\b', 'iu');
  }

  function updateCompiledKeywords() {
    const userList = Array.isArray(settings.customKeywords) ? settings.customKeywords : [];
    const combined = Array.from(new Set([...DEFAULT_KEYWORDS, ...userList]))
      .filter(k => k.trim().toLowerCase() !== 'ai');
    compiledKeywordRegexes = combined.map(buildKeywordRegex).filter(Boolean);
  }

  function loadSettings() {
    chrome.storage.sync.get(null, (syncData) => {
      if (chrome.runtime.lastError) return;
      if (syncData && Object.keys(syncData).length > 0) {
        settings = { ...settings, ...syncData };
      }
      updateCompiledKeywords();

      // Load 46k+ community blocklist from local storage
      chrome.storage.local.get(['remoteChannels', 'remoteVideos'], (localData) => {
        if (localData?.remoteChannels) {
          settings.remoteChannels = localData.remoteChannels;
        }
        if (localData?.remoteVideos) {
          settings.remoteVideos = localData.remoteVideos;
        }

        if (window.NoSlopCommunity) {
          window.NoSlopCommunity.init(settings.blockedChannels, settings.remoteChannels, settings.remoteVideos);
        }

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
        window.NoSlopCommunity.init(settings.blockedChannels, settings.remoteChannels, settings.remoteVideos);
      }

      if (masterToggledOff) {
        resetAllCards();
      } else {
        // Never unhide already blocked cards when adjusting options to prevent screen flickering
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
        window.NoSlopCommunity.init(settings.blockedChannels, settings.remoteChannels, settings.remoteVideos);
      }
      scanFeed();
    }
  });

  function resetAllCards() {
    document.querySelectorAll('[data-noslop-sig]').forEach((el) => {
      el.removeAttribute('data-noslop-sig');
      el.removeAttribute('data-noslop-status');
      el.removeAttribute('data-noslop-observed');
      el.classList.remove('noslop-hidden', 'noslop-revealed');
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('height');
      el.style.removeProperty('min-height');
      el.style.removeProperty('max-height');
      el.style.removeProperty('margin');
      el.style.removeProperty('padding');
      el.style.removeProperty('overflow');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
      const placeholder = el.parentNode?.querySelector('.noslop-placeholder');
      if (placeholder) placeholder.remove();
    });

    document.querySelectorAll('.noslop-title-actions').forEach((el) => el.remove());
  }

  function findRootCard(el) {
    const outer = el.closest(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer, ytd-reel-video-renderer, ytd-playlist-video-renderer, ytd-notification-renderer'
    );
    if (outer) return outer;
    return el.closest('yt-lockup-view-model, ytm-shorts-lockup-view-model-v2') || el;
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

    const watchLink = rootCard.querySelector('a[href*="/watch?v="]');
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
      const match = href.match(/[?&]v=([^&]+)/);
      if (match) videoId = match[1];
    }

    const title = titleCandidates.join(' ').replace(/\s+/g, ' ').trim();

    // 2. Channel Name & Verified Status
    const channelEl = rootCard.querySelector(
      'ytd-channel-name, #channel-name, #text.ytd-channel-name, a.yt-simple-endpoint[href*="/@"], a.yt-simple-endpoint[href*="/channel/"], .yt-lockup-metadata-view-model-wiz__metadata a, #byline-container a, #channel-info, ytd-reel-player-header-renderer a'
    );
    const channelName = (channelEl?.textContent || '').replace(/\s+/g, ' ').trim();
    const channelHref = channelEl?.getAttribute('href') || '';

    // Check if channel has YouTube's verified badge
    const isVerified = Boolean(rootCard.querySelector(
      '[aria-label="Verified"], [aria-label*="Verified" i], .badge-style-type-verified, ytd-badge-supported-renderer [aria-label*="Verified"]'
    ));

    // 3. Description Snippet (Search Results)
    const snippetEl = rootCard.querySelector(
      '#description-text, .metadata-snippet-container, .metadata-snippet-text, yt-formatted-string.metadata-snippet-text, #snippet, yt-formatted-string[class*="snippet"], .yt-core-attributed-string'
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
      badgeText,
      cardText,
      hasAiInfoButton,
      isShort,
      thumbnailImg
    };
  }

  async function evaluateVideo(meta) {
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
          compiledKeywordRegexes,
          {
            blockSyntheticDisclosures: settings.blockSyntheticDisclosures !== false,
            whitelistVerified: settings.whitelistVerified !== false
          }
        );

        // If AI Shorts filter is toggled, enforce stricter sensitivity (0.40) on shorts, but NEVER blanket block clean human videos
        const baseThreshold = SENSITIVITY_THRESHOLDS[settings.sensitivity] || 0.50;
        const threshold = (meta.isShort && settings.blockShorts) ? Math.min(baseThreshold, 0.40) : baseThreshold;

        if (scoringResult && scoringResult.score >= threshold) {
          return {
            isBlocked: true,
            score: scoringResult.score,
            reason: (scoringResult.reasons && scoringResult.reasons.join(' + ')) || 'High AI Probability'
          };
        }
      }
    }

    // 3. Engine 2: Thumbnail Vision Texture Scanner (Disabled by default to protect human creators)
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

    if (settings.placeholderMode) {
      rootCard.classList.add('noslop-hidden');
      rootCard.style.setProperty('display', 'none', 'important');

      let placeholder = rootCard.parentNode?.querySelector('.noslop-placeholder');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'noslop-placeholder';
        placeholder.innerHTML = `
          <div class="noslop-placeholder-info">
            <span class="noslop-placeholder-badge">AI Hidden</span>
            <span class="noslop-placeholder-reason" title="${reason}">${(meta.title || 'AI Video').slice(0, 48)}...</span>
          </div>
          <button type="button" class="noslop-reveal-btn">Show</button>
        `;

        placeholder.querySelector('.noslop-reveal-btn').addEventListener('click', (e) => {
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
      const existingPlaceholder = rootCard.parentNode?.querySelector('.noslop-placeholder');
      if (existingPlaceholder) existingPlaceholder.remove();

      rootCard.classList.add('noslop-hidden');
      rootCard.style.setProperty('display', 'none', 'important');
      rootCard.style.setProperty('height', '0px', 'important');
      rootCard.style.setProperty('min-height', '0px', 'important');
      rootCard.style.setProperty('margin', '0px', 'important');
      rootCard.style.setProperty('padding', '0px', 'important');
      rootCard.style.setProperty('overflow', 'hidden', 'important');
    }

    blockedCountCurrentTab++;
    try {
      chrome.runtime.sendMessage({ action: 'videoBlocked', count: 1 });
    } catch {}
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
        queue.push({
          channelName: chName,
          channelHref: freshMeta.channelHref || meta.channelHref,
          videoTitle: freshMeta.fullUntruncatedTitle || freshMeta.title || meta.title,
          videoId: freshMeta.videoId || meta.videoId,
          timestamp: new Date().toISOString()
        });
        chrome.storage.local.set({ reportedSlopQueue: queue });
      });

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
            window.NoSlopCommunity.init(list, settings.remoteChannels, settings.remoteVideos);
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
  async function processCard(rootCard) {
    if (!rootCard || !rootCard.isConnected) return;
    if (rootCard.dataset.noslopStatus === 'revealed' || rootCard.classList.contains('noslop-revealed')) return;
    if (rootCard.dataset.noslopStatus === 'blocked') return;

    const meta = extractMetadata(rootCard);
    if (!meta.title || meta.title.length < 2) {
      // Element not yet fully hydrated by YouTube, retry in 100ms
      setTimeout(() => {
        if (rootCard.isConnected && rootCard.dataset.noslopStatus !== 'revealed') {
          processCard(rootCard);
        }
      }, 100);
      return;
    }

    const sig = `${meta.title}||${meta.channelName}||${(meta.snippet || '').slice(0, 30)}`;
    if (rootCard.dataset.noslopSig === sig && rootCard.dataset.noslopStatus === 'clean') return;
    rootCard.dataset.noslopSig = sig;

    const evalResult = await evaluateVideo(meta);

    if (evalResult.isBlocked) {
      applyBlock(rootCard, meta, evalResult.reason, evalResult.score);
    } else {
      rootCard.dataset.noslopStatus = 'clean';
      rootCard.classList.remove('noslop-hidden');
      rootCard.style.removeProperty('display');
      rootCard.style.removeProperty('height');
      rootCard.style.removeProperty('min-height');
      rootCard.style.removeProperty('margin');
      rootCard.style.removeProperty('padding');
      rootCard.style.removeProperty('overflow');

      if (meta.channelName) {
        injectQuickBlockAction(rootCard, meta);
      } else {
        // Channel name may hydrate slightly later; schedule re-check
        setTimeout(() => {
          if (rootCard.isConnected && rootCard.dataset.noslopStatus !== 'blocked' && rootCard.dataset.noslopStatus !== 'revealed') {
            processCard(rootCard);
          }
        }, 150);
      }
    }
  }

  function isElementInViewport(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom >= -100 && rect.top <= vh + 150 && rect.height > 0;
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

    const cardSelectors = [
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer',
      'ytd-reel-item-renderer',
      'ytd-reel-video-renderer',
      'ytm-shorts-lockup-view-model-v2',
      'yt-lockup-view-model'
    ];

    const elements = document.querySelectorAll(cardSelectors.join(', '));

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
      if (hasExternalNodes) break;
    }
    if (!hasExternalNodes) return;

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(scanFeed, 150);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  window.addEventListener('yt-navigate-finish', () => {
    lastUrl = window.location.href;
    resetAllCards();
    setTimeout(scanFeed, 200);
  });

  window.addEventListener('spfdone', scanFeed);
  window.addEventListener('popstate', () => {
    resetAllCards();
    setTimeout(scanFeed, 150);
  });

  loadSettings();
})();
