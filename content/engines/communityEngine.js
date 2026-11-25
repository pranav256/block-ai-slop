/**
 * NoSlop - Engine 3: Community & Curated Blocklist Consensus (v5.1)
 * Compact exact multi-index lookup of 46,000+ known AI slop channels,
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

  function identity(value) {
    if (typeof value !== 'string') return '';
    const raw = value.trim().replace(/^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com(?=\/)/i, '').split(/[?#]/)[0].replace(/\/+$/, '');
    const id = raw.match(/^\/channel\/(UC[a-zA-Z0-9_-]{22})(?:\/.*)?$/) || raw.match(/^(UC[a-zA-Z0-9_-]{22})$/);
    if (id) return `id:${id[1]}`;
    const handle = raw.match(/^\/?@([^/]+)(?:\/.*)?$/);
    if (handle) {
      let decoded = handle[1];
      try { decoded = decodeURIComponent(decoded); } catch { /* Keep malformed encodings literal. */ }
      return `handle:${decoded.normalize('NFKC').toLowerCase()}`;
    }
    return raw && !raw.startsWith('/') && !raw.includes('://') ? `name:${normalize(raw)}` : '';
  }

  function personalMatch(entries, channelName, channelHref) {
    if (entries.has(identity(channelHref))) return true;
    if (entries.has(identity(channelName))) return true;
    // Preserve name-only matching for old personal @handle entries when links are absent.
    return !channelHref && entries.has(identity(`@${channelName || ''}`));
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
        .map(identity)
        .filter(Boolean)
    );
    allowedChannels = new Set(
      (Array.isArray(allowedList) ? allowedList : [])
        .filter(item => typeof item === 'string')
        .map(identity)
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
      const key = identity(item);
      if (key.startsWith('id:')) channelIds.push(key.slice(3));
      else if (key.startsWith('handle:')) handles.push(key.slice(7));
      else if (key.startsWith('name:')) names.push(key.slice(5));
    }

    remoteHandles = new CompactExactIndex(handles);
    remoteChannelIds = new CompactExactIndex(channelIds);
    remoteNames = new CompactExactIndex(names);

    window.NoSlopSemantic?.initializeDefaults?.();
  }

  function isChannelAllowed(channelName, channelHref = '') {
    return personalMatch(allowedChannels, channelName, channelHref);
  }

  function isUserChannelBlocked(channelName, channelHref = '') {
    return personalMatch(userBlockedChannels, channelName, channelHref);
  }

  function isChannelBlocked(channelName, channelHref = '') {
    const rawName = (channelName || '').toLowerCase().trim();
    const normName = normalize(channelName);

    // 1. Check user blacklisted channels (Highest Priority)
    if (isUserChannelBlocked(channelName, channelHref)) {
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
    const key = identity(channelHref);
    if (key.startsWith('handle:') && remoteHandles.has(key.slice(7))) {
      return { blocked: true, source: 'Community Blocklist Handle' };
    }
    if (key.startsWith('id:') && remoteChannelIds.has(key.slice(3))) {
      return { blocked: true, source: 'Community Blocklist ID' };
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
    isUserChannelBlocked,
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
