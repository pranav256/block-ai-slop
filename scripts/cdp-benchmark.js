/** Real Chromium DOM regressions; Chrome APIs are mocked, engines are unmodified. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const browserPath = process.env.NOSLOP_BROWSER || [
  'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'
].find(file => fs.existsSync(file));
assert.ok(browserPath, 'Set NOSLOP_BROWSER to an installed Chromium browser.');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

class CDPClient {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); }
  async connect() {
    await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = event => {
      const message = JSON.parse(event.data);
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    };
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      this.pending.set(id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  close() { for (const request of this.pending.values()) clearTimeout(request.timeout); this.ws.close(); }
}

async function run() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'noslop-cdp-'));
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><html><head><title>NoSlop DOM regression fixture</title></head><body><main></main></body></html>');
  });
  let browser, client;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    browser = spawn(browserPath, ['--headless=new', '--window-size=1280,1600', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', `--disable-extensions-except=${root}`, `--load-extension=${root}`, url], { windowsHide: true, stdio: 'ignore' });
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; } catch { await pause(100); }
    }
    assert.ok(port, 'Browser did not expose a debugging port.');
    let targets = [];
    for (let attempt = 0; attempt < 50; attempt++) {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (targets.some(target => target.url.startsWith(url))) break;
      await pause(100);
    }
    const target = targets.find(target => target.url.startsWith(url));
    assert.ok(target, 'Fixture tab did not open.');
    client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Runtime.enable');
    await client.send('Performance.enable');
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await client.evaluate("Boolean(document.querySelector('main'))")) break;
      await pause(100);
    }
    const css = fs.readFileSync(path.join(root, 'content/content.css'), 'utf8');
    await client.evaluate(`(() => {
      const style = document.createElement('style'); style.textContent = ${JSON.stringify(css)}; document.head.append(style);
      window.testMetadata = {}; window.metadataCalls = []; window.sentMessages = [];
      window.changeSettings = null;
      window.chrome = {
        runtime: { lastError: null, onMessage: { addListener() {} }, sendMessage(message, callback) {
          sentMessages.push(message);
          if (message.action === 'getVideoMetadata') { metadataCalls.push(message.videoId); setTimeout(() => callback(testMetadata[message.videoId] || null), 60); }
        } },
        storage: {
          sync: { get(keys, callback) { callback({ sensitivity: 'balanced' }); }, set() {} },
          local: { get(keys, callback) { callback({ remoteChannels: ['UCabcdefghijklmnopqrstuv'] }); }, set() {} },
          onChanged: { addListener(listener) { window.changeSettings = listener; } }
        }
      };
      window.addCard = (id, title, options = {}) => {
        const card = document.createElement(options.tag || 'ytd-video-renderer'); card.id = id;
        if (options.className) card.className = options.className;
        card.style.cssText = 'display:block;min-height:70px;margin:8px';
        card.innerHTML = '<h3><a id="video-title"></a></h3><ytd-channel-name><a href="/@fixture">Fixture Human</a></ytd-channel-name><div id="description-text"></div><div id="menu"></div>';
        const link = card.querySelector('#video-title'); link.textContent = title; link.setAttribute('aria-label', title + ' by Fixture Human 10K views'); link.href = '/watch?v=' + (options.videoId || id.padEnd(11, '0').slice(0,11));
        card.querySelector('#description-text').textContent = options.snippet || '';
        if (options.verified) { const badge = document.createElement('span'); badge.setAttribute('aria-label', 'Verified'); card.append(badge); }
        if (options.badge) { const badge = document.createElement('button'); badge.setAttribute('aria-label', options.badge); card.append(badge); }
        (options.parent || document.querySelector('main')).append(card);
        return card;
      };
      window.waitFor = async (predicate, label) => {
        for (let attempt = 0; attempt < 200; attempt++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
        throw new Error('Timed out: ' + label);
      };
      window.cardStatus = id => document.getElementById(id).dataset.noslopStatus;
      window.visible = id => getComputedStyle(document.getElementById(id)).display !== 'none';
      addCard('bad', 'An AI-generated animal adventure');
      addCard('human', 'How AI-generated scams work: a researcher explains');
      addCard('native', 'A generated city', { badge: 'AI content' });
      addCard('camera', 'A walk in the forest', { badge: 'How this content was made' });
      testMetadata.deep0000001 = { videoId: 'deep0000001', title: 'Sunset', description: 'All visuals generated using Kling.', channelName: 'Unseen Studio' };
      addCard('deep', 'Sunset', { videoId: 'deep0000001' });
      testMetadata.id000000001 = { videoId: 'id000000001', title: 'A new story', channelId: 'UCabcdefghijklmnopqrstuv', channelName: 'Unseen Handle' };
      addCard('channelid', 'A new story', { videoId: 'id000000001' });
      addCard('verified', 'An AI-generated song', { verified: true });
      const wrapper = document.createElement('ytd-rich-item-renderer'); wrapper.id = 'shelf-wrapper';
      const shelf = document.createElement('grid-shelf-view-model'); shelf.id = 'shelf'; wrapper.append(shelf); document.querySelector('main').append(wrapper);
      for (const [id, title] of [['shortbad', 'Made with AI #aivideo'], ['shortgood', 'My cat playing with a toy']]) {
        const cell = document.createElement('div'); cell.id = id; cell.className = 'ytGridShelfViewModelGridShelfItem'; shelf.append(cell);
        const short = addCard(id + '-v2', title, { tag: 'ytm-shorts-lockup-view-model-v2', parent: cell });
        short.querySelector('#video-title').href = '/shorts/' + id.padEnd(11, '0');
        const inner = document.createElement('ytm-shorts-lockup-view-model');
        while (short.firstChild) inner.append(short.firstChild);
        short.append(inner);
      }
      addCard('modern', 'Generated fantasy #aianimation', { tag: 'div', className: 'yt-lockup-view-model' });
      const nested = addCard('nested', 'Generated underwater world #aivideo', { tag: 'yt-lockup-view-model' });
      const inner = document.createElement('div'); inner.className = 'yt-lockup-view-model';
      while (nested.firstChild) inner.append(nested.firstChild);
      nested.append(inner);
      const legacy = document.createElement('ytd-reel-shelf-renderer'); legacy.id = 'legacy-shelf'; document.querySelector('main').append(legacy);
      addCard('legacy-short', 'An AI-generated animation', { tag: 'ytd-reel-item-renderer', parent: legacy });
    })()`);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    for (const file of manifest.content_scripts[0].js) await client.evaluate(fs.readFileSync(path.join(root, file), 'utf8'));
    const initial = await client.evaluate(`(async () => {
      await waitFor(() => cardStatus('bad') === 'blocked' && cardStatus('deep') === 'blocked' && cardStatus('channelid') === 'blocked', 'initial and metadata blocks');
      await waitFor(() => cardStatus('shortgood') === 'clean' && cardStatus('camera') === 'clean' && cardStatus('nested') === 'blocked' && cardStatus('legacy-short') === 'blocked', 'human controls and nested wrappers');
      if (document.querySelector('#nested .yt-lockup-view-model').dataset.noslopStatus) throw new Error('Nested lockup was processed twice');
      for (const id of ['shortbad', 'shortgood']) {
        if (document.querySelector('#' + id + ' [data-noslop-status]')) throw new Error('Nested Shorts were processed more than once');
      }
      return Object.fromEntries(['bad','human','native','camera','deep','channelid','verified','shortbad','shortgood','modern','nested'].map(id => [id, { status: cardStatus(id), visible: visible(id) }]));
    })()`);
    for (const id of ['bad', 'native', 'deep', 'channelid', 'verified', 'shortbad', 'modern','nested']) assert.deepEqual(initial[id], { status: 'blocked', visible: false }, id);
    for (const id of ['human', 'camera', 'shortgood']) assert.deepEqual(initial[id], { status: 'clean', visible: true }, id);
    assert.equal(await client.evaluate(`visible('shelf') && visible('shelf-wrapper') && visible('legacy-shelf')`), true, 'A blocked Short must not hide its shelf.');
    console.log('PASS: desktop, modern lockups, Shorts, shelves, native labels, full descriptions and channel IDs.');

    const dynamic = await client.evaluate(`(async () => {
      const human = document.getElementById('human');
      human.querySelector('#video-title').firstChild.nodeValue = 'A freshly AI-generated movie';
      await waitFor(() => cardStatus('human') === 'blocked', 'text-only hydration');
      human.querySelector('#video-title').textContent = 'My bicycle repair guide';
      human.querySelector('#video-title').href = '/watch?v=humannew001';
      await waitFor(() => cardStatus('human') === 'clean' && visible('human'), 'blocked node reused for a human video');
      if (human.style.minHeight !== '70px' || human.style.margin !== '8px') throw new Error('Native card styles were lost');
      const signature = human.dataset.noslopSig;
      changeSettings({ stats: { newValue: { totalBlocked: 123 } } }, 'local');
      await new Promise(resolve => setTimeout(resolve, 250));
      if (human.dataset.noslopSig !== signature) throw new Error('Stats updates invalidated detection');
      changeSettings({ enabled: { newValue: false } }, 'sync');
      await waitFor(() => visible('bad'), 'disabled restores cards');
      await new Promise(resolve => setTimeout(resolve, 250));
      if (!visible('bad')) throw new Error('A stale request blocked while disabled');
      changeSettings({ enabled: { newValue: true }, placeholderMode: { newValue: true } }, 'sync');
      await waitFor(() => cardStatus('bad') === 'blocked' && document.getElementById('bad').previousElementSibling?.classList.contains('noslop-placeholder'), 'real placeholder');
      document.getElementById('bad').previousElementSibling.querySelector('button').click();
      if (!visible('bad') || cardStatus('bad') !== 'revealed') throw new Error('Real Show button failed');
      const badLink = document.getElementById('bad').querySelector('#video-title');
      badLink.href = '/watch?v=newbad00001'; badLink.textContent = 'A different AI-generated movie';
      await waitFor(() => cardStatus('bad') === 'blocked', 'recycled revealed card must be checked');
      changeSettings({ allowedChannels: { newValue: ['@fixture'] } }, 'sync');
      await waitFor(() => visible('bad') && visible('native'), 'allow entry overrides every block signal');
      changeSettings({ allowedChannels: { newValue: [] }, placeholderMode: { newValue: false } }, 'sync');
      await waitFor(() => cardStatus('bad') === 'blocked', 'removing allow entry rechecks');
      testMetadata.allow000001 = { videoId: 'allow000001', title: 'An AI-generated short film', channelId: 'UCabcdefghijklmnopqrstuv', channelName: 'Trusted ID' };
      changeSettings({ allowedChannels: { newValue: ['@other', 'UCabcdefghijklmnopqrstuv'] } }, 'sync');
      addCard('idallow', 'An AI-generated short film', { videoId: 'allow000001' });
      await waitFor(() => cardStatus('idallow') === 'clean', 'resolved ID allow entry overrides title and community blocks');
      changeSettings({ allowedChannels: { newValue: [] } }, 'sync');
      await waitFor(() => cardStatus('idallow') === 'blocked', 'removing ID allow entry rechecks');
      return true;
    })()`);
    assert.equal(dynamic, true);
    console.log('PASS: hydration, recycled nodes, stats isolation, disable, real reveal and allow overrides.');

    const lazy = await client.evaluate(`(async () => {
      const spacer = document.createElement('div'); spacer.style.height = '6000px'; document.querySelector('main').append(spacer);
      const card = addCard('offscreen', 'A bicycle repair lesson');
      card.scrollIntoView(); await waitFor(() => cardStatus('offscreen') === 'clean', 'first offscreen visit');
      window.scrollTo(0, 0); await new Promise(resolve => setTimeout(resolve, 200));
      card.querySelector('#video-title').textContent = 'AI-generated horror story';
      card.querySelector('#video-title').href = '/watch?v=changed0001';
      await new Promise(resolve => setTimeout(resolve, 250));
      card.scrollIntoView(); await waitFor(() => cardStatus('offscreen') === 'blocked', 'offscreen recycled card observed again');
      return true;
    })()`);
    assert.equal(lazy, true);
    const metrics = await client.send('Performance.getMetrics');
    const heap = metrics.metrics.find(metric => metric.name === 'JSHeapUsedSize').value / 1024 / 1024;
    console.log(`PASS: lazy scrolling and re-observation. Fixture heap: ${heap.toFixed(2)} MB.`);
    console.log('Chromium DOM regressions passed. Network and Chrome APIs were mocked; this is not a live-feed accuracy measurement.');
    const nativeTargets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const worker = nativeTargets.find(item => item.type === 'service_worker' && item.url.endsWith('/background/background.js'));
    assert.ok(worker, 'The unpacked extension service worker must load.');
    const workerClient = new CDPClient(worker.webSocketDebuggerUrl);
    try {
      await workerClient.connect();
      assert.equal(await workerClient.evaluate('typeof getVideoMetadata'), 'function', 'Native service worker includes metadata lookup');
    } finally { workerClient.close(); }
    await client.send('Page.navigate', { url: worker.url.replace('/background/background.js', '/popup/popup.html') });
    let popup;
    for (let attempt = 0; attempt < 100; attempt++) {
      popup = await client.evaluate(`(() => { const brand = document.querySelector('.brand-name'); return brand ? { brand: brand.textContent, enabled: document.querySelector('#masterToggle').checked, entries: document.querySelector('#communityCountBadge').textContent } : null; })()`);
      if (popup?.entries !== '0 Entries') break;
      await pause(100);
    }
    assert.equal(popup?.brand, 'NoSlop 5.1');
    assert.equal(popup?.enabled, true);
    assert.ok(/46,884 Entries/.test(popup?.entries), 'Native popup loads bundled blocklist through Chrome storage');
    if (process.argv.includes('--screenshot')) {
      const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      const imagePath = path.join(os.tmpdir(), `noslop-popup-${Date.now()}.png`);
      fs.writeFileSync(imagePath, Buffer.from(shot.data, 'base64'));
      console.log(`Popup screenshot: ${imagePath}`);
    }
    console.log('PASS: native unpacked extension service worker, popup and Chrome storage.');
  } finally {
    client?.close(); browser?.kill(); server.close();
    await pause(300);
    const resolved = path.resolve(profile);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('noslop-cdp-')) {
      try { fs.rmSync(resolved, { recursive: true, force: true }); } catch { /* The browser may still hold a temporary profile lock. */ }
    }
  }
}
module.exports = { CDPClient, browserPath, pause, root };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
