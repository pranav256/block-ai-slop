/**
 * NoSlop - Popup Script (v5.0)
 * Protects legitimate human creators talking about AI while eliminating true AI slop mills.
 */

document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('masterToggle');
  const statusBadge = document.getElementById('statusBadge');
  const tabCountEl = document.getElementById('tabCount');
  const totalCountEl = document.getElementById('totalCount');

  // Engine Toggles
  const toggleEngineScoring = document.getElementById('toggleEngineScoring');
  const toggleEngineCommunity = document.getElementById('toggleEngineCommunity');
  const toggleEngineAudioScript = document.getElementById('toggleEngineAudioScript');
  const toggleEngineThumbnails = document.getElementById('toggleEngineThumbnails');
  const segmentBtns = document.querySelectorAll('.segment-btn');

  // Training Data Sync Elements
  const communityCountBadge = document.getElementById('communityCountBadge');
  const syncNowBtn = document.getElementById('syncNowBtn');
  const syncStatus = document.getElementById('syncStatus');
  const lastSyncTime = document.getElementById('lastSyncTime');

  // Creator Safety & Preferences
  const toggleShorts = document.getElementById('toggleShorts');
  const togglePlaceholder = document.getElementById('togglePlaceholder');

  // Lists
  const channelList = document.getElementById('channelList');
  const newChannelInput = document.getElementById('newChannelInput');
  const addChannelBtn = document.getElementById('addChannelBtn');
  const allowedChannelList = document.getElementById('allowedChannelList');
  const newAllowedChannelInput = document.getElementById('newAllowedChannelInput');
  const addAllowedChannelBtn = document.getElementById('addAllowedChannelBtn');

  const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  let currentSettings = {};

  function init() {
    chrome.storage.sync.get(null, (data) => {
      currentSettings = data || {};

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
      toggleEngineCommunity.checked = currentSettings.engineCommunity !== false;
      toggleEngineAudioScript.checked = currentSettings.engineAudioScript !== false;
      toggleEngineThumbnails.checked = Boolean(currentSettings.engineThumbnails); // False by default!

      // Creator Safety & Preferences
      toggleShorts.checked = Boolean(currentSettings.blockShorts);
      togglePlaceholder.checked = Boolean(currentSettings.placeholderMode);

      // Stats (stored efficiently in chrome.storage.local)
      chrome.storage.local.get(['stats'], (localData) => {
        const total = localData?.stats?.totalBlocked || currentSettings.stats?.totalBlocked || 0;
        totalCountEl.textContent = total.toLocaleString();
      });

      // Training data stats from local storage
      chrome.storage.local.get(['remoteChannels', 'lastCommunitySync'], (localData) => {
        const remoteCount = Array.isArray(localData?.remoteChannels) ? localData.remoteChannels.length : 0;
        communityCountBadge.textContent = `${remoteCount.toLocaleString()} Examples`;

        if (localData?.lastCommunitySync) {
          const syncDate = new Date(localData.lastCommunitySync);
          lastSyncTime.textContent = `Synced: ${syncDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
      });

      renderChannels(currentSettings.blockedChannels || []);
      renderAllowedChannels(currentSettings.allowedChannels || []);
    });

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

  masterToggle.addEventListener('change', () => {
    const isEnabled = masterToggle.checked;
    updateStatusDisplay(isEnabled);
    chrome.storage.sync.set({ enabled: isEnabled });
  });

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

  toggleEngineCommunity.addEventListener('change', () => {
    chrome.storage.sync.set({ engineCommunity: toggleEngineCommunity.checked });
  });

  toggleEngineAudioScript.addEventListener('change', () => {
    chrome.storage.sync.set({ engineAudioScript: toggleEngineAudioScript.checked });
  });

  toggleEngineThumbnails.addEventListener('change', () => {
    chrome.storage.sync.set({ engineThumbnails: toggleEngineThumbnails.checked });
  });

  toggleShorts.addEventListener('change', () => {
    chrome.storage.sync.set({ blockShorts: toggleShorts.checked });
  });

  togglePlaceholder.addEventListener('change', () => {
    chrome.storage.sync.set({ placeholderMode: togglePlaceholder.checked });
  });

  syncNowBtn.addEventListener('click', () => {
    syncStatus.textContent = 'Syncing from GitHub...';
    chrome.runtime.sendMessage({ action: 'syncTrainingData' }, (response) => {
      if (response && response.success) {
        syncStatus.textContent = 'Connected & Synced';
        lastSyncTime.textContent = 'Just now';
        communityCountBadge.textContent = `${(response.count || 0).toLocaleString()} Examples`;
      } else {
        syncStatus.textContent = 'Ready (Default list active)';
      }
    });
  });

  const exportReportsBtn = document.getElementById('exportReportsBtn');
  if (exportReportsBtn) {
    exportReportsBtn.addEventListener('click', () => {
      chrome.storage.local.get(['reportedSlopQueue'], (data) => {
        const queue = Array.isArray(data.reportedSlopQueue) ? data.reportedSlopQueue : [];
        if (queue.length === 0) {
          alert('No queued reports yet. When you click "Report Slop" on any YouTube card, they will be saved here.');
          return;
        }
        const jsonStr = JSON.stringify(queue, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `noslop-reports-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }

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

  function renderAllowedChannels(channels) {
    allowedChannelList.innerHTML = '';
    if (!channels || channels.length === 0) {
      allowedChannelList.innerHTML = '<span class="empty-state">No allowlisted channels.</span>';
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
      delBtn.title = `Remove allowlist entry "${channel}"`;
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('click', () => {
        const next = channels.filter((_, itemIndex) => itemIndex !== index);
        chrome.storage.sync.set({ allowedChannels: next }, () => renderAllowedChannels(next));
      });

      item.append(label, delBtn);
      allowedChannelList.appendChild(item);
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

  function addAllowedChannel() {
    const val = newAllowedChannelInput.value.trim();
    if (!val) return;

    chrome.storage.sync.get('allowedChannels', (data) => {
      const list = Array.isArray(data.allowedChannels) ? data.allowedChannels : [];
      if (!list.some(item => item.toLowerCase() === val.toLowerCase())) {
        list.push(val);
        chrome.storage.sync.set({ allowedChannels: list }, () => {
          renderAllowedChannels(list);
          newAllowedChannelInput.value = '';
        });
      }
    });
  }

  addChannelBtn.addEventListener('click', addChannel);
  newChannelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addChannel();
  });
  addAllowedChannelBtn.addEventListener('click', addAllowedChannel);
  newAllowedChannelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addAllowedChannel();
  });

  resetDefaultsBtn.addEventListener('click', () => {
    if (confirm('Reset all detection engines and rules to defaults?')) {
      chrome.storage.sync.set({
        enabled: true,
        engineScoring: true,
        sensitivity: 'balanced',
        engineThumbnails: false,
        engineCommunity: true,
        engineAudioScript: true,
        blockShorts: false,
        placeholderMode: false,
        blockedChannels: [],
        allowedChannels: []
      }, () => {
        init();
      });
    }
  });

  init();
});
