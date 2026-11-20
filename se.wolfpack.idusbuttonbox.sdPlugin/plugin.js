// Idus Button Box · v1.0.1 · build 2026-11-19
// Stream Deck keys as joystick buttons: the plugin creates a virtual joystick, "Idus Button Box",
// with 32 buttons, and each key presses one of them. Games see an ordinary joystick — under
// Wine/Proton too — so you bind the keys in Star Citizen, DCS, Elite … like any button box, with no
// keyboard shortcuts in the way. A second key type, JOY · Status, shows whether the joystick is
// ready and which buttons are held. OpenDeck on Linux; the joystick through lib/joy.py (/dev/uinput).
// Zero npm dependencies.
"use strict";

const APP_VERSION = "1.0.1";
const BUILD = "2026-11-19.4"; // shown in the settings panel and the OpenDeck log — tells which copy runs
const sdk = require("./lib/sdk");
const K = require("./lib/keys");
const { joy, checks, REASONS, COUNT } = require("./lib/joystick");

const ACTION = "se.wolfpack.idusbuttonbox.button";
const STATUS = "se.wolfpack.idusbuttonbox.status";
const TAP_MS = 90;            // a tap holds the button this long — enough for every game to see it
const FLASH_MS = 160;         // a tap lights the key at least this long, so you see it
const HOLD_MAX_MS = Number(process.env.IDUS_BB_HOLD_MAX_MS) || 60000; // a key held longer is let go (a lost key-up never sticks)

const keys = new Map();        // context → { action, settings, held: n|0, holdTimer, flashUntil, failUntil }
const holders = new Map();     // button n → Set of contexts holding it (two keys may share a number)
const inspected = new Set();   // contexts whose settings panel is open
let assigned = {};             // context → button n, for every key ever seen (OpenDeck global settings)
let globalsLoaded = false;
const pending = new Set();     // keys waiting for a number until the global settings arrive

// ---- settings --------------------------------------------------------------------------------
const int = (v, d) => { const x = parseInt(v, 10); return Number.isFinite(x) ? x : d; };
function cfgOf(settings) {
  const s = settings || {};
  const n = int(s.button, 0);
  return {
    n: n >= 1 && n <= COUNT ? n : 0,
    mode: s.mode === "tap" ? "tap" : "hold",
    label: String(s.label || "").slice(0, 32),
    image: K.okPicture(s.image) ? s.image : "",
  };
}
const isStatus = (k) => !!k && k.action === STATUS;

// Numbers in use: by keys seen this session and by keys remembered in the global settings
function used(except) {
  const m = new Map();
  const add = (ctx, n) => { if (ctx !== except && n >= 1 && n <= COUNT) m.set(n, (m.get(n) || 0) + 1); };
  const seen = new Set();
  for (const [ctx, k] of keys) { if (!isStatus(k)) add(ctx, cfgOf(k.settings).n); seen.add(ctx); }
  for (const [ctx, n] of Object.entries(assigned)) if (!seen.has(ctx)) add(ctx, n);
  return m;
}
const nextFree = () => { const u = used(); for (let n = 1; n <= COUNT; n++) if (!u.has(n)) return n; return 1; };

// Saved only once OpenDeck's copy has been read — saving earlier would overwrite numbers that keys
// on other pages have
function remember(ctx, n) {
  if (!n || assigned[ctx] === n) return;
  assigned[ctx] = n;
  if (globalsLoaded) sdk.setGlobalSettings({ assigned });
}
function globalsReady() {
  if (globalsLoaded) return;
  globalsLoaded = true;
  sdk.setGlobalSettings({ assigned });
  assignPending();
}

// A new key without a number gets the lowest free one (saved on the key, so it stays)
function assign(ctx) {
  const k = keys.get(ctx);
  if (!k || isStatus(k) || cfgOf(k.settings).n) return;
  const n = nextFree();
  k.settings = { ...k.settings, button: String(n) };
  sdk.setSettings(ctx, k.settings);
  remember(ctx, n);
  draw(ctx);
  sendInfo(ctx);
}
function assignPending() { for (const ctx of pending) assign(ctx); pending.clear(); }

// ---- pressing --------------------------------------------------------------------------------
function hold(ctx, n) {
  let s = holders.get(n);
  if (!s) holders.set(n, (s = new Set()));
  s.add(ctx);
  joy.press(n);
}
function unhold(ctx, n) {
  const s = holders.get(n);
  if (!s) return;
  s.delete(ctx);
  if (!s.size) { holders.delete(n); joy.release(n); }
}

function letGo(ctx) {
  const k = keys.get(ctx);
  if (!k || !k.held) return;
  clearTimeout(k.holdTimer); k.holdTimer = null;
  const n = k.held; k.held = 0;
  unhold(ctx, n);
}

// inMulti: part of a multi action — the key-up follows at once, so it is always a tap there
function keyDown(ctx, inMulti = false) {
  const k = keys.get(ctx);
  if (!k) return;
  if (isStatus(k)) {               // the status key: try again when there is no joystick
    if (joy.state === "error") { joy.retry(); sdk.log("Button Box: trying the joystick again (status key)"); }
    else if (joy.ready) sdk.showOk(ctx);
    return;
  }
  const c = cfgOf(k.settings);
  if (inMulti) c.mode = "tap";
  if (!c.n) { assign(ctx); return; }
  if (!joy.ready) {
    k.failUntil = Date.now() + 4000;
    draw(ctx);
    setTimeout(() => draw(ctx), 4100);
    return;
  }
  if (c.mode === "tap") {
    const tapCtx = `${ctx}#tap${Date.now()}`;
    hold(tapCtx, c.n);
    setTimeout(() => unhold(tapCtx, c.n), TAP_MS);
    k.flashUntil = Date.now() + FLASH_MS;
    setTimeout(() => draw(ctx), FLASH_MS + 10);
  } else {
    letGo(ctx);
    k.held = c.n;
    hold(ctx, c.n);
    k.holdTimer = setTimeout(() => { sdk.log(`Button Box: button ${c.n} held over ${HOLD_MAX_MS / 1000} s — let go`); letGo(ctx); }, HOLD_MAX_MS);
  }
  draw(ctx);
}

function keyUp(ctx) {
  const k = keys.get(ctx);
  if (!k) return;
  if (k.held) letGo(ctx);
  draw(ctx);
}

// ---- drawing ---------------------------------------------------------------------------------
const lamp = () => (joy.state === "ready" ? "ok" : joy.state === "error" ? "error" : "warn");
function draw(ctx) {
  const k = keys.get(ctx);
  if (!k) return;
  const c = cfgOf(k.settings), now = Date.now();
  let img;
  if (isStatus(k)) {
    img = K.status({ state: joy.state, held: [...joy.down].sort((a, b) => a - b), last: joy.last ? joy.last.n : 0, reason: joy.text });
  } else if (k.failUntil > now) {
    img = K.problem({ title: "NO JOYSTICK", reason: joy.text || REASONS.other, sub: "see the settings", num: c.n });
  } else {
    const down = !!c.n && (joy.down.has(c.n) || k.flashUntil > now);
    img = K.key({ n: c.n, text: c.label, image: c.image, down, lamp: lamp(), mode: c.mode });
  }
  sdk.setImage(ctx, img);
}
function drawAll() { for (const ctx of keys.keys()) draw(ctx); }

function info(ctx) {
  const k = keys.get(ctx);
  const u = used(ctx);
  const last = joy.last;
  return {
    type: "info", app: "Idus Button Box", version: APP_VERSION, build: BUILD, key: isStatus(k) ? "status" : "button",
    usedAll: Object.fromEntries(used()),
    state: joy.state, kind: joy.kind, text: joy.text, nodes: joy.nodes, ...checks(),
    button: k ? cfgOf(k.settings).n : 0, used: Object.fromEntries(u), down: [...joy.down], presses: joy.presses,
    last: last ? { n: last.n, ago: Date.now() - last.at } : null,
  };
}
function sendInfo(ctx) {
  if (!inspected.has(ctx)) return;
  const k = keys.get(ctx);
  sdk.toInspector(ctx, k ? k.action : ACTION, info(ctx));
}
function sendInfoAll() { for (const ctx of inspected) sendInfo(ctx); }

joy.onChange = () => {
  drawAll();
  sendInfoAll();
  if (joy.state === "ready") {
    if (!joy.loggedReady) {
      joy.loggedReady = true;
      const { sysname, event, js } = joy.nodes;
      sdk.log(`Button Box: joystick "Idus Button Box" ready (${sysname}, ${event}, ${js})`);
    }
  } else if (joy.state === "error") {
    joy.loggedReady = false;
    sdk.log(`Button Box: no joystick — ${joy.text}`);
  }
};
// The settings panel's "last pressed … s ago" ticks while it is open
setInterval(() => { if (inspected.size) sendInfoAll(); }, 1000).unref();

// ---- OpenDeck events -------------------------------------------------------------------------
sdk.on("willAppear", (m) => {
  const settings = (m.payload && m.payload.settings) || {};
  keys.set(m.context, { action: m.action, settings, held: 0, holdTimer: null, flashUntil: 0, failUntil: 0 });
  const c = cfgOf(settings);
  if (m.action === STATUS) { /* no number */ }
  else if (c.n) remember(m.context, c.n);
  else if (globalsLoaded) assign(m.context);
  else pending.add(m.context);
  draw(m.context);
  // OpenDeck can show a new key after the first image arrived: send it again a little later
  for (const t of [400, 1500]) setTimeout(() => { sdk.forget(m.context); draw(m.context); }, t);
});
sdk.on("willDisappear", (m) => {
  letGo(m.context);
  keys.delete(m.context); inspected.delete(m.context); pending.delete(m.context);
  sdk.forget(m.context);
});
sdk.on("didReceiveSettings", (m) => {
  const settings = (m.payload && m.payload.settings) || {};
  const k = keys.get(m.context);
  if (!k || isStatus(k)) return;
  const before = cfgOf(k.settings).n;
  k.settings = settings;
  const c = cfgOf(settings);
  if (k.held && k.held !== c.n) letGo(m.context);
  if (c.n) remember(m.context, c.n);
  else assign(m.context);
  draw(m.context);
  if (before !== c.n) sendInfoAll(); else sendInfo(m.context);
});
sdk.on("didReceiveGlobalSettings", (m) => {
  const g = (m.payload && m.payload.settings) || {};
  if (g.assigned && typeof g.assigned === "object") {
    for (const [ctx, n] of Object.entries(g.assigned)) if (!(ctx in assigned)) assigned[ctx] = int(n, 0);
  }
  globalsReady();
});
sdk.on("keyDown", (m) => {
  const k = keys.get(m.context);
  if (k && m.payload && m.payload.settings) k.settings = m.payload.settings;
  keyDown(m.context, !!(m.payload && m.payload.isInMultiAction));
});
sdk.on("keyUp", (m) => keyUp(m.context));
sdk.on("sendToPlugin", (m) => {
  const p = m.payload || {};
  if (p.cmd === "info") { inspected.add(m.context); sendInfo(m.context); }
  if (p.cmd === "retry") joy.retry();
  if (p.cmd === "test") {         // press this key's button for half a second (see it in jstest or the game)
    const tk = keys.get(m.context);
    const c = cfgOf((tk || {}).settings);
    if (tk && !isStatus(tk) && c.n && joy.ready) {
      const t = `${m.context}#test`;
      hold(t, c.n);
      setTimeout(() => { unhold(t, c.n); draw(m.context); }, 500);
      draw(m.context);
    }
    sendInfo(m.context);
  }
});
sdk.on("propertyInspectorDidAppear", (m) => { inspected.add(m.context); sendInfo(m.context); });
sdk.on("propertyInspectorDidDisappear", (m) => inspected.delete(m.context));

// The joystick exists from the start, so it is there before a game starts
sdk.onOpen = () => {
  sdk.getGlobalSettings();
  // OpenDeck versions without global settings: number new keys after a short wait anyway
  setTimeout(globalsReady, 1500);
  if (joy.state !== "starting") { joy.loggedReady = false; joy.onChange(); }
};

// Nothing outlives the plugin: every button is let go and the joystick removed
function cleanup() { try { joy.stop(); } catch { /* exiting */ } }
process.on("exit", cleanup);
for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(sig, () => process.exit(0));

module.exports = { cfgOf }; // for tests
if (require.main === module) {
  joy.start();
  sdk.connect();
  setTimeout(() => sdk.log(`Idus Button Box v${APP_VERSION} (build ${BUILD}) running from ${__dirname}`), 1000);
}
