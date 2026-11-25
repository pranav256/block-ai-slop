/**
 * NoSlop - Background Service Worker (v5.1)
 * Handles storage initialization, badge counters, and optional model training-data sync.
 */

const GITHUB_TRAINING_DATA_URL = 'https://raw.githubusercontent.com/pranav256/block-ai-slop/main/community-blocklist.json';
const TRAINING_SYNC_ALARM = 'noslop-training-sync';
const MAX_REMOTE_CHANNELS = 500000;
const MAX_REMOTE_ENTRY_LENGTH = 300;
const VERSION_RE = /^\d+\.\d+\.\d+$/;
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const metadataCache = new Map();
const pendingMetadata = new Map();
const metadataQueue = [];
let activeMetadataRequests = 0;
let metadataBackoffUntil = 0;

function parseVideoMetadata(html, videoId) {
  const assignment = /(?:\bytInitialPlayerResponse\s*=|window\["ytInitialPlayerResponse"\]\s*=)\s*/g.exec(html);
  if (!assignment || html[assignment.index + assignment[0].length] !== '{') return null;
  const start = assignment.index + assignment[0].length;
  let depth = 0, quoted = false, escaped = false;
  for (let index = start; index < html.length; index++) {
    const char = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      try {
        const player = JSON.parse(html.slice(start, index + 1));
        const details = player.videoDetails;
        if (player.playabilityStatus?.status !== 'OK' || details?.videoId !== videoId) return null;
        return {
          videoId,
          title: typeof details.title === 'string' ? details.title.slice(0, 512) : '',
          channelName: typeof details.author === 'string' ? details.author.slice(0, 200) : '',
          channelId: /^UC[a-zA-Z0-9_-]{22}$/.test(details.channelId || '') ? details.channelId : '',
          description: typeof details.shortDescription === 'string' ? details.shortDescription.slice(0, 16000) : ''
        };
      } catch { return null; }
    }
  }
  return null;
}

async function fetchVideoMetadata(videoId) {
  if (Date.now() < metadataBackoffUntil) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`, {
      credentials: 'omit', redirect: 'error', signal: controller.signal
    });
    if (response.status === 429 || response.status === 503) metadataBackoffUntil = Date.now() + 60000;
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '', bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 3000000) return null;
        html += decoder.decode(value, { stream: true });
        // Stop before downloading recommendations once the player's own JSON is complete.
        if (html.includes('ytInitialPlayerResponse')) {
          const metadata = parseVideoMetadata(html, videoId);
          if (metadata) return metadata;
        }
      }
      return parseVideoMetadata(html + decoder.decode(), videoId);
    } finally { await reader.cancel().catch(() => {}); }
  } catch { metadataBackoffUntil = Date.now() + 30000; return null; }
  finally { clearTimeout(timeout); }
}

function drainMetadataQueue() {
  while (activeMetadataRequests < 2 && metadataQueue.length) {
    const { videoId, resolve } = metadataQueue.shift();
    activeMetadataRequests++;
    fetchVideoMetadata(videoId).then(metadata => {
      if (metadataCache.size >= 256) metadataCache.delete(metadataCache.keys().next().value);
      metadataCache.set(videoId, { metadata, expires: Date.now() + (metadata ? 30 * 60000 : 60000) });
      resolve(metadata);
    }).catch(() => resolve(null)).finally(() => {
      pendingMetadata.delete(videoId);
      activeMetadataRequests--;
      drainMetadataQueue();
    });
  }
}

function getVideoMetadata(videoId) {
  if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId)) return Promise.resolve(null);
  const cached = metadataCache.get(videoId);
  if (cached?.expires > Date.now()) return Promise.resolve(cached.metadata);
  if (Date.now() < metadataBackoffUntil) return Promise.resolve(null);
  if (pendingMetadata.has(videoId)) return pendingMetadata.get(videoId);
  if (metadataQueue.length >= 24) return Promise.resolve(null);
  const result = new Promise(resolve => { metadataQueue.push({ videoId, resolve }); });
  pendingMetadata.set(videoId, result);
  drainMetadataQueue();
  return result;
}

const DEFAULT_SETTINGS = {
  enabled: true,
  engineScoring: true,        // Engine 1
  sensitivity: "balanced",
  engineThumbnails: false,    // Engine 2: DISABLED by default (human creators use AI thumbnails)
  engineCommunity: true,      // Enables exact community channel/video matching
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
            remoteVideos: json.videos,
            communityVersion: json.version,
            lastCommunitySync: json.updatedAt
          });
           console.log(`[NoSlop Background] Loaded ${json.channels.length} community entries.`);
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
  if (data.videos !== undefined && (!Array.isArray(data.videos) || data.videos.length > 100000)) return null;
  const videos = Array.from(new Set((data.videos || []).filter(item => typeof item === 'string' && VIDEO_ID_RE.test(item))));
  const updatedAt = new Date(data.updatedAt);
  if (channels.length === 0 || !Number.isFinite(updatedAt.getTime()) ||
      (data.channelsCount !== undefined && data.channelsCount !== channels.length)) return null;
  return {
    channels,
    videos,
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
        remoteVideos: data.videos,
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
  if (message.action === 'getVideoMetadata') {
    getVideoMetadata(message.videoId).then(sendResponse);
    return true;
  }
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
