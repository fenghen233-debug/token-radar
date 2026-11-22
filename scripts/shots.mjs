import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const policyFile = resolve('/tmp/hatch-policy.txt');
writeFileSync(policyFile, 'hatch-webgl-all-origins-v1\n');

mkdirSync('screenshots', { recursive: true });

const htmlUrl = `file://${resolve('out/dashboard/index.html')}`;
console.log('Target URL:', htmlUrl);

const chrome = spawn('/opt/meta-chromium/chrome', [
  '--no-sandbox',
  '--headless',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--hatch-webgl-allowed-domains-file=' + policyFile,
  '--hatch-webgl-allowed-domains-sha256=8097045f0459c96c4cdc76e3a1af4e0f43f640b4b59c43d6db35e3641c0264c6',
  '--remote-debugging-port=9333',
  '--window-size=1440,900',
  'about:blank'
], { stdio: 'ignore' });

// Give Chrome a moment to open port 9333
await new Promise((r) => setTimeout(r, 2000));

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9333/json/version');
      const data = await res.json();
      if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Failed to connect to Chrome debugging port 9333');
}

const browserWsUrl = await getWsUrl();
console.log('Connected to Chrome WebSocket:', browserWsUrl);

class CDPClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  async send(method, params = {}, sessionId) {
    await this.ready;
    const id = this.id++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    this.ws.close();
  }
}

const browserClient = new CDPClient(browserWsUrl);

// Create new target for page
const { targetId } = await browserClient.send('Target.createTarget', { url: htmlUrl });
const { sessionId } = await browserClient.send('Target.attachToTarget', { targetId, flatten: true });

// Setup page
await browserClient.send('Page.enable', {}, sessionId);
await browserClient.send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false
}, sessionId);

// Wait for page load and fonts
await new Promise((r) => setTimeout(r, 2000));

async function capture(filename) {
  const result = await browserClient.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 80,
    fromSurface: true
  }, sessionId);
  const buf = Buffer.from(result.data, 'base64');
  const path = resolve('screenshots', filename);
  writeFileSync(path, buf);
  console.log(`Saved screenshot ${path} (${(buf.length / 1024).toFixed(1)} KB)`);
  return buf.length;
}

// 1. Board view
console.log('Capturing 1-board.jpg...');
await capture('1-board.jpg');

// 2. Detail view of the top protocol
console.log('Opening detail modal for top protocol...');
await browserClient.send('Runtime.evaluate', {
  expression: `window.RADAR_APP && window.RADAR_APP.openModal(window.BOARD_DATA.rows[0].slug)`
}, sessionId);
await new Promise((r) => setTimeout(r, 1000));
console.log('Capturing 2-detail.jpg...');
await capture('2-detail.jpg');

// 3. Filtered view
console.log('Applying filter for filtered view...');
await browserClient.send('Runtime.evaluate', {
  expression: `window.RADAR_APP && (window.RADAR_APP.closeModal(), window.RADAR_APP.setFilter({ watchlistOnly: true }))`
}, sessionId);
await new Promise((r) => setTimeout(r, 1000));
console.log('Capturing 3-filtered.jpg...');
await capture('3-filtered.jpg');

browserClient.close();
chrome.kill();
console.log('Screenshots completed successfully.');
