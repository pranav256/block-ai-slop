/**
 * NoSlop - Background Service Worker (v2.6)
 * Handles storage initialization, badge counters, and centralized GitHub community blocklist sync.
 * Large community databases (46k+ channels) are stored in chrome.storage.local.
 */

const GITHUB_REMOTE_BLOCKLIST_URL = 'https://raw.githubusercontent.com/pranav256/block-ai-slop/main/community-blocklist.json';
const COMMUNITY_SYNC_ALARM = 'noslop-community-sync';
const MAX_REMOTE_CHANNELS = 500000;
const MAX_REMOTE_ENTRY_LENGTH = 300;
const VERSION_RE = /^\d+\.\d+\.\d+$/;

const DEFAULT_SETTINGS = {
  enabled: true,
  engineScoring: true,        // Engine 1
  sensitivity: "balanced",
  engineThumbnails: false,    // Engine 2: DISABLED by default (human creators use AI thumbnails)
  whitelistVerified: true,    // Protects legitimate verified creators (StarTalk, DOAC, etc.)
  engineCommunity: true,      // Engine 3
  engineAudioScript: true,    // Engine 4
  blockSyntheticDisclosures: true,
  blockKeywords: true,
  blockShorts: false,         // FALSE by default: only AI slop shorts are blocked, human shorts stay
  placeholderMode: false,     // Clean AdBlock style (default)
  customKeywords: [],
  blockedChannels: [],
  allowedChannels: [],
  stats: {
    totalBlocked: 0
  }
};

async function ensureLocalBlocklist() {
  try {
    const localData = await chrome.storage.local.get(['remoteChannels']);
    if (!localData.remoteChannels || localData.remoteChannels.length === 0) {
      const res = await fetch(chrome.runtime.getURL('community-blocklist.json'));
      if (res.ok) {
        const json = validateBlocklist(await res.json());
        if (json) {
          await chrome.storage.local.set({
            remoteChannels: json.channels,
            remoteVideos: json.videoIds || [],
            communityVersion: json.version,
            lastCommunitySync: json.updatedAt
          });
          console.log(`[NoSlop Background] Loaded ${json.channels.length} bundled community channels into local storage.`);
        }
      }
    }
  } catch (err) {
    console.warn('[NoSlop Background] Bundled blocklist load error:', err.message);
  }
}

function validateBlocklist(data) {
  if (!data || !VERSION_RE.test(data.version || '') ||
      !Array.isArray(data.channels) || data.channels.length > MAX_REMOTE_CHANNELS) {
    return null;
  }

  const channels = Array.from(new Set(data.channels.filter(item =>
    typeof item === 'string' && item.trim() && item.length <= MAX_REMOTE_ENTRY_LENGTH
  ).map(item => item.trim())));
  const videoIds = Array.from(new Set((Array.isArray(data.videoIds) ? data.videoIds : []).filter(item =>
    typeof item === 'string' && /^[A-Za-z0-9_-]{6,32}$/.test(item)
  )));

  const updatedAt = new Date(data.updatedAt);
  if (channels.length === 0 || !Number.isFinite(updatedAt.getTime())) return null;
  return {
    channels,
    videoIds,
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

  // Fix shorts: do not blanket-block shorts unless user deliberately enabled it
  if (current.blockShorts === undefined) {
    toSet.blockShorts = false;
  }

  toSet.engineThumbnails = false;
  toSet.whitelistVerified = true;

  await chrome.storage.sync.set(toSet);
  chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' });

  await ensureLocalBlocklist();
  await scheduleCommunitySync();
  syncCommunityBlocklist();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureLocalBlocklist();
  await scheduleCommunitySync();
});

async function scheduleCommunitySync() {
  await chrome.alarms.create(COMMUNITY_SYNC_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: 6 * 60
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === COMMUNITY_SYNC_ALARM) {
    syncCommunityBlocklist();
  }
});

async function syncCommunityBlocklist() {
  try {
    const res = await fetch(GITHUB_REMOTE_BLOCKLIST_URL, { cache: 'no-store' });
    if (!res.ok) {
      // If remote not accessible yet, ensure bundled local is loaded
      await ensureLocalBlocklist();
      return { success: false, status: res.status };
    }

    const data = validateBlocklist(await res.json());
    const stored = await chrome.storage.local.get(['communityVersion']);
    if (data && (!stored.communityVersion || compareVersions(data.version, stored.communityVersion) >= 0)) {
      await chrome.storage.local.set({
        remoteChannels: data.channels,
        remoteVideos: data.videoIds || [],
        communityVersion: data.version,
        lastCommunitySync: data.updatedAt
      });
      console.log(`[NoSlop Background] Synced ${data.channels.length} community blocked channels from GitHub.`);
      return { success: true, count: data.channels.length };
    }
    if (data) return { success: false, status: 'stale', version: data.version };
  } catch (err) {
    console.warn('[NoSlop Background] Community blocklist sync failed, falling back to local:', err.message);
    await ensureLocalBlocklist();
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'videoBlocked' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const current = (tabCounts.get(tabId) || 0) + (message.count || 1);
    tabCounts.set(tabId, current);

    chrome.action.setBadgeText({
      tabId,
      text: current > 0 ? String(current) : ''
    });

    pendingBlockedCount += (message.count || 1);
    if (!statsFlushTimeout) {
      statsFlushTimeout = setTimeout(() => {
        statsFlushTimeout = null;
        flushStats();
      }, 2500);
    }

    sendResponse({ currentTabCount: current });
    return true;
  }

  if (message.action === 'getTabCount') {
    const tabId = message.tabId;
    const count = tabCounts.get(tabId) || 0;
    sendResponse({ count });
    return true;
  }

  if (message.action === 'syncCommunity') {
    syncCommunityBlocklist().then((result) => {
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
