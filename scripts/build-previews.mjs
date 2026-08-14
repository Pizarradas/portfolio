// Screenshots the three published projects that the home page used to embed.
//
//   node scripts/build-previews.mjs           capture into assets/previews/
//   node scripts/build-previews.mjs --check   capture nothing, exit 1 if one is missing
//
// Chrome's --screenshot flag only writes PNG, and a PNG of a photographic hero
// at 720×450 is several hundred KB — which would trade 2 MB of JavaScript for
// most of a megabyte of image and not be much of a win. So this drives Chrome
// over the DevTools Protocol instead and asks for WebP directly.
//
// No dependency for that: Node 22+ ships a global WebSocket, which is the whole
// of what talking to CDP requires. Same reason build-og.mjs shells out to
// Chrome rather than pulling in an image library — the browser is already on
// the machine and it is the thing that renders these pages for real.

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PREVIEWS, PREVIEW_SIZE, previewImage } from './site.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, '.tmp-previews');
const PORT = 9333;
const check = process.argv.includes('--check');

// These are motion-heavy pages: GSAP intros, scroll-driven reveals, webfonts.
// The load event fires long before any of that has settled, so the shot waits
// past it. Too short and the card ships a half-faded hero — or, on a page with
// a text scramble, a headline of garbage. Per-page override in site.config.mjs.
const SETTLE_MS = 4000;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const sleep = ms => new Promise(r => setTimeout(r, ms));

if (check) {
  const missing = PREVIEWS.filter(p => !existsSync(join(ROOT, previewImage(p.file))));
  if (missing.length) {
    console.error(`build-previews: ${missing.length} preview(s) missing — run npm run build:previews`);
    for (const m of missing) console.error(`  · ${previewImage(m.file)}`);
    process.exit(1);
  }
  console.log('build-previews: every preview present.');
  process.exit(0);
}

const chrome = CHROME_CANDIDATES.find(p => existsSync(p));
if (!chrome) throw new Error('build-previews: no Chrome found. Set CHROME_PATH.');

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(join(ROOT, 'assets', 'previews'), { recursive: true });

const proc = spawn(
  chrome,
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(TMP, 'profile')}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

/* ------------------------------------------------------------ CDP plumbing */

async function browserSocket() {
  for (let i = 0; i < 60; i++) {
    try {
      const info = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json());
      if (info.webSocketDebuggerUrl) return info.webSocketDebuggerUrl;
    } catch {
      /* not listening yet */
    }
    await sleep(250);
  }
  throw new Error('build-previews: Chrome never opened its debugging port');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws), { once: true });
    ws.addEventListener('error', () => reject(new Error('build-previews: CDP socket failed')), { once: true });
  });
}

// One socket, many in-flight commands: every message carries an id, and with
// flatten:true a command aimed at a page also carries its sessionId. Both are
// echoed back on the reply, which is all the routing this needs.
function rpc(ws) {
  let nextId = 0;
  const pending = new Map();
  const waiters = [];

  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].method === msg.method && (!waiters[i].sessionId || waiters[i].sessionId === msg.sessionId)) {
        waiters.splice(i, 1)[0].resolve(msg.params);
      }
    }
  });

  return {
    send(method, params = {}, sessionId) {
      const id = ++nextId;
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    once(method, sessionId, timeoutMs = 30000) {
      return new Promise((resolve, reject) => {
        const waiter = { method, sessionId, resolve };
        waiters.push(waiter);
        setTimeout(() => {
          const i = waiters.indexOf(waiter);
          if (i !== -1) {
            waiters.splice(i, 1);
            reject(new Error(`build-previews: timed out waiting for ${method}`));
          }
        }, timeoutMs);
      });
    },
  };
}

/* ------------------------------------------------------------------- shoot */

let ws;
try {
  ws = await connect(await browserSocket());
  const cdp = rpc(ws);

  for (const preview of PREVIEWS) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    await cdp.send('Page.enable', {}, sessionId);
    // Half device scale: the page lays out at the 1440 it was designed for and
    // the bitmap comes back at 720, which is about the width the frame shows.
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width: PREVIEW_SIZE.width, height: PREVIEW_SIZE.height, deviceScaleFactor: PREVIEW_SIZE.scale, mobile: false },
      sessionId,
    );

    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await cdp.send('Page.navigate', { url: preview.url }, sessionId);
    await loaded;
    await sleep(preview.settle ?? SETTLE_MS);

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: 82 }, sessionId);
    const bytes = Buffer.from(data, 'base64');
    writeFileSync(join(ROOT, previewImage(preview.file)), bytes);
    console.log(`build-previews: ${previewImage(preview.file)}  ${(bytes.length / 1024).toFixed(1)} KB`);

    await cdp.send('Target.closeTarget', { targetId });
  }
} finally {
  try {
    ws?.close();
  } catch {
    /* already gone */
  }
  proc.kill();
  await sleep(300);
  rmSync(TMP, { recursive: true, force: true });
}
