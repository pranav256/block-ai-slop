/**
 * NoSlop - Popup Script (v2.4)
 * Manages all 4 detection engines, sensitivity thresholds, rules, blocklists, and GitHub community sync.
 */

document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('masterToggle');
  const statusBadge = document.getElementById('statusBadge');
  const tabCountEl = document.getElementById('tabCount');
  const totalCountEl = document.getElementById('totalCount');

  // Engine Toggles
  const toggleEngineScoring = document.getElementById('toggleEngineScoring');
  const toggleEngineThumbnails = document.getElementById('toggleEngineThumbnails');
  const toggleEngineCommunity = document.getElementById('toggleEngineCommunity');
  const toggleEngineAudioScript = document.getElementById('toggleEngineAudioScript');
  const segmentBtns = document.querySelectorAll('.segment-btn');

  // Community Sync Elements
  const communityCountBadge = document.getElementById('communityCountBadge');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const syncStatus = document.getElementById('syncStatus');
  const lastSyncTime = document.getElementById('lastSyncTime');

  // General Preferences
  const toggleSynthetic = document.getElementById('toggleSynthetic');
  const toggleShorts = document.getElementById('toggleShorts');
  const togglePlaceholder = document.getElementById('togglePlaceholder');

  // Lists
  const keywordCloud = document.getElementById('keywordCloud');
  const newKeywordInput = document.getElementById('newKeywordInput');
  const addKeywordBtn = document.getElementById('addKeywordBtn');

  const channelList = document.getElementById('channelList');
  const newChannelInput = document.getElementById('newChannelInput');
  const addChannelBtn = document.getElementById('addChannelBtn');

  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  let currentSettings = {};

  const DEFAULT_KEYWORDS = [
    "ai",
    "genai",
    "generative ai",
    "sora",
    "midjourney",
    "kling",
    "runway",
    "runwayml",
    "elevenlabs",
    "luma",
    "dream machine",
    "pika",
    "flux.1",
    "flux ai",
    "haiper",
    "stable diffusion",
    "stablediffusion",
    "deepfake",
    "dall-e",
    "dalle",
    "synthesia",
    "heygen",
    "minimax",
    "hailuo",
    "udio",
    "suno",
    "ai generated",
    "ai video",
    "ai animation",
    "ai animated",
    "ai film",
    "ai movie",
    "ai story",
    "ai voice",
    "ai cover",
    "ai song",
    "ai slop",
    "made with ai",
    "created with ai"
  ];

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Load initial settings
  function init() {
    chrome.storage.sync.get(null, (data) => {
      currentSettings = data || {};

      // Master switch
      const isEnabled = currentSettings.enabled !== false;
      masterToggle.checked = isEnabled;
      updateStatusDisplay(isEnabled);

      // Engine 1
      toggleEngineScoring.checked = currentSettings.engineScoring !== false;
      const sensitivity = currentSettings.sensitivity || 'balanced';
      segmentBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === sensitivity);
      });

      // Engines 2, 3, 4
      toggleEngineThumbnails.checked = currentSettings.engineThumbnails !== false;
      toggleEngineCommunity.checked = currentSettings.engineCommunity !== false;
      toggleEngineAudioScript.checked = currentSettings.engineAudioScript !== false;

      // Preferences
      toggleSynthetic.checked = currentSettings.blockSyntheticDisclosures !== false;
      toggleShorts.checked = currentSettings.blockShorts !== false;
      togglePlaceholder.checked = Boolean(currentSettings.placeholderMode);

      // Stats
      const total = currentSettings.stats?.totalBlocked || 0;
      totalCountEl.textContent = total.toLocaleString();

      // Community Blocklist Stats
      const remoteCount = Array.isArray(currentSettings.remoteChannels) ? currentSettings.remoteChannels.length : 36;
      communityCountBadge.textContent = `${remoteCount} Channels`;

      if (currentSettings.lastCommunitySync) {
        const syncDate = new Date(currentSettings.lastCommunitySync);
        lastSyncTime.textContent = `Synced: ${syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      // Keywords & Channels
      let kws = currentSettings.customKeywords;
      if (!Array.isArray(kws) || kws.length === 0 || !kws.includes('ai')) {
        kws = DEFAULT_KEYWORDS;
        chrome.storage.sync.set({ customKeywords: DEFAULT_KEYWORDS });
      }

      renderKeywords(kws);
      renderChannels(currentSettings.blockedChannels || []);
    });

    // Request active tab count
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs?.[0]?.id) {
        chrome.runtime.sendMessage(
          { action: 'getTabCount', tabId: tabs[0].id },
          (response) => {
            if (response && response.count !== undefined) {
              tabCountEl.textContent = response.count.toLocaleString();
            }
          }
        );
      }
    });
  }

  function updateStatusDisplay(isEnabled) {
    if (isEnabled) {
      statusBadge.textContent = 'Active';
      statusBadge.classList.remove('paused');
    } else {
      statusBadge.textContent = 'Paused';
      statusBadge.classList.add('paused');
    }
  }

  // Master switch
  masterToggle.addEventListener('change', () => {
    const isEnabled = masterToggle.checked;
    updateStatusDisplay(isEnabled);
    chrome.storage.sync.set({ enabled: isEnabled });
  });

  // Engine 1 & Sensitivity
  toggleEngineScoring.addEventListener('change', () => {
    chrome.storage.sync.set({ engineScoring: toggleEngineScoring.checked });
  });

  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chrome.storage.sync.set({ sensitivity: btn.dataset.val });
    });
  });

  // Engines 2, 3, 4
  toggleEngineThumbnails.addEventListener('change', () => {
    chrome.storage.sync.set({ engineThumbnails: toggleEngineThumbnails.checked });
  });

  toggleEngineCommunity.addEventListener('change', () => {
    chrome.storage.sync.set({ engineCommunity: toggleEngineCommunity.checked });
  });

  toggleEngineAudioScript.addEventListener('change', () => {
    chrome.storage.sync.set({ engineAudioScript: toggleEngineAudioScript.checked });
  });

  // Community Sync Button
  syncNowBtn.addEventListener('click', () => {
    syncStatus.textContent = 'Syncing from GitHub...';
    chrome.runtime.sendMessage({ action: 'syncCommunity' }, (response) => {
      if (response && response.success) {
        syncStatus.textContent = 'Connected & Synced';
        lastSyncTime.textContent = 'Just now';
        communityCountBadge.textContent = `${response.count} Channels`;
      } else {
        syncStatus.textContent = 'Ready (Default list active)';
      }
    });
  });

  // Preferences
  toggleSynthetic.addEventListener('change', () => {
    chrome.storage.sync.set({ blockSyntheticDisclosures: toggleSynthetic.checked });
  });

  toggleShorts.addEventListener('change', () => {
    chrome.storage.sync.set({ blockShorts: toggleShorts.checked });
  });

  togglePlaceholder.addEventListener('change', () => {
    chrome.storage.sync.set({ placeholderMode: togglePlaceholder.checked });
  });

  // Keywords management
  function renderKeywords(keywords) {
    keywordCloud.innerHTML = '';
    if (!keywords || keywords.length === 0) {
      keywordCloud.innerHTML = '<span class="empty-state">No keyword filters</span>';
      return;
    }

    keywords.forEach((kw, index) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = kw;

      const delBtn = document.createElement('button');
      delBtn.className = 'tag-delete-btn';
      delBtn.type = 'button';
      delBtn.title = `Remove "${kw}"`;
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('click', () => {
        keywords.splice(index, 1);
        chrome.storage.sync.set({ customKeywords: keywords }, () => {
          renderKeywords(keywords);
        });
      });

      chip.appendChild(delBtn);
      keywordCloud.appendChild(chip);
    });
  }

  function addKeyword() {
    const val = newKeywordInput.value.trim().toLowerCase();
    if (!val) return;

    chrome.storage.sync.get('customKeywords', (data) => {
      const list = data.customKeywords || [...DEFAULT_KEYWORDS];
      if (!list.includes(val)) {
        list.push(val);
        chrome.storage.sync.set({ customKeywords: list }, () => {
          renderKeywords(list);
          newKeywordInput.value = '';
        });
      }
    });
  }

  addKeywordBtn.addEventListener('click', addKeyword);
  newKeywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addKeyword();
  });

  // Blocked channels management
  function renderChannels(channels) {
    channelList.innerHTML = '';
    if (!channels || channels.length === 0) {
      channelList.innerHTML = '<span class="empty-state">No custom blocked channels. Curated list is active.</span>';
      return;
    }

    channels.forEach((channel, index) => {
      const item = document.createElement('div');
      item.className = 'channel-item';

      const label = document.createElement('span');
      label.textContent = channel;

      const delBtn = document.createElement('button');
      delBtn.className = 'channel-delete-btn';
      delBtn.type = 'button';
      delBtn.title = `Unblock "${channel}"`;
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;

      delBtn.addEventListener('click', () => {
        channels.splice(index, 1);
        chrome.storage.sync.set({ blockedChannels: channels }, () => {
          renderChannels(channels);
        });
      });

      item.appendChild(label);
      item.appendChild(delBtn);
      channelList.appendChild(item);
    });
  }

  function addChannel() {
    const val = newChannelInput.value.trim();
    if (!val) return;

    chrome.storage.sync.get('blockedChannels', (data) => {
      const list = data.blockedChannels || [];
      if (!list.includes(val)) {
        list.push(val);
        chrome.storage.sync.set({ blockedChannels: list }, () => {
          renderChannels(list);
          newChannelInput.value = '';
        });
      }
    });
  }

  addChannelBtn.addEventListener('click', addChannel);
  newChannelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addChannel();
  });

  // Reset to defaults
  resetDefaultsBtn.addEventListener('click', () => {
    if (confirm('Reset all detection engines and rules to defaults?')) {
      chrome.storage.sync.set({
        enabled: true,
        engineScoring: true,
        sensitivity: 'balanced',
        engineThumbnails: true,
        engineCommunity: true,
        engineAudioScript: true,
        blockSyntheticDisclosures: true,
        blockShorts: true,
        placeholderMode: false,
        customKeywords: [...DEFAULT_KEYWORDS]
      }, () => {
        init();
      });
    }
  });

  init();
});
