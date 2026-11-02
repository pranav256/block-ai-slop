const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const edge = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const storeAssetsDir = path.join(__dirname, '..', 'store_assets');

if (!fs.existsSync(storeAssetsDir)) {
  fs.mkdirSync(storeAssetsDir, { recursive: true });
}

// 1. Small Promo Tile (440x280)
const promoSmallHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 440px;
    height: 280px;
    background: #090d16;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 28px;
    position: relative;
    overflow: hidden;
  }
  .bg-glow {
    position: absolute;
    top: -50px;
    right: -50px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(244,63,94,0.15) 0%, rgba(9,13,22,0) 70%);
  }
  .header {
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 2;
  }
  .icon-box {
    width: 52px;
    height: 52px;
    background: #0f172a;
    border: 1.5px solid #334155;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .brand-title {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #ffffff;
  }
  .brand-sub {
    font-size: 11px;
    color: #f43f5e;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .content {
    z-index: 2;
  }
  .tagline {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.35;
    color: #e2e8f0;
    margin-bottom: 8px;
  }
  .desc {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.4;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 2;
  }
  .pill {
    font-size: 11px;
    font-weight: 500;
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    padding: 4px 10px;
    border-radius: 6px;
  }
</style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="header">
    <div class="icon-box">
      <svg width="34" height="34" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="38" fill="none" stroke="#f43f5e" stroke-width="10"/>
        <line x1="37" y1="37" x2="91" y2="91" stroke="#f43f5e" stroke-width="10" stroke-linecap="round"/>
      </svg>
    </div>
    <div>
      <div class="brand-title">NoSlop</div>
      <div class="brand-sub">AI Video Blocker for YouTube</div>
    </div>
  </div>
  <div class="content">
    <div class="tagline">Eliminate AI Slop & Drama Mills</div>
    <div class="desc">Purges fake AI story channels & synthetic audio while protecting legitimate human creators.</div>
  </div>
  <div class="footer">
    <span class="pill">🛡️ 46,800+ Blocklist</span>
    <span class="pill">⚡ Bayesian Heuristics</span>
    <span class="pill">🔒 100% Private</span>
  </div>
</body>
</html>`;

// 2. Large Promo Tile (920x680)
const promoLargeHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 920px;
    height: 680px;
    background: #090d16;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 64px;
    position: relative;
    overflow: hidden;
  }
  .bg-glow-1 {
    position: absolute;
    top: -120px;
    right: -120px;
    width: 480px;
    height: 480px;
    background: radial-gradient(circle, rgba(244,63,94,0.12) 0%, rgba(9,13,22,0) 70%);
  }
  .bg-glow-2 {
    position: absolute;
    bottom: -80px;
    left: -80px;
    width: 360px;
    height: 360px;
    background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(9,13,22,0) 70%);
  }
  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 2;
  }
  .icon-box {
    width: 80px;
    height: 80px;
    background: #0f172a;
    border: 2px solid #334155;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
  }
  .brand-title {
    font-size: 44px;
    font-weight: 800;
    letter-spacing: -1px;
    color: #ffffff;
  }
  .brand-sub {
    font-size: 15px;
    color: #f43f5e;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .hero-block {
    z-index: 2;
    max-width: 780px;
  }
  .main-heading {
    font-size: 38px;
    font-weight: 700;
    line-height: 1.25;
    color: #f1f5f9;
    letter-spacing: -0.5px;
    margin-bottom: 16px;
  }
  .main-heading span {
    color: #f43f5e;
  }
  .sub-heading {
    font-size: 18px;
    line-height: 1.5;
    color: #94a3b8;
    margin-bottom: 28px;
  }
  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    z-index: 2;
  }
  .card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 18px;
  }
  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #1e293b;
    padding-top: 20px;
    z-index: 2;
  }
  .meta-text {
    font-size: 13px;
    color: #64748b;
  }
  .badges {
    display: flex;
    gap: 8px;
  }
  .badge {
    font-size: 12px;
    font-weight: 600;
    background: #1e293b;
    color: #cbd5e1;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #334155;
  }
</style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="header">
    <div class="icon-box">
      <svg width="52" height="52" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="38" fill="none" stroke="#f43f5e" stroke-width="10"/>
        <line x1="37" y1="37" x2="91" y2="91" stroke="#f43f5e" stroke-width="10" stroke-linecap="round"/>
      </svg>
    </div>
    <div>
      <div class="brand-title">NoSlop</div>
      <div class="brand-sub">AI Video Blocker for YouTube</div>
    </div>
  </div>

  <div class="hero-block">
    <h1 class="main-heading">Take back your YouTube feed from <span>AI Slop & Content Mills</span></h1>
    <p class="sub-heading">Automatically filters synthetic drama channels, fake reddit narrations, and AI music mills while strictly protecting verified human creators.</p>
  </div>

  <div class="features-grid">
    <div class="card">
      <div class="card-title">🎯 Creator Safe</div>
      <div class="card-desc">Automatically whitelists verified human science and tech educators discussing AI topics.</div>
    </div>
    <div class="card">
      <div class="card-title">🛡️ 46,800+ Community List</div>
      <div class="card-desc">Aggregated from AiSList, Cevval AI Music, and micro-drama networks with auto-sync.</div>
    </div>
    <div class="card">
      <div class="card-title">⚡ Bayesian Heuristics</div>
      <div class="card-desc">Detects native YouTube AI disclaimers, EDSA boilerplate, and melodrama plot tropes.</div>
    </div>
  </div>

  <div class="footer">
    <span class="meta-text">Manifest V3 • Zero Telemetry • 100% In-Memory Processing</span>
    <div class="badges">
      <span class="badge">Open Source (MIT)</span>
      <span class="badge">GitHub Auto-Sync</span>
    </div>
  </div>
</body>
</html>`;

// 3. Screenshot 1 (1280x800): YouTube Feed Before/After Clean Hiding
const screenshot1Html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    height: 800px;
    background: #0f0f0f;
    color: #f1f1f1;
    font-family: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .yt-header {
    height: 56px;
    background: #0f0f0f;
    border-bottom: 1px solid #272727;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
  }
  .yt-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: -0.5px;
  }
  .yt-red { color: #ff0000; }
  .search-bar {
    width: 500px;
    height: 38px;
    background: #121212;
    border: 1px solid #303030;
    border-radius: 20px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    color: #f1f1f1;
    font-size: 14px;
  }
  .badge-bar {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .noslop-badge {
    background: #1e1e24;
    border: 1px solid #f43f5e;
    color: #f43f5e;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .container {
    display: flex;
    flex: 1;
    height: calc(800px - 56px);
  }
  .sidebar {
    width: 220px;
    background: #0f0f0f;
    border-right: 1px solid #272727;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .side-item {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 14px;
    color: #aaaaaa;
  }
  .side-item.active {
    background: #272727;
    color: #f1f1f1;
    font-weight: 500;
  }
  .main-feed {
    flex: 1;
    padding: 24px 32px;
    overflow-y: hidden;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .feed-title {
    font-size: 18px;
    font-weight: 600;
    color: #f1f1f1;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .stat-pill {
    background: rgba(244,63,94,0.15);
    border: 1px solid rgba(244,63,94,0.3);
    color: #f43f5e;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
  }
  .video-card {
    display: flex;
    gap: 16px;
    background: #18181b;
    border-radius: 12px;
    padding: 14px;
    border: 1px solid #27272a;
    position: relative;
  }
  .video-card.verified-creator {
    border-left: 3px solid #10b981;
  }
  .video-card.blocked-banner {
    background: #141117;
    border: 1px dashed rgba(244,63,94,0.4);
    align-items: center;
    padding: 12px 18px;
    justify-content: space-between;
  }
  .thumb {
    width: 240px;
    height: 135px;
    background: #27272a;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #71717a;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .video-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .video-title {
    font-size: 16px;
    font-weight: 600;
    color: #f4f4f5;
    line-height: 1.35;
  }
  .video-meta {
    font-size: 13px;
    color: #a1a1aa;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .verified-icon {
    display: inline-block;
    width: 14px;
    height: 14px;
    background: #71717a;
    color: #000;
    border-radius: 50%;
    text-align: center;
    line-height: 14px;
    font-size: 9px;
    font-weight: bold;
  }
  .badge-allowed {
    background: rgba(16,185,129,0.12);
    color: #10b981;
    border: 1px solid rgba(16,185,129,0.25);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
  }
  .video-desc {
    font-size: 12px;
    color: #71717a;
    margin-top: 4px;
    line-height: 1.4;
  }
  .blocked-title {
    font-size: 14px;
    font-weight: 500;
    color: #f43f5e;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .blocked-detail {
    font-size: 12px;
    color: #71717a;
  }
</style>
</head>
<body>
  <div class="yt-header">
    <div class="yt-logo">
      <span class="yt-red">▶</span> YouTube
    </div>
    <div class="search-bar">ai drama</div>
    <div class="badge-bar">
      <div class="noslop-badge">🛡️ NoSlop: 4 AI Videos Hidden</div>
    </div>
  </div>

  <div class="container">
    <div class="sidebar">
      <div class="side-item active">Home</div>
      <div class="side-item">Subscriptions</div>
      <div class="side-item">History</div>
      <div class="side-item">Playlists</div>
    </div>

    <div class="main-feed">
      <div class="feed-title">
        <span>Search results for "ai drama"</span>
        <span class="stat-pill">Zero-Height Clean Collapse Active</span>
      </div>

      <!-- Blocked Item 1 -->
      <div class="video-card blocked-banner">
        <div>
          <div class="blocked-title">🛡️ AI VIDEO BLOCKED: "She Married a Stranger to Please His Daughter... Unaware He Was Most Feared MAFIA BOSS!"</div>
          <div class="blocked-detail">Channel: Nov Drama • Matched Curated Slop Mill & #AIStory formula</div>
        </div>
        <div style="font-size:11px;color:#94a3b8;border:1px solid #334155;padding:4px 8px;border-radius:4px;">Hidden via Community Engine</div>
      </div>

      <!-- Blocked Item 2 -->
      <div class="video-card blocked-banner">
        <div>
          <div class="blocked-title">🛡️ AI VIDEO BLOCKED: "He Made His Wife a Billionaire, But She Let Her Assistant Humiliate Him"</div>
          <div class="blocked-detail">Channel: Hero Al Dramas • Matched EDSA Standard Disclaimer & Typo Evasion Normalizer</div>
        </div>
        <div style="font-size:11px;color:#94a3b8;border:1px solid #334155;padding:4px 8px;border-radius:4px;">Hidden via Bayesian Engine</div>
      </div>

      <!-- Allowed Human Creator Item -->
      <div class="video-card verified-creator">
        <div class="thumb" style="background:#1e293b;border:1px solid #334155;">
          <div style="text-align:center;padding:12px;">
            <div style="font-size:24px;margin-bottom:6px;">🤖</div>
            <div style="color:#e2e8f0;font-weight:600;">DOES A.I. THINK?</div>
          </div>
        </div>
        <div class="video-info">
          <div class="video-title">Is AI Hiding Its Full Power? With Geoffrey Hinton</div>
          <div class="video-meta">
            <span>StarTalk</span>
            <span class="verified-icon">✓</span>
            <span class="badge-allowed">PROTECTED HUMAN CREATOR</span>
            <span>• 4.2M views • 8 months ago</span>
          </div>
          <div class="video-desc">Neil deGrasse Tyson sits down with AI pioneer Geoffrey Hinton. Despite AI artwork in the thumbnail, NoSlop automatically protects verified science communicators.</div>
        </div>
      </div>

      <!-- Blocked Item 3 -->
      <div class="video-card blocked-banner">
        <div>
          <div class="blocked-title">🛡️ AI VIDEO BLOCKED: "Poor college student gains X-ray vision, crushes rich clans"</div>
          <div class="blocked-detail">Channel: Tale Time66 • Matched Serialized AI Micro-Drama Formula</div>
        </div>
        <div style="font-size:11px;color:#94a3b8;border:1px solid #334155;padding:4px 8px;border-radius:4px;">Hidden via Community Blocklist</div>
      </div>

    </div>
  </div>
</body>
</html>`;

// 4. Screenshot 2 (1280x800): NoSlop Control Panel & 46,800+ Community Blocklist
const screenshot2Html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px;
    height: 800px;
    background: #090d16;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }
  .showcase {
    display: flex;
    gap: 48px;
    align-items: center;
    max-width: 1160px;
  }
  .info-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .info-tag {
    font-size: 13px;
    font-weight: 700;
    color: #f43f5e;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .info-title {
    font-size: 36px;
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: -0.5px;
  }
  .info-desc {
    font-size: 16px;
    line-height: 1.5;
    color: #94a3b8;
  }
  .bullet-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .bullet-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: #cbd5e1;
  }
  .bullet-icon {
    color: #f43f5e;
    font-weight: bold;
  }

  /* Popup Frame */
  .popup-frame {
    width: 380px;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
    overflow: hidden;
  }
  .p-header {
    padding: 16px 20px;
    background: #111c34;
    border-bottom: 1px solid #1e293b;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .p-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .p-title { font-size: 16px; font-weight: 700; color: #fff; }
  .p-badge { font-size: 10px; background: rgba(244,63,94,0.2); color: #f43f5e; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
  
  .p-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 14px 20px;
    background: #090e1a;
    border-bottom: 1px solid #1e293b;
  }
  .stat-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }
  .stat-num { font-size: 22px; font-weight: 700; color: #f43f5e; }
  .stat-lbl { font-size: 11px; color: #64748b; margin-top: 2px; }

  .p-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .section-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
  }
  .toggle-info { display: flex; flex-direction: column; }
  .t-title { font-size: 13px; font-weight: 500; color: #e2e8f0; }
  .t-desc { font-size: 11px; color: #64748b; }
  .t-switch {
    width: 36px;
    height: 20px;
    background: #f43f5e;
    border-radius: 20px;
    position: relative;
  }
  .t-knob {
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    right: 2px;
  }
  .community-box {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sync-btn {
    background: #f43f5e;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="showcase">
    <div class="info-panel">
      <div class="info-tag">Precise Control & Verification</div>
      <h1 class="info-title">Customizable Multi-Engine AI Protection</h1>
      <p class="info-desc">NoSlop puts you in complete control. Adjust sensitivity thresholds, configure individual detection engines, and sync community blocklists with one click.</p>
      <div class="bullet-list">
        <div class="bullet-item"><span class="bullet-icon">✓</span> <span><strong>46,800+ Pre-bundled Channels:</strong> Instant offline protection against bot-farms.</span></div>
        <div class="bullet-item"><span class="bullet-icon">✓</span> <span><strong>Bayesian Sensitivity Dial:</strong> Choose Conservative, Balanced, or Aggressive mode.</span></div>
        <div class="bullet-item"><span class="bullet-icon">✓</span> <span><strong>Clean AdBlock Style:</strong> Zero-gap hiding removes cards without leaving whitespace.</span></div>
        <div class="bullet-item"><span class="bullet-icon">✓</span> <span><strong>Verified Creator Guard:</strong> Protects legitimate science and tech channels automatically.</span></div>
      </div>
    </div>

    <div class="popup-frame">
      <div class="p-header">
        <div class="p-brand">
          <svg width="22" height="22" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="38" fill="none" stroke="#f43f5e" stroke-width="12"/>
            <line x1="37" y1="37" x2="91" y2="91" stroke="#f43f5e" stroke-width="12" stroke-linecap="round"/>
          </svg>
          <span class="p-title">NoSlop</span>
          <span class="p-badge">v2.6</span>
        </div>
        <div style="font-size:12px;color:#10b981;font-weight:600;">Active</div>
      </div>

      <div class="p-stats">
        <div class="stat-card">
          <div class="stat-num">4</div>
          <div class="stat-lbl">Blocked on this Tab</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">142</div>
          <div class="stat-lbl">All-Time Filtered</div>
        </div>
      </div>

      <div class="p-body">
        <div class="section-label">Detection Engines</div>

        <div class="toggle-row">
          <div class="toggle-info">
            <span class="t-title">Bayesian Heuristic Scoring</span>
            <span class="t-desc">EDSA disclaimers & story tropes</span>
          </div>
          <div class="t-switch"><div class="t-knob"></div></div>
        </div>

        <div class="toggle-row">
          <div class="toggle-info">
            <span class="t-title">Verified Creator Protection</span>
            <span class="t-desc">Whitelists Neil deGrasse Tyson, etc.</span>
          </div>
          <div class="t-switch"><div class="t-knob"></div></div>
        </div>

        <div class="section-label" style="margin-top:6px;">Community Blocklist</div>
        <div class="community-box">
          <div>
            <div style="font-size:13px;font-weight:600;color:#fff;">46,876 Channels</div>
            <div style="font-size:11px;color:#94a3b8;">AiSList + Cevval + Drama Mills</div>
          </div>
          <button class="sync-btn">Sync Now</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

function renderImage(htmlContent, outputPath, width, height) {
  const tempHtml = path.join(__dirname, 'temp-render.html');
  fs.writeFileSync(tempHtml, htmlContent, 'utf8');

  const fileUri = 'file:///' + tempHtml.replace(/\\/g, '/');
  const cmd = `${edge} --headless --disable-gpu --screenshot="${outputPath}" --window-size=${width},${height} "${fileUri}"`;

  console.log(`Rendering ${path.basename(outputPath)} (${width}x${height})...`);
  execSync(cmd);

  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);

  const stats = fs.statSync(outputPath);
  console.log(`✅ Saved ${path.basename(outputPath)} (${(stats.size / 1024).toFixed(1)} KB)`);
}

renderImage(promoSmallHtml, path.join(storeAssetsDir, 'promo-small-440x280.png'), 440, 280);
renderImage(promoLargeHtml, path.join(storeAssetsDir, 'promo-large-920x680.png'), 920, 680);
renderImage(screenshot1Html, path.join(storeAssetsDir, 'screenshot-1-1280x800.png'), 1280, 800);
renderImage(screenshot2Html, path.join(storeAssetsDir, 'screenshot-2-1280x800.png'), 1280, 800);

console.log('\nAll Chrome Web Store promotional and screenshot assets generated successfully in store_assets/');
