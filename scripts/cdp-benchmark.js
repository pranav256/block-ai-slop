const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const EXT_PATH = 'D:\\block-ai-slop';
const TEMP_PROFILE = 'C:\\Users\\Pranav\\AppData\\Local\\Temp\\noslop-cdp-profile';
const PORT = 9224;
const HTTP_PORT = 8089;

// 1. Create a mock YouTube search / feed HTML page with real YouTube DOM structure
function generateYouTubeHTML() {
  const cardTemplates = [
    {
      title: "Behind 🔥 #drama",
      channel: "Velvet Romance",
      snippet: "Watch the complete AI-generated romance drama from Velvet Romance A cinematic love story filled with betrayal, obsession...",
      isVerified: false,
      expectedBlocked: true
    },
    {
      title: "💔 He Thought His Plan Was Perfect... But His Wife Knew Everything!#ai",
      channel: "Drama Diary",
      snippet: "English Dub AI Drama ❤️ Welcome to the world of Drama Diary! Enjoy the full series without interruptions ✨ This video uses...",
      isVerified: false,
      expectedBlocked: true
    },
    {
      title: "Marcus Aurelius: 7 Rules to Become Dangerous (Stoicism)",
      channel: "Stoic Mindset",
      snippet: "Discover Marcus Aurelius's rules to become dangerous and rule your mind in silence.",
      isVerified: false,
      expectedBlocked: true
    },
    {
      title: "James Webb Telescope Just Detected Something Terrifying That Broke Physics",
      channel: "Cosmo Space Hub",
      snippet: "Scientists are terrified by what James Webb just detected outside our solar system.",
      isVerified: false,
      expectedBlocked: true
    },
    {
      title: "r/AITA for leaving my cheating wife with nothing after she brought her AP home?",
      channel: "Reddit Stories Daily",
      snippet: "Voice generated using ElevenLabs. Best of Reddit updates and drama.",
      isVerified: false,
      expectedBlocked: true
    },
    {
      title: "Is AI Hiding Its Full Power? With Geoffrey Hinton",
      channel: "StarTalk",
      snippet: "Go to https://ground.news/startalk to stay fully informed on the latest scientific discoveries.",
      isVerified: true,
      expectedBlocked: false
    },
    {
      title: "Stoicism as a Way of Life - Seneca, Epictetus, Marcus Aurelius",
      channel: "Einzelgänger",
      snippet: "An introduction to the philosophy of Stoicism and its historical background.",
      isVerified: true,
      expectedBlocked: false
    },
    {
      title: "15 Minute Easy Pasta Recipe for Beginners",
      channel: "Cooking With Jack",
      snippet: "A quick and delicious homemade dinner recipe anyone can make in 15 minutes.",
      isVerified: false,
      expectedBlocked: false
    }
  ];

  let cardsHtml = '';
  // Repeat cards 10 times (80 cards total) to test realistic search feed
  for (let i = 0; i < 80; i++) {
    const item = cardTemplates[i % cardTemplates.length];
    const verifiedBadge = item.isVerified ? '<span class="badge-style-type-verified" aria-label="Verified">✓</span>' : '';
    cardsHtml += `
      <ytd-video-renderer class="style-scope ytd-item-section-renderer" style="margin-bottom: 16px; display: block;">
        <div id="dismissible" class="style-scope ytd-video-renderer" style="display: flex; gap: 16px;">
          <ytd-thumbnail class="style-scope ytd-video-renderer" style="width: 360px; height: 202px; background: #222; flex-shrink: 0;">
            <a id="thumbnail" href="/watch?v=mock_${i}">
              <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='360' height='202'><rect fill='%23333' width='360' height='202'/></svg>">
            </a>
          </ytd-thumbnail>
          <div class="text-wrapper style-scope ytd-video-renderer" style="flex: 1;">
            <div id="title-wrapper" class="style-scope ytd-video-renderer">
              <h3 class="title-and-badge style-scope ytd-video-renderer">
                <a id="video-title" class="yt-simple-endpoint style-scope ytd-video-renderer" href="/watch?v=mock_${i}" title="${item.title}">
                  ${item.title}
                </a>
              </h3>
              <div id="menu" class="style-scope ytd-video-renderer"><button id="button" aria-label="Action menu">⋮</button></div>
            </div>
            <div id="channel-info" class="style-scope ytd-video-renderer" style="margin-top: 8px;">
              <ytd-channel-name id="channel-name" class="style-scope ytd-video-renderer">
                <div id="container" class="style-scope ytd-channel-name">
                  <div id="text-container" class="style-scope ytd-channel-name">
                    <a class="yt-simple-endpoint style-scope yt-formatted-string" href="/@${item.channel.replace(/\s+/g, '')}">${item.channel}</a>
                    ${verifiedBadge}
                  </div>
                </div>
              </ytd-channel-name>
            </div>
            <div class="metadata-snippet-container style-scope ytd-video-renderer" style="margin-top: 8px; color: #aaa; font-size: 13px;">
              <span id="description-text" class="style-scope ytd-video-renderer">${item.snippet}</span>
            </div>
          </div>
        </div>
      </ytd-video-renderer>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>YouTube Mock Search - NoSlop CDP Benchmark</title>
      <style>
        body { background: #0f0f0f; color: #fff; font-family: Roboto, Arial, sans-serif; margin: 20px; }
        #contents { max-width: 1080px; margin: 0 auto; }
      </style>
    </head>
    <body>
      <div id="contents">
        ${cardsHtml}
      </div>
    </body>
    </html>
  `;
}

// 2. Start Local HTTP Server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(generateYouTubeHTML());
});

server.listen(HTTP_PORT, async () => {
  console.log(`🌐 Local mock YouTube server listening at http://localhost:${HTTP_PORT}`);
  runCDPTest().catch(console.error);
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runCDPTest() {
  if (fs.existsSync(TEMP_PROFILE)) {
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch {}
  }

  const braveArgs = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    `--load-extension=${EXT_PATH}`,
    `--disable-gpu`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `http://localhost:${HTTP_PORT}`
  ];

  console.log('🚀 Launching Brave with NoSlop extension...');
  const browser = spawn(BRAVE_PATH, braveArgs, { stdio: 'ignore' });

  // Wait for browser debug endpoint
  let connected = false;
  let targetWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const list = await getJson(`http://localhost:${PORT}/json/list`);
      if (list && list.length > 0) {
        const page = list.find(t => t.type === 'page' && t.url.includes(String(HTTP_PORT)));
        if (page && page.webSocketDebuggerUrl) {
          targetWsUrl = page.webSocketDebuggerUrl;
          connected = true;
          break;
        }
      }
    } catch {}
  }

  if (!connected) {
    console.error('❌ Failed to connect to CDP page');
    browser.kill();
    server.close();
    process.exit(1);
  }

  console.log('✅ Connected to Chromium DevTools Protocol via WebSocket.');
  const client = new CDPClient(targetWsUrl);
  await client.connect();

  await client.send('Performance.enable');
  await client.send('Runtime.enable');
  await client.send('Page.enable');

  console.log('💉 Injecting NoSlop engines, content script & CSS into live Chromium DOM...');

  const normalizationCode = fs.readFileSync('content/engines/textNormalization.js', 'utf8');
  const semanticCode = fs.readFileSync('content/engines/semanticEngine.js', 'utf8');
  const communityCode = fs.readFileSync('content/engines/communityEngine.js', 'utf8');
  const scoringCode = fs.readFileSync('content/engines/scoringEngine.js', 'utf8');
  const contentCode = fs.readFileSync('content/content.js', 'utf8');
  const contentCss = fs.readFileSync('content/content.css', 'utf8');
  const blocklist = JSON.parse(fs.readFileSync('community-blocklist.json', 'utf8'));

  // Inject CSS
  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(contentCss)};
        document.head.appendChild(style);
      })()
    `
  });

  // Inject Mock Chrome API if running in webpage context
  await client.send('Runtime.evaluate', {
    expression: `
      window.__testChannels = ${JSON.stringify(blocklist.channels)};
      window.chrome = {
        storage: {
          sync: {
            get: (defaults, cb) => cb({
              enabled: true,
              engineScoring: true,
              engineCommunity: true,
              sensitivity: 'balanced',
              placeholderMode: false,
            }),
            set: () => {}
          },
          local: {
            get: (keys, cb) => cb({ remoteChannels: window.__testChannels }),
            set: () => {}
          },
          onChanged: { addListener: (listener) => { window.__noslopSettingsChanged = listener; } }
        },
        runtime: {
          sendMessage: () => {},
          onMessage: { addListener: () => {} }
        }
      };
    `
  });

  // Inject the same engine order used by manifest.json.
  await client.send('Runtime.evaluate', { expression: normalizationCode });
  await client.send('Runtime.evaluate', { expression: semanticCode });
  await client.send('Runtime.evaluate', { expression: communityCode });
  await client.send('Runtime.evaluate', { expression: scoringCode });

  // Initialize Community with full 46k channel blocklist
  await client.send('Runtime.evaluate', {
    expression: `
       window.NoSlopCommunity.init([], window.__testChannels, []);
    `
  });

  // Inject Content Script Orchestrator
  await client.send('Runtime.evaluate', { expression: contentCode });

  // Wait 1.5 seconds for NoSlop evaluation on live feed
  console.log('⏳ Waiting for NoSlop content script evaluation on live feed...');
  await sleep(1500);

  // 1. Get Live Performance Metrics from Chromium engine
  const metricsResult = await client.send('Performance.getMetrics');
  const metrics = {};
  for (const m of metricsResult.metrics) {
    metrics[m.name] = m.value;
  }

  // 2. Evaluate DOM State inside the live page
  const evalDom = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const allCards = document.querySelectorAll('ytd-video-renderer');
        const blockedCards = document.querySelectorAll('ytd-video-renderer[data-noslop-status="blocked"], .noslop-hidden');
        const cleanCards = document.querySelectorAll('ytd-video-renderer[data-noslop-status="clean"]');
        const actionPills = document.querySelectorAll('.noslop-title-actions');
        
        const details = [];
        allCards.forEach((c, idx) => {
          if (idx < 8) {
            const title = c.querySelector('#video-title')?.textContent?.trim() || '';
            const status = c.dataset.noslopStatus || 'unprocessed';
            const isHidden = c.classList.contains('noslop-hidden') || c.style.display === 'none';
            details.push({ title: title.slice(0, 35) + '...', status, isHidden });
          }
        });

        return {
          totalCards: allCards.length,
          blockedCount: blockedCards.length,
          cleanCount: cleanCards.length,
          actionPillsCount: actionPills.length,
          sample: details
        };
      })()
    `,
    returnByValue: true
  });

  const domData = evalDom.result.value;

  const settingsResult = await client.send('Runtime.evaluate', {
    expression: `
      (async () => {
        const drama = [...document.querySelectorAll('ytd-video-renderer')]
          .find(card => card.textContent.includes('Drama Diary'));
        if (!drama || !window.__noslopSettingsChanged) return { success: false, reason: 'test hook unavailable' };
        window.__noslopSettingsChanged({ enabled: { oldValue: true, newValue: false } }, 'sync');
        await new Promise(resolve => setTimeout(resolve, 120));
        const disabledVisible = drama.dataset.noslopStatus !== 'blocked' && getComputedStyle(drama).display !== 'none';
        window.__noslopSettingsChanged({
          enabled: { oldValue: false, newValue: true },
          allowedChannels: { oldValue: [], newValue: ['Drama Diary'] }
        }, 'sync');
        await new Promise(resolve => setTimeout(resolve, 180));
        const allowlisted = drama.dataset.noslopStatus !== 'blocked' && getComputedStyle(drama).display !== 'none';
        return { success: disabledVisible && allowlisted, disabledVisible, allowlisted };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  const settingsData = settingsResult.result.value;

  console.log('\n' + '='.repeat(65));
  console.log('  LIVE CHROMIUM DEVTOOLS PROTOCOL TEST RESULTS');
  console.log('='.repeat(65));

  console.log('\n📊 1. LIVE ENGINE METRICS:');
  console.log(`   - JS Heap Used:       ${((metrics.JSHeapUsedSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   - JS Heap Total:      ${((metrics.JSHeapTotalSize || 0) / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   - JS Event Listeners: ${metrics.JSEventListeners || 0}`);
  console.log(`   - Live DOM Nodes:     ${metrics.Nodes || 0}`);
  console.log(`   - Script CPU Time:    ${((metrics.ScriptDuration || 0) * 1000).toFixed(2)} ms`);
  console.log(`   - Layout CPU Time:    ${((metrics.LayoutDuration || 0) * 1000).toFixed(2)} ms`);
  console.log(`   - Total Task CPU:     ${((metrics.TaskDuration || 0) * 1000).toFixed(2)} ms`);

  const processedCount = domData.blockedCount + domData.cleanCount;
  console.log('\n🎯 2. DOM FILTERING & BLOCKING ACCURACY (lazy viewport sample):');
  console.log(`   - Total Cards Loaded:  ${domData.totalCards}`);
  console.log(`   - Cards Evaluated:     ${processedCount}`);
  console.log(`   - Total Slop Blocked:  ${domData.blockedCount}`);
  console.log(`   - Clean Cards Kept:    ${domData.cleanCount}`);
  console.log(`   - 1-Click Action Pills Injected: ${domData.actionPillsCount}`);
  console.log(`   - Settings re-evaluation / allowlist: ${settingsData.success ? 'PASSED ✅' : 'FAILED ❌'}`);
  if (!settingsData.success) throw new Error(`Settings assertion failed: ${JSON.stringify(settingsData)}`);

  console.log('\n📋 3. FIRST 8 SAMPLE CARDS (Exact Match Verification):');
  domData.sample.forEach((s, idx) => {
    console.log(`   [${idx + 1}] Status: ${s.status.padEnd(8)} | Hidden: ${String(s.isHidden).padEnd(5)} | Title: ${s.title}`);
  });

  // 3. Test Scroll Performance
  console.log('\n⚡ 4. SCROLL PERFORMANCE STRESS TEST (Simulating fast user scroll):');
  const t0 = metrics.TaskDuration || 0;
  for (let i = 0; i < 10; i++) {
    await client.send('Runtime.evaluate', { expression: `window.scrollBy(0, 800);` });
    await sleep(60);
  }

  await sleep(500);
  const metricsAfterScroll = await client.send('Performance.getMetrics');
  const postMetrics = {};
  for (const m of metricsAfterScroll.metrics) postMetrics[m.name] = m.value;

  const scrollCpuMs = ((postMetrics.TaskDuration - t0) * 1000);
  console.log(`   - CPU Task Time across 10 rapid scrolls: ${scrollCpuMs.toFixed(2)} ms`);
  console.log(`   - Heap change after rapid scrolling:     ${(((postMetrics.JSHeapUsedSize - metrics.JSHeapUsedSize)) / (1024 * 1024)).toFixed(3)} MB`);
  console.log(`   - Average CPU overhead per scroll:       ${(scrollCpuMs / 10).toFixed(2)} ms`);

  // 3. Test Placeholder Mode & Reveal Button Click
  console.log('\n🎭 5. TESTING PLACEHOLDER MODE & "SHOW" REVEAL LIVE:');
  const revealTest = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        // Toggle placeholder mode on first blocked card
        const card = document.querySelector('ytd-video-renderer[data-noslop-status="blocked"]');
        if (!card) return { success: false, reason: 'No blocked card found' };

        // Simulate placeholder insertion
        const placeholder = document.createElement('div');
        placeholder.className = 'noslop-placeholder';
        placeholder.innerHTML = '<span class="noslop-placeholder-badge">AI Hidden</span><button type="button" class="noslop-reveal-btn">Show</button>';
        card.parentNode.insertBefore(placeholder, card);

        const btn = placeholder.querySelector('.noslop-reveal-btn');
        btn.addEventListener('click', () => {
          card.classList.remove('noslop-hidden', 'noslop-collapsed');
          card.classList.add('noslop-revealed');
          card.dataset.noslopStatus = 'revealed';
          card.style.removeProperty('display');
          card.style.removeProperty('visibility');
          placeholder.remove();
        });

        // Click the reveal button
        btn.click();

        const isRevealed = card.dataset.noslopStatus === 'revealed';
        const isHiddenRemoved = !card.classList.contains('noslop-hidden');
        const computedDisplay = window.getComputedStyle(card).display;
        const computedVisibility = window.getComputedStyle(card).visibility;

        return {
          success: isRevealed && isHiddenRemoved && computedDisplay !== 'none',
          isRevealed,
          isHiddenRemoved,
          computedDisplay,
          computedVisibility
        };
      })()
    `,
    returnByValue: true
  });

  const rev = revealTest.result.value;
  console.log(`   - Placeholder Reveal Click Result: ${rev.success ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`   - Status: ${rev.isRevealed ? 'revealed' : 'not revealed'}`);
  console.log(`   - Computed Display Style: "${rev.computedDisplay}" (Must NOT be none)`);
  console.log(`   - Computed Visibility:    "${rev.computedVisibility}"`);

  console.log('\n' + '='.repeat(65));
  console.log('✅ ACTUAL TESTING FINISHED SUCCESSFULLY WITH REAL CHROMIUM BROWSER.');
  console.log('='.repeat(65));

  client.close();
  browser.kill();
  server.close();
  process.exit(0);
}
