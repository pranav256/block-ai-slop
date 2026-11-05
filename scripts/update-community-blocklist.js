const fs = require('fs');
const path = require('path');

async function buildCommunityBlocklist() {
  console.log('1. Fetching AiSList...');
  const res1 = await fetch('https://raw.githubusercontent.com/Override92/AiSList/main/AiSList/aislist_blocklist.txt');
  const txt1 = await res1.text();

  console.log('2. Fetching Cevval AI Music Blocklist...');
  const res2 = await fetch('https://raw.githubusercontent.com/cevvalkoala/CevvalYoutubeAIBlocklist/main/CevvalYoutubeAIblocklist.txt');
  const txt2 = await res2.text();

  console.log('3. Fetching DeSlop Blocklist...');
  const res3 = await fetch('https://raw.githubusercontent.com/NikoboiNFTB/DeSlop/main/block/list.txt');
  const txt3 = await res3.text();

  const aislistEntries = txt1.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('!'));

  const cevvalEntries = [];
  const cevvalLines = txt2.split('\n');
  for (const line of cevvalLines) {
    const m = line.match(/href\*="([^"]+)"/);
    if (m && m[1]) cevvalEntries.push(m[1].trim());
  }

  // Whitelist to strictly protect legitimate human creators and educational tech essayists
  const EXCLUSIONS = new Set([
    '@aiexplained-official',
    'aiexplained-official',
    '@aiadvantage',
    'aiadvantage',
    '@allaboutai',
    'allaboutai',
    '@mkbhd',
    'mkbhd',
    '@startalk',
    'startalk',
    '@veritasium',
    'veritasium',
    '@twominutepapers',
    'twominutepapers',
    '@lexfridman',
    'lexfridman',
    '@mattwolfe',
    'mattwolfe',
    '@neildegrassetyson',
    '@theodorabrooks'
  ]);

  const deslopEntries = txt3.split('\n')
    .map(l => l.trim().replace(/^\/@/, '@'))
    .filter(l => l && !l.startsWith('#') && !EXCLUSIONS.has(l.toLowerCase()));

  // Local drama platforms and confirmed AI story mills
  const dramaMills = [
    "Nov Drama",
    "Hero AI Dramas",
    "Hero Al Dramas",
    "Tale Time",
    "Tale Time66",
    "AI Drama",
    "AI Dramas",
    "AI Stories",
    "AI Story",
    "AI Chronicles",
    "AI Cinema",
    "Cinema AI",
    "AI Animation Hub",
    "Daily AI Recap",
    "Daily Facts Sphere",
    "Mystery AI Stories",
    "Curiosity AI",
    "Wonder Drama",
    "Wonder Dramas",
    "Billionaire Tales AI",
    "Mafia Drama Hub",
    "AI History Hub",
    "AI Facts Daily",
    "Synthetic Cinema",
    "Mythology AI",
    "AI Scary Stories",
    "Reddit AI Stories",
    "DramaBox",
    "ShortMax",
    "ReelShort",
    "DramaWave",
    "SnackShort",
    "GoodShort",
    "MoboReels",
    "Kalos TV",
    "Sereal+",
    "NetShort",
    "Everlight Drama",
    "ShortTV",
    "FlexTV",
    "Starlet TV",
    "Playlet",
    "MicroDrama",
    "Vigloo",
    "ShortsWave",
    "MiniShort"
  ];

  const combinedSet = new Set();

  for (const e of dramaMills) {
    if (!EXCLUSIONS.has(e.toLowerCase())) combinedSet.add(e);
  }
  for (const e of aislistEntries) {
    if (!EXCLUSIONS.has(e.toLowerCase())) combinedSet.add(e);
  }
  for (const e of cevvalEntries) {
    if (!EXCLUSIONS.has(e.toLowerCase())) combinedSet.add(e);
  }
  for (const e of deslopEntries) {
    if (!EXCLUSIONS.has(e.toLowerCase())) combinedSet.add(e);
  }

  const sortedChannels = Array.from(combinedSet);

  console.log(`Aggregated ${sortedChannels.length} unique AI channels/handles/IDs.`);

  const blocklistData = {
    version: "2.0.0",
    updatedAt: new Date().toISOString(),
    description: "Centralized community-curated blocklist for NoSlop - AI Video Blocker for YouTube",
    sources: [
      "AiSList (Override92/AiSList) - 44k+ high-confidence AI content mills",
      "Cevval YouTube AI Music Blocklist (cevvalkoala) - 2k+ AI music spam channels",
      "YouTube DeSlop (NikoboiNFTB/DeSlop) - Curated generative AI channels",
      "NoSlop Curated Drama & Story Mills (pranav256) - Micro-drama platforms and synthetic story channels"
    ],
    maintainer: "pranav256",
    channelsCount: sortedChannels.length,
    channels: sortedChannels,
  };

  const targetPath = path.join(__dirname, '..', 'community-blocklist.json');
  fs.writeFileSync(targetPath, JSON.stringify(blocklistData, null, 2), 'utf8');

  const stats = fs.statSync(targetPath);
  console.log(`Successfully wrote ${targetPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

buildCommunityBlocklist().catch(console.error);
