/**
 * NoSlop - Engine 3: Community & Curated Blocklist Consensus (v5.1)
 * High-performance O(1) multi-index lookup of 46,000+ known AI slop channels,
 * automated content mills, and micro-drama platforms.
 * Supports auto-syncing with centralized community-blocklist.json.
 */

(() => {
  'use strict';

  // Seeded core drama mills and patterns for instantaneous offline zero-latency matching
  const SEEDED_DRAMA_MILLS = new Set([
    "nov drama",
    "velvet romance",
    "drama diary",
    "tempting dramas",
    "next episode drama",
    "dunvaris",
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
    "minishort",
    "stoic mindset ai",
    "dark mindset daily",
    "shadow wisdom ai",
    "sigma mindset daily",
    "dark psychology daily",
    "wisdom pulse ai",
    "stoic matrix",
    "ancient stoic ai",
    "cosmo space ai",
    "mystery space hub",
    "facts pulse ai",
    "reddit stories daily",
    "reddit updates ai",
    "ai music hub",
    "ai hustle lab"
  ]);

  let userBlockedChannels = new Set();
  let allowedChannels = new Set();
  let remoteHandles;
  let remoteChannelIds;
  let remoteNames;
  let remoteBlockedVideos = new Set();
  let totalRemoteCount = 0;

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  // Exact lookup with one canonical string per entry and a compact 32-bit
  // hash index. Hash collisions are always resolved by string comparison.
  class CompactExactIndex {
    constructor(values = []) {
      const unique = Array.from(new Set(values.filter(Boolean)));
      unique.sort();
      const entries = unique
        .map(value => ({ value, hash: hashString(value) }))
        .sort((a, b) => a.hash - b.hash || a.value.localeCompare(b.value));

      this.hashes = new Uint32Array(entries.length);
      this.values = new Array(entries.length);
      for (let i = 0; i < entries.length; i++) {
        this.hashes[i] = entries[i].hash;
        this.values[i] = entries[i].value;
      }
    }

    has(value) {
      if (!value || this.hashes.length === 0) return false;
      const hash = hashString(value);
      let low = 0;
      let high = this.hashes.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (this.hashes[middle] < hash) low = middle + 1;
        else high = middle;
      }

      for (let i = low; i < this.hashes.length && this.hashes[i] === hash; i++) {
        if (this.values[i] === value) return true;
      }
      return false;
    }

    get size() {
      return this.values.length;
    }
  }

  remoteHandles = new CompactExactIndex();
  remoteChannelIds = new CompactExactIndex();
  remoteNames = new CompactExactIndex();

  function normalize(str) {
    if (typeof str !== 'string' || !str) return '';
    if (window.NoSlopText?.normalizeChannel) {
      return window.NoSlopText.normalizeChannel(str);
    }
    return str.toLowerCase()
      .replace(/[аàáâãäå]/g, 'a')
      .replace(/[еéèêë]/g, 'e')
      .replace(/[іíìîï]/g, 'i')
      .replace(/[оóòôõö]/g, 'o')
      .replace(/[р]/g, 'p')
      .replace(/[с]/g, 'c')
      .replace(/\bal\b/gi, 'ai')
      .replace(/[@\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function initCommunityEngine(userList = [], remoteChannels = [], remoteVideos = [], allowedList = []) {
    // Support calling init with 3 args: (userList, remoteChannels, allowedList)
    if (Array.isArray(remoteVideos) && allowedList.length === 0 && remoteVideos.some(x => typeof x === 'string' && x.startsWith('@'))) {
      allowedList = remoteVideos;
      remoteVideos = [];
    }

    userBlockedChannels = new Set(
      (Array.isArray(userList) ? userList : [])
        .filter(item => typeof item === 'string')
        .map(normalize)
        .filter(Boolean)
    );
    allowedChannels = new Set(
      (Array.isArray(allowedList) ? allowedList : [])
        .filter(item => typeof item === 'string')
        .map(normalize)
        .filter(Boolean)
    );
    remoteBlockedVideos = new Set(
      (Array.isArray(remoteVideos) ? remoteVideos : []).filter(item => typeof item === 'string')
    );

    const handles = [];
    const channelIds = [];
    const names = [];
    totalRemoteCount = Array.isArray(remoteChannels) ? remoteChannels.length : 0;

    for (const item of (Array.isArray(remoteChannels) ? remoteChannels : [])) {
      if (typeof item !== 'string' || !item.trim()) continue;
      const str = item.trim();

      // Channel URL format (/channel/UC...)
      if (str.startsWith('/channel/')) {
        const id = str.replace('/channel/', '').split('/')[0].split('?')[0];
        channelIds.push(id.toLowerCase());
        continue;
      }

      // Handle format (/@handle or @handle)
      if (str.startsWith('/@') || str.startsWith('@')) {
        const handle = str.replace(/^\/?@/, '').toLowerCase().split('/')[0].split('?')[0];
        handles.push(normalize(handle));
        continue;
      }

      // Raw YouTube Channel ID (UC...)
      if (/^UC[a-zA-Z0-9_-]{20,}$/.test(str)) {
        channelIds.push(str.toLowerCase());
        continue;
      }

      // Channel Name
      names.push(normalize(str));
    }

    remoteHandles = new CompactExactIndex(handles);
    remoteChannelIds = new CompactExactIndex(channelIds);
    remoteNames = new CompactExactIndex(names);

    // Initialize semantic model with labeled samples
    window.NoSlopSemantic?.initialize?.(remoteChannels.slice(0, 500), allowedList);
  }

  function isChannelAllowed(channelName, channelHref = '') {
    const rawName = (channelName || '').toLowerCase().trim();
    const normName = normalize(channelName);

    if (allowedChannels.has(rawName) || allowedChannels.has(normName)) return true;
    if (channelHref) {
      const cleanHref = channelHref.split('?')[0].replace(/\/+$/, '');
      const handleMatch = cleanHref.match(/\/@([^/]+)/);
      if (handleMatch && allowedChannels.has(normalize(handleMatch[1]))) return true;
      const idMatch = cleanHref.match(/\/channel\/([^/]+)/);
      if (idMatch && allowedChannels.has(normalize(idMatch[1]))) return true;
    }
    return false;
  }

  function isChannelBlocked(channelName, channelHref = '') {
    const rawName = (channelName || '').toLowerCase().trim();
    const normName = normalize(channelName);

    // 1. Check user blacklisted channels (Highest Priority)
    if (userBlockedChannels.has(rawName) || userBlockedChannels.has(normName)) {
      return { blocked: true, source: 'User Blacklist' };
    }

    // 2. Check seeded drama & slop mills
    if (SEEDED_DRAMA_MILLS.has(rawName) || SEEDED_DRAMA_MILLS.has(normName)) {
      return { blocked: true, source: 'Curated Drama Mill' };
    }

    // 3. Check community channel names
    if (remoteNames.has(normName)) {
      return { blocked: true, source: 'Community Blocklist Name' };
    }

    // 4. Check channel handle and ID from href
    if (channelHref) {
      const cleanHref = channelHref.split('?')[0].replace(/\/+$/, '');

      // Check handle (/@...)
      const handleMatch = cleanHref.match(/\/@([^/]+)/);
      if (handleMatch) {
        const handle = handleMatch[1].toLowerCase();
        if (remoteHandles.has(normalize(handle))) {
          return { blocked: true, source: `Community Blocklist Handle (@${handle})` };
        }
        if (userBlockedChannels.has(normalize(handle))) {
          return { blocked: true, source: `User Blacklist (@${handle})` };
        }
      }

      // Check channel ID (/channel/UC...)
      const idMatch = cleanHref.match(/\/channel\/([^/]+)/);
      if (idMatch) {
        const id = idMatch[1];
        if (remoteChannelIds.has(id.toLowerCase())) {
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
    isChannelAllowed,
    isChannelBlocked,
    isVideoBlocked,
    normalize,
    getCuratedCount: () => SEEDED_DRAMA_MILLS.size,
    getUserCount: () => userBlockedChannels.size,
    getRemoteCount: () => totalRemoteCount,
    getIndexStats: () => ({
      handles: remoteHandles?.size || 0,
      channelIds: remoteChannelIds?.size || 0,
      names: remoteNames?.size || 0
    })
  };
})();
