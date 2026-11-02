/**
 * NoSlop - Engine 3: Community & Curated Blocklist Consensus (v2.6)
 * Instant O(1) multi-index hash set lookup of 46,000+ known AI slop channels,
 * automated content mills, and micro-drama platforms.
 * Supports auto-syncing with centralized GitHub community-blocklist.json.
 */

(() => {
  'use strict';

  // Seeded core drama mills and patterns for instantaneous offline zero-latency matching
  const SEEDED_DRAMA_MILLS = new Set([
    "nov drama",
    "hero ai dramas",
    "hero al dramas",
    "tale time",
    "tale time66",
    "ai drama",
    "ai dramas",
    "ai stories",
    "ai story",
    "ai chronicles",
    "ai cinema",
    "cinema ai",
    "ai animation hub",
    "daily ai recap",
    "daily facts sphere",
    "mystery ai stories",
    "curiosity ai",
    "wonder drama",
    "wonder dramas",
    "billionaire tales ai",
    "mafia drama hub",
    "ai history hub",
    "ai facts daily",
    "synthetic cinema",
    "mythology ai",
    "ai scary stories",
    "reddit ai stories",
    "dramabox",
    "shortmax",
    "reelshort",
    "dramawave",
    "snackshort",
    "goodshort",
    "moboreels",
    "kalos tv",
    "sereal+",
    "netshort",
    "everlight drama",
    "shorttv",
    "flextv",
    "starlet tv",
    "playlet",
    "microdrama",
    "vigloo",
    "shortswave",
    "minishort"
  ]);

  let userBlockedChannels = new Set();
  let remoteHandles = new Set();
  let remoteChannelIds = new Set();
  let remoteNames = new Set();
  let remoteBlockedVideos = new Set();
  let totalRemoteCount = 0;

  function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[аàáâãäå]/g, 'a')
      .replace(/[еéèêë]/g, 'e')
      .replace(/[іíìîï]/g, 'i')
      .replace(/[оóòôõö]/g, 'o')
      .replace(/[р]/g, 'p')
      .replace(/[с]/g, 'c')
      .replace(/\bal\b/gi, 'ai')      // Fixes 'Hero Al' typo evasion
      .replace(/[@\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function initCommunityEngine(userList = [], remoteChannels = [], remoteVideos = []) {
    userBlockedChannels = new Set((userList || []).map(normalize));
    remoteBlockedVideos = new Set(remoteVideos || []);

    remoteHandles = new Set();
    remoteChannelIds = new Set();
    remoteNames = new Set();
    totalRemoteCount = (remoteChannels || []).length;

    for (const item of (remoteChannels || [])) {
      if (!item) continue;
      const str = item.trim();

      // Channel URL format (/channel/UC...)
      if (str.startsWith('/channel/')) {
        const id = str.replace('/channel/', '').split('/')[0].split('?')[0];
        remoteChannelIds.add(id);
        remoteChannelIds.add(id.toLowerCase());
        continue;
      }

      // Handle format (/@handle or @handle)
      if (str.startsWith('/@') || str.startsWith('@')) {
        const handle = str.replace(/^\/?@/, '').toLowerCase().split('/')[0].split('?')[0];
        remoteHandles.add(handle);
        remoteHandles.add('@' + handle);
        continue;
      }

      // Raw YouTube Channel ID (UC...)
      if (/^UC[a-zA-Z0-9_-]{20,}$/.test(str)) {
        remoteChannelIds.add(str);
        remoteChannelIds.add(str.toLowerCase());
        continue;
      }

      // Channel Name
      remoteNames.add(str.toLowerCase());
      remoteNames.add(normalize(str));
    }
  }

  function isChannelBlocked(channelName, channelHref = '') {
    const rawName = (channelName || '').toLowerCase().trim();
    const normName = normalize(channelName);

    // 1. Check user blacklisted channels
    if (userBlockedChannels.has(rawName) || userBlockedChannels.has(normName)) {
      return { blocked: true, source: 'User Blacklist' };
    }

    // 2. Check seeded drama & slop mills
    if (SEEDED_DRAMA_MILLS.has(rawName) || SEEDED_DRAMA_MILLS.has(normName)) {
      return { blocked: true, source: 'Curated Drama Mill' };
    }

    // 3. Check community channel names
    if (remoteNames.has(rawName) || remoteNames.has(normName)) {
      return { blocked: true, source: 'Community Blocklist Name' };
    }

    // 4. Check channel handle and ID from href
    if (channelHref) {
      const cleanHref = channelHref.split('?')[0].replace(/\/+$/, '');

      // Check handle (/@...)
      const handleMatch = cleanHref.match(/\/@([^\/]+)/);
      if (handleMatch) {
        const handle = handleMatch[1].toLowerCase();
        if (remoteHandles.has(handle) || remoteHandles.has('@' + handle)) {
          return { blocked: true, source: `Community Blocklist Handle (@${handle})` };
        }
        if (userBlockedChannels.has(handle) || userBlockedChannels.has('@' + handle)) {
          return { blocked: true, source: `User Blacklist (@${handle})` };
        }
      }

      // Check channel ID (/channel/UC...)
      const idMatch = cleanHref.match(/\/channel\/([^\/]+)/);
      if (idMatch) {
        const id = idMatch[1];
        if (remoteChannelIds.has(id) || remoteChannelIds.has(id.toLowerCase())) {
          return { blocked: true, source: `Community Blocklist ID (${id})` };
        }
      }
    }

    // 5. Pattern substring match for seeded drama mill phrases
    for (const mill of SEEDED_DRAMA_MILLS) {
      if (normName.includes(mill)) {
        return { blocked: true, source: `Drama Mill Pattern: "${mill}"` };
      }
    }

    return { blocked: false };
  }

  function isVideoBlocked(videoId) {
    if (!videoId) return false;
    return remoteBlockedVideos.has(videoId);
  }

  window.NoSlopCommunity = {
    init: initCommunityEngine,
    isChannelBlocked,
    isVideoBlocked,
    normalize,
    getCuratedCount: () => SEEDED_DRAMA_MILLS.size,
    getUserCount: () => userBlockedChannels.size,
    getRemoteCount: () => totalRemoteCount
  };
})();
