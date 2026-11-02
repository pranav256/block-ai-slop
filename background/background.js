/**
 * NoSlop - Background Service Worker (v2.6)
 * Handles storage initialization, badge counters, and centralized GitHub community blocklist sync.
 * Large community databases (46k+ channels) are stored in chrome.storage.local.
 */

const GITHUB_REMOTE_BLOCKLIST_URL = 'https://raw.githubusercontent.com/pranav256/block-ai-slop/main/community-blocklist.json';

// Only compound generative phrases — never match standalone 'ai' as a topic!
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
  "minidrama",
  "mini drama",
  "short drama",
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
  customKeywords: DEFAULT_KEYWORDS,
  blockedChannels: [],
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
        const json = await res.json();
        if (json && Array.isArray(json.channels)) {
          await chrome.storage.local.set({
            remoteChannels: json.channels,
            remoteVideos: json.videoIds || [],
            lastCommunitySync: json.updatedAt || new Date().toISOString()
          });
          console.log(`[NoSlop Background] Loaded ${json.channels.length} bundled community channels into local storage.`);
        }
      }
    }
  } catch (err) {
    console.warn('[NoSlop Background] Bundled blocklist load error:', err.message);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  const toSet = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      toSet[key] = value;
    }
  }

  // Ensure new default keywords are merged so existing installs automatically receive updates
  const existingKws = Array.isArray(current.customKeywords) ? current.customKeywords : [];
  const mergedKws = [...existingKws];
  for (const defKw of DEFAULT_KEYWORDS) {
    if (!mergedKws.some(k => k.trim().toLowerCase() === defKw.toLowerCase())) {
      mergedKws.push(defKw);
    }
  }
  toSet.customKeywords = mergedKws.filter(k => k.trim().toLowerCase() !== 'ai');

  // Fix shorts: do not blanket-block shorts unless user deliberately enabled it
  if (current.blockShorts === undefined) {
    toSet.blockShorts = false;
  }

  toSet.engineThumbnails = false;
  toSet.whitelistVerified = true;

  await chrome.storage.sync.set(toSet);
  chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' });

  await ensureLocalBlocklist();
  syncCommunityBlocklist();
});

chrome.runtime.onStartup.addListener(() => {
  ensureLocalBlocklist();
});

setInterval(syncCommunityBlocklist, 6 * 60 * 60 * 1000);

async function syncCommunityBlocklist() {
  try {
    const res = await fetch(GITHUB_REMOTE_BLOCKLIST_URL, { cache: 'no-store' });
    if (!res.ok) {
      // If remote not accessible yet, ensure bundled local is loaded
      await ensureLocalBlocklist();
      return { success: false, status: res.status };
    }

    const data = await res.json();
    if (data && Array.isArray(data.channels)) {
      await chrome.storage.local.set({
        remoteChannels: data.channels,
        remoteVideos: data.videoIds || [],
        lastCommunitySync: new Date().toISOString()
      });
      console.log(`[NoSlop Background] Synced ${data.channels.length} community blocked channels from GitHub.`);
      return { success: true, count: data.channels.length };
    }
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
});
