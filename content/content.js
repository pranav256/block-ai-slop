/**
 * NoSlop - Content Script (Orchestrator v2.5)
 * Protects legitimate human creators talking about AI while eliminating true AI slop mills.
 */

(() => {
  'use strict';

  console.log('%c[NoSlop 2.5]%c Active with Verified Creator Protection.', 'color: #f43f5e; font-weight: bold', 'color: #94a3b8');

  const SENSITIVITY_THRESHOLDS = {
    aggressive: 0.35,
    balanced: 0.50,
    conservative: 0.65
  };

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
    blockShorts: true,
    placeholderMode: false,     // Clean AdBlock style (default)
    customKeywords: [],
    blockedChannels: [],
    remoteChannels: [],
    remoteVideos: []
  };

  let compiledKeywordRegexes = [];
  let blockedCountCurrentTab = 0;
  let isScanning = false;
  let pendingScan = false;
  let lastUrl = window.location.href;

  function buildKeywordRegex(kw) {
    const clean = kw.trim();
    if (!clean) return null;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escaped.startsWith('#')) {
      return new RegExp('(?:^|[^a-zA-Z0-9])' + escaped + '\\b', 'iu');
    }
    return new RegExp('\\b' + escaped + '\\b', 'iu');
  }

  function updateCompiledKeywords() {
    compiledKeywordRegexes = (settings.customKeywords || []).map(buildKeywordRegex).filter(Boolean);
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
        checkWatchPage();
      });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      for (const [key, change] of Object.entries(changes)) {
        settings[key] = change.newValue;
      }
      updateCompiledKeywords();
      if (window.NoSlopCommunity) {
        window.NoSlopCommunity.init(settings.blockedChannels, settings.remoteChannels, settings.remoteVideos);
      }
      resetAllCards();
      scanFeed();
      checkWatchPage();
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
      resetAllCards();
      scanFeed();
      checkWatchPage();
    }
  });

  function resetAllCards() {
    document.querySelectorAll('[data-noslop-sig]').forEach((el) => {
      el.removeAttribute('data-noslop-sig');
      el.removeAttribute('data-noslop-status');
      el.classList.remove('noslop-hidden');
      el.style.removeProperty('display');
      el.style.removeProperty('height');
      el.style.removeProperty('min-height');
      el.style.removeProperty('margin');
      el.style.removeProperty('padding');
      el.style.removeProperty('overflow');
      const placeholder = el.parentNode?.querySelector('.noslop-placeholder');
      if (placeholder) placeholder.remove();
    });
  }

  function findRootCard(el) {
    const outer = el.closest(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer, ytd-playlist-video-renderer, ytd-notification-renderer'
    );
    if (outer) return outer;
    return el.closest('yt-lockup-view-model, ytm-shorts-lockup-view-model-v2') || el;
  }

  function extractMetadata(rootCard) {
    const titleCandidates = [];
    let fullUntruncatedTitle = '';

    const titleEl = rootCard.querySelector(
      '#video-title, #video-title-link, a.yt-lockup-metadata-view-model-wiz__title, h3 a, h3, .yt-core-attributed-string'
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
      'ytd-channel-name, #channel-name, #text.ytd-channel-name, a.yt-simple-endpoint[href*="/@"], a.yt-simple-endpoint[href*="/channel/"], .yt-lockup-metadata-view-model-wiz__metadata a, #byline-container a, #channel-info'
    );
    const channelName = (channelEl?.textContent || '').replace(/\s+/g, ' ').trim();
    const channelHref = channelEl?.getAttribute('href') || '';

    // Check if channel has YouTube's verified badge
    const isVerified = Boolean(rootCard.querySelector(
      '[aria-label="Verified"], [aria-label*="Verified" i], .badge-style-type-verified, ytd-badge-supported-renderer [aria-label*="Verified"]'
    ));

    // 3. Description Snippet (Search Results)
    const snippetEl = rootCard.querySelector(
      '#description-text, .metadata-snippet-container, .metadata-snippet-text, yt-formatted-string.metadata-snippet-text, #snippet, yt-formatted-string[class*="snippet"]'
    );
    const snippet = (snippetEl?.textContent || '').replace(/\s+/g, ' ').trim();

    // 4. Badges & Full Card Text
    const badgeText = Array.from(rootCard.querySelectorAll(
      'ytd-badge-supported-renderer, yt-badge-view-model, .badge-shape'
    )).map(b => b.textContent).join(' ');

    const cardText = (rootCard.textContent || '').replace(/\s+/g, ' ').trim();

    const ariaLabels = [
      rootCard.getAttribute('aria-label') || '',
      titleEl?.getAttribute('aria-label') || '',
      watchLink?.getAttribute('aria-label') || ''
    ].join(' ');

    // 5. Explicit YouTube AI Info Button Check on the card
    const aiInfoBtn = rootCard.querySelector(
      'button[aria-label*="How this content was made" i], button[aria-label*="Altered or synthetic" i], button[aria-label*="Made with AI" i], [target-id*="disclosure" i], [aria-label*="Altered content" i]'
    );
    const hasAiInfoButton = Boolean(aiInfoBtn);

    // 6. Inspect Polymer raw API data attached to custom element
    let rawDataHasAiFlag = false;
    try {
      const raw = rootCard.__data?.data || rootCard.data;
      if (raw) {
        const rawStr = JSON.stringify(raw);
        if (/("altered"|"synthetic"|"howThisContentWasMade"|"isAlteredContent":true)/i.test(rawStr)) {
          rawDataHasAiFlag = true;
        }
      }
    } catch {}

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
      ariaLabels,
      hasAiInfoButton: hasAiInfoButton || rawDataHasAiFlag,
      isShort,
      thumbnailImg
    };
  }

  /**
   * Evaluates a video across active detection engines
   */
  async function evaluateVideo(meta) {
    // Priority 1: Explicit YouTube AI Info Button or Disclosure (Instant Block)
    if (meta.hasAiInfoButton) {
      return { isBlocked: true, score: 1.0, reason: 'YouTube Official AI Info Button' };
    }

    // Priority 2: Video ID matches GitHub remote sync
    if (meta.videoId && window.NoSlopCommunity && window.NoSlopCommunity.isVideoBlocked(meta.videoId)) {
      return { isBlocked: true, score: 1.0, reason: 'GitHub Community Blocked Video' };
    }

    // Engine 3: Community & Curated Blocklist Consensus (O(1) Instant Check)
    if (settings.engineCommunity !== false && window.NoSlopCommunity) {
      const commCheck = window.NoSlopCommunity.isChannelBlocked(meta.channelName, meta.channelHref);
      if (commCheck.blocked) {
        return { isBlocked: true, score: 1.0, reason: commCheck.source };
      }
    }

    // Engine 1: Multi-Signal Weighted Heuristic Scoring Engine (Primary / Default)
    const threshold = SENSITIVITY_THRESHOLDS[settings.sensitivity] || 0.50;
    let scoreResult = { score: 0, isBlocked: false, reasons: [] };

    if (settings.engineScoring !== false && window.NoSlopScoring) {
      scoreResult = window.NoSlopScoring.calculate(meta, compiledKeywordRegexes, {
        blockSyntheticDisclosures: settings.blockSyntheticDisclosures,
        whitelistVerified: settings.whitelistVerified !== false,
        sensitivityThreshold: threshold
      });

      if (scoreResult.isBlocked) {
        return { isBlocked: true, score: scoreResult.score, reason: scoreResult.reasons.join(' + ') };
      }
    }

    // Engine 2: Thumbnail Visual & Texture Analysis (ONLY IF EXPLICITLY ENABLED)
    // Disabled by default because human creators (Neil deGrasse Tyson, Steven Bartlett) use AI thumbnails!
    if (settings.engineThumbnails && window.NoSlopThumbnail && meta.thumbnailImg && !meta.isVerified) {
      if (scoreResult.score >= 0.25) {
        const thumbResult = await window.NoSlopThumbnail.analyze(meta.thumbnailImg);
        if (thumbResult.score > 0) {
          const combinedScore = Number((scoreResult.score + thumbResult.score).toFixed(3));
          if (combinedScore >= threshold) {
            return {
              isBlocked: true,
              score: combinedScore,
              reason: `${thumbResult.reason} (Score: ${combinedScore})`
            };
          }
        }
      }
    }

    // Shorts filter
    if (settings.blockShorts && meta.isShort) {
      const shortsAiRegex = /(#ai(story|drama|animation|art|film)|ai animation|sora ai|kling ai)/i;
      if (shortsAiRegex.test(meta.title) || shortsAiRegex.test(meta.cardText)) {
        return { isBlocked: true, score: 0.90, reason: 'AI Short' };
      }
    }

    return { isBlocked: false, score: scoreResult.score, reason: null };
  }

  function applyBlock(rootCard, meta, reason, score = 1.0) {
    rootCard.dataset.noslopStatus = 'blocked';

    console.log(
      `%c[NoSlop BLOCKED]%c "${(meta.fullUntruncatedTitle || meta.title).slice(0, 48)}" %c[${reason}] (Score: ${score})`,
      'color: #f43f5e; font-weight: bold',
      'color: #f8fafc',
      'color: #94a3b8'
    );

    if (settings.placeholderMode) {
      rootCard.style.setProperty('display', 'none', 'important');

      let placeholder = rootCard.previousElementSibling;
      if (!placeholder || !placeholder.classList.contains('noslop-placeholder')) {
        placeholder = document.createElement('div');
        placeholder.className = 'noslop-placeholder';
        placeholder.innerHTML = `
          <div class="noslop-placeholder-info">
            <span class="noslop-placeholder-badge">AI Hidden</span>
            <span class="noslop-placeholder-reason" title="${meta.title}">${(meta.fullUntruncatedTitle || meta.title).slice(0, 60) || reason}</span>
          </div>
          <button type="button" class="noslop-reveal-btn">Show</button>
        `;

        placeholder.querySelector('.noslop-reveal-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          rootCard.style.removeProperty('display');
          rootCard.style.removeProperty('height');
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

  function injectQuickBlockAction(rootCard, meta) {
    if (!meta.channelName || rootCard.querySelector('.noslop-action-bar')) return;

    rootCard.classList.add('noslop-card-relative');
    const bar = document.createElement('div');
    bar.className = 'noslop-action-bar';

    // 1. Local Block Button
    const blockBtn = document.createElement('button');
    blockBtn.className = 'noslop-action-btn';
    blockBtn.type = 'button';
    blockBtn.title = `Block all videos from ${meta.channelName} locally`;
    blockBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      </svg>
      <span>Block Channel</span>
    `;

    blockBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addChannelToBlocklist(meta.channelName);
      showToast(`Blocked channel "${meta.channelName}" locally`);
    });

    // 2. Report to GitHub Community Blocklist Button
    const reportBtn = document.createElement('button');
    reportBtn.className = 'noslop-action-btn report-btn';
    reportBtn.type = 'button';
    reportBtn.title = `Block locally and submit to GitHub community blocklist`;
    reportBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
        <line x1="4" y1="22" x2="4" y2="15"></line>
      </svg>
      <span>Report Slop</span>
    `;

    reportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      addChannelToBlocklist(meta.channelName);
      showToast(`Blocked locally! Opening GitHub submission...`);

      const watchUrl = meta.videoId ? `https://www.youtube.com/watch?v=${meta.videoId}` : window.location.href;
      const ghUrl = `https://github.com/pranav256/block-ai-slop/issues/new?template=report-slop.yml&title=${encodeURIComponent(`[Slop Report]: ${meta.channelName} - ${(meta.fullUntruncatedTitle || meta.title).slice(0, 45)}`)}&channel_name=${encodeURIComponent(meta.channelName)}&channel_url=${encodeURIComponent(meta.channelHref ? `https://www.youtube.com${meta.channelHref}` : '')}&video_title=${encodeURIComponent(meta.fullUntruncatedTitle || meta.title)}&video_url=${encodeURIComponent(watchUrl)}`;

      window.open(ghUrl, '_blank');
    });

    bar.appendChild(blockBtn);
    bar.appendChild(reportBtn);

    const thumbnailContainer = rootCard.querySelector('#thumbnail, ytd-thumbnail, .yt-lockup-view-model__thumbnail') || rootCard;
    thumbnailContainer.appendChild(bar);
  }

  function addChannelToBlocklist(channelName) {
    chrome.storage.sync.get('blockedChannels', (data) => {
      const list = data.blockedChannels || [];
      if (!list.includes(channelName)) {
        list.push(channelName);
        chrome.storage.sync.set({ blockedChannels: list }, () => {
          console.log(`[NoSlop] Added channel to local blocklist: ${channelName}`);
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
    }, 3000);
  }

  /**
   * Main scan loop
   */
  async function scanFeed() {
    if (!settings.enabled) return;

    if (isScanning) {
      pendingScan = true;
      return;
    }

    isScanning = true;

    const cardSelectors = [
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer',
      'ytd-reel-item-renderer',
      'ytm-shorts-lockup-view-model-v2',
      'yt-lockup-view-model'
    ];

    const elements = document.querySelectorAll(cardSelectors.join(', '));

    for (let i = 0; i < elements.length; i++) {
      const rootCard = findRootCard(elements[i]);
      const meta = extractMetadata(rootCard);

      if (!meta.title || meta.title.length < 2) {
        continue;
      }

      const sig = `${meta.title}||${meta.channelName}`;
      if (rootCard.dataset.noslopSig === sig) {
        continue;
      }

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
        injectQuickBlockAction(rootCard, meta);
        console.log(
          `%c[NoSlop ALLOWED]%c "${(meta.fullUntruncatedTitle || meta.title).slice(0, 42)}" %c(Score: ${evalResult.score}) [${meta.channelName}${meta.isVerified ? ' ✔' : ''}]`,
          'color: #10b981; font-weight: bold',
          'color: #94a3b8',
          'color: #64748b'
        );
      }
    }

    isScanning = false;
    if (pendingScan) {
      pendingScan = false;
      setTimeout(scanFeed, 80);
    }
  }

  /**
   * Watch page protection
   */
  function checkWatchPage() {
    if (!settings.enabled || !window.location.pathname.startsWith('/watch')) return;

    setTimeout(() => {
      const isVerified = Boolean(document.querySelector(
        'ytd-channel-name [aria-label="Verified"], ytd-channel-name [aria-label*="Verified" i], .badge-style-type-verified'
      ));

      // 1. Direct check for YouTube's AI Info Button on Watch Page (Always checked)
      const aiButton = document.querySelector(
        'button[aria-label*="How this content was made" i], button[aria-label*="Altered or synthetic" i], button[aria-label*="Made with AI" i], [target-id*="disclosure" i], ytd-video-description-infocards-section-renderer'
      );
      if (aiButton) {
        triggerWatchBlock('YouTube AI Info Button ("How this content was made")');
        return;
      }

      const descEl = document.querySelector('#description-inner, #structured-description, ytd-structured-description-content-renderer');
      const desc = descEl?.textContent || '';
      const channelEl = document.querySelector('ytd-channel-name, #channel-name');
      const channelName = (channelEl?.textContent || '').trim();

      if (window.NoSlopScoring && window.NoSlopScoring.isDisclosureText(desc)) {
        triggerWatchBlock('YouTube Altered/Synthetic Content Disclosure in Description');
        return;
      }

      if (settings.engineCommunity !== false && window.NoSlopCommunity) {
        const commCheck = window.NoSlopCommunity.isChannelBlocked(channelName);
        if (commCheck.blocked) {
          triggerWatchBlock(commCheck.source);
          return;
        }
      }

      // Verified channels are safe from audio/script heuristics unless user blocked them
      if (isVerified && settings.whitelistVerified !== false) {
        return;
      }

      if (settings.engineAudioScript !== false && window.NoSlopAudioScript) {
        const scriptCheck = window.NoSlopAudioScript.analyzeScript(desc);
        if (scriptCheck.score >= 0.45) {
          triggerWatchBlock(scriptCheck.reason);
          return;
        }

        const video = document.querySelector('video.html5-main-video');
        if (video) {
          window.NoSlopAudioScript.monitorAudio(video, (ttsResult) => {
            triggerWatchBlock(ttsResult.reason);
          });
        }
      }
    }, 500);
  }

  function triggerWatchBlock(reason) {
    const video = document.querySelector('video.html5-main-video');
    if (video && !video.paused) {
      video.pause();
    }

    if (!document.getElementById('noslop-watch-alert')) {
      const banner = document.createElement('div');
      banner.id = 'noslop-watch-alert';
      banner.className = 'noslop-watch-banner';
      banner.innerHTML = `
        <div class="noslop-watch-banner-left">
          <svg class="noslop-watch-banner-icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          <span><strong>NoSlop:</strong> Video paused — Identified as synthetic / AI slop (${reason}).</span>
        </div>
        <button type="button" class="noslop-watch-banner-btn" id="noslop-play-anyway">Play anyway</button>
      `;

      banner.querySelector('#noslop-play-anyway').addEventListener('click', () => {
        banner.remove();
        if (video) video.play();
      });

      const player = document.getElementById('player') || document.querySelector('ytd-watch-metadata');
      player?.parentNode?.insertBefore(banner, player);
    }
  }

  // Observers
  let debounceTimeout = null;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      resetAllCards();
      checkWatchPage();
    }

    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(scanFeed, 80);
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
    setTimeout(() => {
      scanFeed();
      checkWatchPage();
    }, 200);
  });

  window.addEventListener('spfdone', scanFeed);
  window.addEventListener('popstate', () => {
    resetAllCards();
    setTimeout(scanFeed, 150);
  });

  loadSettings();
})();
