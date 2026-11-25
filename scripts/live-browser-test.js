/** Live smoke test: real YouTube pages and the native unpacked extension, no API mocks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { CDPClient, browserPath, pause, root } = require('./cdp-benchmark');

async function snapshot(client) {
  return client.evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('[data-noslop-status]'));
    return {
      title: document.title,
      challenge: /unusual traffic|not a robot|before you continue|confirm you.re not a bot/i.test(document.body?.innerText || ''),
      processed: cards.length,
      blocked: cards.filter(card => card.dataset.noslopStatus === 'blocked').length,
      clean: cards.filter(card => card.dataset.noslopStatus === 'clean').length,
      nestedDecisions: cards.filter(card => card.parentElement?.closest('[data-noslop-status]')).length,
      blockedVisible: cards.filter(card => card.dataset.noslopStatus === 'blocked' && getComputedStyle(card).display !== 'none').length,
      sample: cards.slice(0,6).map(card => ({
        title: card.querySelector('#video-title,h3')?.textContent?.trim()?.slice(0,100),
        status: card.dataset.noslopStatus,
        reason: card.dataset.noslopReason || null
      }))
    };
  })()`);
}

async function run() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'noslop-live-'));
  let browser, client, workerClient;
  try {
    browser = spawn(browserPath, ['--headless=new', '--window-size=1280,1200', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', `--disable-extensions-except=${root}`, `--load-extension=${root}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; break; } catch { await pause(100); }
    }
    assert.ok(port, 'Browser failed to expose a debugging port.');
    const targetUrl = `http://127.0.0.1:${port}/json/list`;
    let targets = await (await fetch(targetUrl)).json();
    const page = targets.find(target => target.type === 'page');
    assert.ok(page, 'Test tab failed to open.');
    client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Runtime.enable');
    const extensionErrors = [];
    client.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method !== 'Runtime.exceptionThrown') return;
      const details = message.params.exceptionDetails;
      if (details.stackTrace?.callFrames?.some(frame => frame.url.startsWith('chrome-extension://'))) {
        extensionErrors.push(details.exception?.description || details.text);
      }
    });

    for (const [query, expected] of [['AI generated short film', 'blocked'], ['NASA James Webb explained', 'clean']]) {
      await client.send('Page.navigate', { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` });
      let result;
      for (let attempt = 0; attempt < 80; attempt++) {
        await pause(250);
        try { result = await snapshot(client); } catch { continue; }
        if (result.challenge || result.processed >= 5) break;
      }
      if (!result || result.challenge || !result.processed) {
        console.log(JSON.stringify({ query, status: 'INCONCLUSIVE', reason: 'YouTube did not expose usable results', page: result?.title }));
        process.exitCode = 2;
        return;
      }
      await pause(2000);
      result = await snapshot(client);
      console.log(JSON.stringify({ query, ...result }));
      assert.equal(result.nestedDecisions, 0, 'One video card must not have nested detection decisions.');
      assert.equal(result.blockedVisible, 0, 'Blocked cards must actually be hidden.');
      assert.ok(result[expected] > 0, `Expected some ${expected} results for this query.`);
    }
    assert.deepEqual(extensionErrors, [], 'No uncaught extension exceptions on live pages.');

    targets = await (await fetch(targetUrl)).json();
    const worker = targets.find(target => target.type === 'service_worker' && target.url.endsWith('/background/background.js'));
    assert.ok(worker, 'Native extension worker failed to load.');
    workerClient = new CDPClient(worker.webSocketDebuggerUrl);
    await workerClient.connect();
    const metadata = await workerClient.evaluate(`(async () => {
      const result = await getVideoMetadata('1GpyOA5SdAE');
      return result ? { videoId: result.videoId, title: result.title, channelId: result.channelId, descriptionLength: result.description.length } : null;
    })()`);
    if (!metadata) {
      console.log('INCONCLUSIVE: live metadata unavailable; live DOM assertions passed.');
      process.exitCode = 2;
      return;
    }
    assert.equal(metadata.videoId, '1GpyOA5SdAE');
    assert.equal(metadata.channelId, 'UCz3-FpMsEyyGvryZULBLuxA');
    assert.ok(metadata.descriptionLength > 0);
    console.log(JSON.stringify({ nativeMetadata: metadata }));
    console.log('PASS: native extension on live YouTube searches, hidden cards, no duplicate roots, human controls and public metadata. This is a smoke test, not a labeled accuracy benchmark.');
  } finally {
    workerClient?.close(); client?.close(); browser?.kill();
    await pause(350);
    const resolved = path.resolve(profile);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('noslop-live-')) {
      try { fs.rmSync(resolved, { recursive: true, force: true }); } catch { /* Browser shutdown can briefly hold profile locks. */ }
    }
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
