// Fake OpenDeck host for testing: starts the plugin the way OpenDeck does (node plugin.js,
// cwd = plugin folder, -port/-pluginUUID/-registerEvent/-info), shows keys, answers global
// settings, presses keys (hold, tap, a shared number, a multi action, a key held too long), opens
// the settings panel and asks for a test press. Writes key snapshots and a log.
//   node dev/fake-opendeck.cjs <out dir> [seconds]
// Env: DRYRUN=1 — joystick without /dev/uinput (events logged to <out>/events.log)
//      WS_MODULE — path to the ws package
const { WebSocketServer } = require(process.env.WS_MODULE || "ws");
const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PLUGIN = path.resolve(process.env.FAKE_PLUGIN_DIR || path.join(__dirname, "..", "se.wolfpack.idusbuttonbox.sdPlugin"));
const ID = "se.wolfpack.idusbuttonbox";
const ACTION = `${ID}.button`;
const out = path.resolve(process.argv[2] || "out");
const seconds = Number(process.argv[3] || 9);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const port = 28450 + Math.floor(Math.random() * 40);

const keys = {
  k1: { button: "12", mode: "hold", label: "GEAR" },
  k2: {},                                              // new key: gets the lowest free number
  k3: { button: "5", mode: "tap", label: "QUANTUM|DRIVE" },
  k4: { button: "12", label: "" },                     // shares 12 with k1, round cap
};
const stored = { assigned: { gone1: 1, gone2: 2 } };  // two keys on another page use 1 and 2
const latest = {}, log = [], counts = {};
const t0 = Date.now();
const ts = () => ((Date.now() - t0) / 1000).toFixed(2).padStart(5);

const wss = new WebSocketServer({ port });
wss.on("connection", (ws) => {
  const send = (o) => ws.send(JSON.stringify(o));
  const at = (ms, what, fn) => setTimeout(() => { log.push(`${ts()} ${what}`); fn(); }, ms);
  const ev = (event, ctx, extra = {}) => send({ event, action: ACTION, context: ctx, device: "dev",
    payload: { settings: keys[ctx], coordinates: { column: 0, row: 0 }, isInMultiAction: false, ...extra } });
  const snap = (tag) => { for (const [k, svg] of Object.entries(latest)) fs.writeFileSync(path.join(out, `${tag}-${k}.svg`), svg); };
  ws.on("message", (buf) => {
    const m = JSON.parse(String(buf));
    if (m.event === "registerPlugin") {
      for (const ctx of Object.keys(keys)) ev("willAppear", ctx, { controller: "Keypad" });
      at(700, "snapshot idle", () => snap("t0-idle"));
      at(800, "PI open on k2 → info", () => send({ event: "sendToPlugin", action: ACTION, context: "k2", payload: { cmd: "info" } }));
      at(1000, "k1 DOWN (hold 12)", () => ev("keyDown", "k1"));
      at(1300, "snapshot k1 held", () => snap("t1-held"));
      at(1600, "k1 UP", () => ev("keyUp", "k1"));
      at(1900, "k3 DOWN+UP (tap 5)", () => { ev("keyDown", "k3"); setTimeout(() => ev("keyUp", "k3"), 400); });
      at(1960, "snapshot k3 tapping", () => snap("t2-tap"));
      at(2700, "k1 DOWN, k4 DOWN (both 12)", () => { ev("keyDown", "k1"); ev("keyDown", "k4"); });
      at(2900, "k1 UP (12 stays: k4 holds it)", () => ev("keyUp", "k1"));
      at(3200, "k4 UP (12 released)", () => ev("keyUp", "k4"));
      at(3500, "k1 in a multi action (forced tap)", () => { ev("keyDown", "k1", { isInMultiAction: true }); ev("keyUp", "k1", { isInMultiAction: true }); });
      at(3900, "PI test on k2", () => send({ event: "sendToPlugin", action: ACTION, context: "k2", payload: { cmd: "test" } }));
      at(4600, "k2 settings → button 30, label VTOL", () => { keys.k2 = { ...keys.k2, button: "30", label: "VTOL" }; ev("didReceiveSettings", "k2"); });
      at(4800, "k4 DOWN and never up (held-too-long safety, 2 s in this test)", () => ev("keyDown", "k4"));
      at(7200, "k3 DOWN, then page switch (willDisappear) before UP", () => { keys.k3.mode = "hold"; ev("keyDown", "k3"); setTimeout(() => ev("willDisappear", "k3"), 200); });
      at(7800, "snapshot end", () => snap("t3-end"));
      return;
    }
    counts[m.event] = (counts[m.event] || 0) + 1;
    if (m.event === "setImage") {
      latest[m.context] = Buffer.from(m.payload.image.split(",")[1], "base64").toString();
    } else if (m.event === "getGlobalSettings") {
      log.push(`${ts()} getGlobalSettings → ${JSON.stringify(stored)}`);
      setTimeout(() => send({ event: "didReceiveGlobalSettings", payload: { settings: stored } }), 100);
    } else if (m.event === "setSettings") {
      keys[m.context] = m.payload;
      log.push(`${ts()} setSettings ${m.context} ${JSON.stringify(m.payload)}`);
    } else if (m.event === "sendToPropertyInspector") {
      const p = m.payload;
      if (counts[m.event] <= 2 || counts[m.event] % 5 === 0) log.push(`${ts()} → PI ${m.context}: state=${p.state} button=${p.button} used=${JSON.stringify(p.used)} down=${p.down} last=${JSON.stringify(p.last)} uinput=${p.uinput} nodes=${JSON.stringify(p.nodes)}`);
    } else {
      log.push(`${ts()} ${m.event} ${m.context || ""} ${m.payload ? JSON.stringify(m.payload).slice(0, 160) : ""}`);
    }
  });
});

const info = { application: { font: "", language: "en", platform: "linux", platformVersion: "Rolling", version: "2.14.2" },
  plugin: { uuid: ID, version: "1.0" }, devicePixelRatio: 2, colors: {},
  devices: [{ id: "dev", name: "Stream Deck XL", size: { columns: 8, rows: 4 }, type: 2 }] };
const env = { ...process.env, IDUS_BB_HOLD_MAX_MS: "2000" };
if (process.env.DRYRUN === "1") Object.assign(env, { IDUS_BB_DRYRUN: "1", IDUS_BB_DRYLOG: path.join(out, "events.log") });
const child = spawn(process.execPath, ["plugin.js", "-port", String(port), "-pluginUUID", ID, "-registerEvent", "registerPlugin",
  "-info", JSON.stringify(info)], { cwd: PLUGIN, env });
let errs = "";
child.stderr.on("data", (d) => { errs += d; });
child.stdout.on("data", (d) => { errs += d; });
setTimeout(() => {
  child.kill("SIGTERM");
  setTimeout(() => {
    const ps = execSync("ps -eo pid,args | grep -E 'joy.py' | grep -v grep || true").toString();
    log.push(`${ts()} leftover processes after SIGTERM: ${ps.trim() || "none"}`);
    const report = log.join("\n") + "\n\nCOUNTS " + JSON.stringify(counts) + "\n\nSTDERR\n" + errs;
    fs.writeFileSync(path.join(out, "log.txt"), report);
    console.log(report);
    wss.close(); process.exit(0);
  }, 2000);
}, seconds * 1000);
