/**
 * NoSlop - Background Service Worker (v2.5)
 * Handles storage initialization, badge counters, and centralized GitHub community blocklist sync.
 */

const GITHUB_REMOTE_BLOCKLIST_URL = 'https://raw.githubusercontent.com/pranav256/block-ai-slop/main/community-blocklist.json';

// Only compound generative phrases — never match standalone 'ai' as a topic!
const DEFAULT_KEYWORDS = [
  "ai generated",
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
  "udio ai"
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
  blockShorts: true,
  placeholderMode: false,     // Clean AdBlock style (default)
  customKeywords: DEFAULT_KEYWORDS,
  blockedChannels: [],
  remoteChannels: [],
  remoteVideos: [],
  lastCommunitySync: null,
  stats: {
    totalBlocked: 0
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  const toSet = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      toSet[key] = value;
    }
  }

  // Remove standalone 'ai' if present to prevent false positives on podcasts/interviews
  if (Array.isArray(current.customKeywords)) {
    toSet.customKeywords = current.customKeywords.filter(k => k.trim().toLowerCase() !== 'ai');
  }

  // Set thumbnails engine to false to protect human creators
  toSet.engineThumbnails = false;
  toSet.whitelistVerified = true;

  await chrome.storage.sync.set(toSet);

  chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' });
  syncCommunityBlocklist();
});

setInterval(syncCommunityBlocklist, 6 * 60 * 60 * 1000);

async function syncCommunityBlocklist() {
  try {
    const res = await fetch(GITHUB_REMOTE_BLOCKLIST_URL, { cache: 'no-store' });
    if (!res.ok) return { success: false, status: res.status };

    const data = await res.json();
    if (data && Array.isArray(data.channels)) {
      await chrome.storage.sync.set({
        remoteChannels: data.channels,
        remoteVideos: data.videoIds || [],
        lastCommunitySync: new Date().toISOString()
      });
      console.log(`[NoSlop Background] Synced ${data.channels.length} community blocked channels from GitHub.`);
      return { success: true, count: data.channels.length };
    }
  } catch (err) {
    console.warn('[NoSlop Background] Community blocklist sync failed:', err.message);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'videoBlocked' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const current = (tabCounts.get(tabId) || 0) + (message.count || 1);
    tabCounts.set(tabId, current);

    chrome.action.setBadgeText({
      tabId,
      text: current > 0 ? String(current) : ''
    });

    chrome.storage.sync.get('stats', (data) => {
      const stats = data.stats || { totalBlocked: 0 };
      stats.totalBlocked = (stats.totalBlocked || 0) + (message.count || 1);
      chrome.storage.sync.set({ stats });
    });

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
