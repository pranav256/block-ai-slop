/**
 * NoSlop - Engine 3: Community & Curated Blocklist Consensus (v2.4)
 * Instant O(1) hash set lookup of known AI slop channels, automated content mills, and micro-drama platforms.
 * Supports auto-syncing with centralized GitHub community-blocklist.json.
 */

(() => {
  'use strict';

  // Seeded curated list of known AI slop, automated drama mills, and vertical drama channels
  const CURATED_AI_CHANNELS = new Set([
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
    "sereal+"
  ]);

  let userBlockedChannels = new Set();
  let remoteSubscribedChannels = new Set();
  let remoteBlockedVideos = new Set();

  function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[аàáâãäå]/g, 'a')
      .replace(/[еéèêë]/g, 'e')
      .replace(/[іíìîï]/g, 'i')
      .replace(/[оóòôõö]/g, 'o')
      .replace(/[р]/g, 'p')
      .replace(/[с]/g, 'c')
      .replace(/\bal\b/gi, 'ai')      // Fixes 'Hero Al' evasion
      .replace(/[@\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function initCommunityEngine(userList = [], remoteChannels = [], remoteVideos = []) {
    userBlockedChannels = new Set((userList || []).map(normalize));
    remoteSubscribedChannels = new Set((remoteChannels || []).map(normalize));
    remoteBlockedVideos = new Set(remoteVideos || []);
  }

  function isChannelBlocked(channelName, channelHref = '') {
    const rawName = (channelName || '').toLowerCase().trim();
    const normName = normalize(channelName);
    const normHref = normalize(channelHref.replace(/^\/@/, ''));

    if (
      CURATED_AI_CHANNELS.has(rawName) ||
      CURATED_AI_CHANNELS.has(normName) ||
      CURATED_AI_CHANNELS.has(normHref)
    ) {
      return { blocked: true, source: 'Curated Community Blocklist' };
    }

    if (
      userBlockedChannels.has(rawName) ||
      userBlockedChannels.has(normName) ||
      userBlockedChannels.has(normHref)
    ) {
      return { blocked: true, source: 'User Blacklist' };
    }

    if (
      remoteSubscribedChannels.has(rawName) ||
      remoteSubscribedChannels.has(normName) ||
      remoteSubscribedChannels.has(normHref)
    ) {
      return { blocked: true, source: 'GitHub Community Sync' };
    }

    for (const curated of CURATED_AI_CHANNELS) {
      if (normName.includes(curated) || (normHref && normHref.includes(curated))) {
        return { blocked: true, source: 'Curated Community Pattern' };
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
    getCuratedCount: () => CURATED_AI_CHANNELS.size,
    getUserCount: () => userBlockedChannels.size,
    getRemoteCount: () => remoteSubscribedChannels.size
  };
})();
