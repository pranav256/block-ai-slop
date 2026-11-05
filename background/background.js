/**
 * NoSlop - Background Service Worker (v5.0)
 * Handles storage initialization, badge counters, and optional model training-data sync.
 */

const GITHUB_TRAINING_DATA_URL = 'https://raw.githubusercontent.com/pranav256/block-ai-slop/main/community-blocklist.json';
const TRAINING_SYNC_ALARM = 'noslop-training-sync';
const MAX_REMOTE_CHANNELS = 500000;
const MAX_REMOTE_ENTRY_LENGTH = 300;
const VERSION_RE = /^\d+\.\d+\.\d+$/;

const DEFAULT_SETTINGS = {
  enabled: true,
  engineScoring: true,        // Engine 1
  sensitivity: "balanced",
  engineThumbnails: false,    // Engine 2: DISABLED by default (human creators use AI thumbnails)
  engineCommunity: true,      // Enables community examples for model training
  engineAudioScript: true,
  blockShorts: false,         // FALSE by default: only AI slop shorts are blocked, human shorts stay
  placeholderMode: false,     // Clean AdBlock style (default)
  blockedChannels: [],
  allowedChannels: [],
  stats: {
    totalBlocked: 0
  }
};

async function ensureLocalTrainingData() {
  try {
    const localData = await chrome.storage.local.get(['remoteChannels']);
    if (!localData.remoteChannels || localData.remoteChannels.length === 0) {
      const res = await fetch(chrome.runtime.getURL('community-blocklist.json'));
      if (res.ok) {
        const json = validateBlocklist(await res.json());
        if (json) {
          await chrome.storage.local.set({
            remoteChannels: json.channels,
            communityVersion: json.version,
            lastCommunitySync: json.updatedAt
          });
           console.log(`[NoSlop Background] Loaded ${json.channels.length} model training examples.`);
        }
      }
    }
  } catch (err) {
    console.warn('[NoSlop Background] Training data load error:', err.message);
  }
}

function validateBlocklist(data) {
  if (!data || !VERSION_RE.test(data.version || '') ||
      typeof data.updatedAt !== 'string' ||
      !Array.isArray(data.channels) || data.channels.length > MAX_REMOTE_CHANNELS) {
    return null;
  }

  const channels = Array.from(new Set(data.channels.filter(item =>
    typeof item === 'string' && item.trim() && item.length <= MAX_REMOTE_ENTRY_LENGTH
  ).map(item => item.trim())));
  const updatedAt = new Date(data.updatedAt);
  if (channels.length === 0 || !Number.isFinite(updatedAt.getTime()) ||
      (data.channelsCount !== undefined && data.channelsCount !== channels.length)) return null;
  return {
    channels,
    version: data.version,
    updatedAt: updatedAt.toISOString()
  };
}

function compareVersions(left, right) {
  const a = String(left || '0.0.0').split('.').map(Number);
  const b = String(right || '0.0.0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  const toSet = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      toSet[key] = value;
    }
  }

  toSet.engineThumbnails = false;
  await chrome.storage.sync.set(toSet);
  chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' });

  await ensureLocalTrainingData();
  await scheduleTrainingSync();
  syncTrainingData();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureLocalTrainingData();
  await scheduleTrainingSync();
});

async function scheduleTrainingSync() {
  await chrome.alarms.create(TRAINING_SYNC_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: 6 * 60
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TRAINING_SYNC_ALARM) {
    syncTrainingData();
  }
});

async function syncTrainingData() {
  try {
    const res = await fetch(GITHUB_TRAINING_DATA_URL, { cache: 'no-store' });
    if (!res.ok) {
      // If remote not accessible yet, ensure bundled local is loaded
      await ensureLocalTrainingData();
      return { success: false, status: res.status };
    }

    const data = validateBlocklist(await res.json());
    const stored = await chrome.storage.local.get(['communityVersion']);
    if (data && (!stored.communityVersion || compareVersions(data.version, stored.communityVersion) >= 0)) {
      await chrome.storage.local.set({
        remoteChannels: data.channels,
        communityVersion: data.version,
        lastCommunitySync: data.updatedAt
      });
       console.log(`[NoSlop Background] Synced ${data.channels.length} model training examples from GitHub.`);
      return { success: true, count: data.channels.length };
    }
    if (data) return { success: false, status: 'stale', version: data.version };
  } catch (err) {
    console.warn('[NoSlop Background] Training data sync failed, falling back to local:', err.message);
    await ensureLocalTrainingData();
    return { success: false, error: err.message };
  }
}

const tabCounts = new Map();

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabCounts.delete(tabId);
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabCounts.delete(tabId);
});

// Buffered stats accumulator to eliminate chrome.storage quota limits completely
let pendingBlockedCount = 0;
let statsFlushTimeout = null;

function flushStats() {
  if (pendingBlockedCount === 0) return;
  const toAdd = pendingBlockedCount;
  pendingBlockedCount = 0;

  chrome.storage.local.get(['stats'], (data) => {
    const stats = data.stats || { totalBlocked: 0 };
    stats.totalBlocked = (stats.totalBlocked || 0) + toAdd;
    chrome.storage.local.set({ stats });
  });
}

function setTabCount(tabId, count) {
  const normalizedCount = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0;
  tabCounts.set(tabId, normalizedCount);
  chrome.action.setBadgeText({
    tabId,
    text: normalizedCount > 0 ? String(normalizedCount) : ''
  });
  return normalizedCount;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'videoBlocked' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const increment = Number.isFinite(message.count) ? Math.max(1, Math.floor(message.count)) : 1;
    const current = setTabCount(tabId, (tabCounts.get(tabId) || 0) + increment);

    pendingBlockedCount += increment;
    if (!statsFlushTimeout) {
      statsFlushTimeout = setTimeout(() => {
        statsFlushTimeout = null;
        flushStats();
      }, 2500);
    }

    sendResponse({ currentTabCount: current });
    return true;
  }

  if (message.action === 'tabCountSync' && sender.tab?.id) {
    sendResponse({ currentTabCount: setTabCount(sender.tab.id, message.count) });
    return true;
  }

  if (message.action === 'getTabCount') {
    const tabId = message.tabId;
    chrome.tabs.sendMessage(tabId, { action: 'getTabCount' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        sendResponse({ count: tabCounts.get(tabId) || 0 });
        return;
      }
      sendResponse({ count: setTabCount(tabId, response.count) });
    });
    return true;
  }

  if (message.action === 'syncTrainingData') {
    syncTrainingData().then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === 'openReport') {
    const channelName = String(message.channelName || '').slice(0, 160);
    const channelHref = String(message.channelHref || '').slice(0, 500);
    const videoTitle = String(message.videoTitle || '').slice(0, 240);
    const videoId = String(message.videoId || '').slice(0, 32);
    const videoUrl = videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : '';
    const title = encodeURIComponent(`[Slop Report]: ${channelName || videoTitle}`);
    const body = encodeURIComponent([
      `Channel: ${channelName}`,
      `Channel URL / Handle: ${channelHref}`,
      `Video title: ${videoTitle}`,
      `Video URL: ${videoUrl}`
    ].join('\n'));
    chrome.tabs.create({
      url: `https://github.com/pranav256/block-ai-slop/issues/new?template=report-slop.yml&title=${title}&body=${body}`
    });
    sendResponse({ success: true });
    return true;
  }
});
