// The virtual joystick on Linux: lib/joy.py (through python3) creates "Idus Button Box" on
// /dev/uinput and presses its buttons. It is started when the plugin starts — so the joystick is
// there before a game starts — and ends with the plugin. If it stops, it is started again (with a
// growing pause, up to 30 s); access problems are reported, not retried in a tight loop.
"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const HELPER = path.join(__dirname, "joy.py");
const COUNT = 32;

function which(cmd) {
  for (const dir of (process.env.PATH || "/usr/local/bin:/usr/bin:/bin").split(":")) {
    const p = path.join(dir, cmd);
    try { fs.accessSync(p, fs.constants.X_OK); return p; } catch { /* next */ }
  }
  return null;
}

const REASONS = {
  access: "no access to /dev/uinput",
  missing: "no /dev/uinput",
  python: "python3 is missing",
  other: "the joystick helper stopped",
};

const joy = {
  proc: null,
  ready: false,
  state: "off",          // off | starting | ready | error
  kind: "", text: "",    // why it is not ready
  nodes: { sysname: "", event: "", js: "" },
  down: new Set(),       // buttons held right now
  presses: 0,
  last: null,            // { n, at } — the last button pressed (for the settings panel)
  onChange: null,
  retryMs: 1000, retryTimer: null, stopping: false,

  start() {
    if (this.proc || this.stopping) return;
    clearTimeout(this.retryTimer); this.retryTimer = null;
    this.state = "starting"; this.ready = false;
    let p;
    try { p = spawn("python3", ["-I", HELPER], { stdio: ["pipe", "pipe", "pipe"], env: process.env }); }
    catch { this.fail("python", REASONS.python); return; }
    this.proc = p;
    let buf = "";
    p.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (line.startsWith("ready")) {
          const [, sysname = "-", event = "-", js = "-"] = line.split(/\s+/);
          this.nodes = { sysname, event, js };
          this.ready = true; this.state = "ready"; this.kind = ""; this.text = ""; this.retryMs = 1000;
          for (const n of this.down) this.write(`d ${n}`); // still held from before a restart
          this.changed();
        } else if (line.startsWith("error ")) {
          const [, kind, ...rest] = line.split(" ");
          this.kind = kind; this.text = REASONS[kind] || rest.join(" ");
        }
      }
    });
    p.stderr.on("data", () => {});
    p.stdin.on("error", () => {});
    p.on("error", (e) => {
      if (this.proc !== p) return;
      this.proc = null;
      this.fail(e.code === "ENOENT" ? "python" : "other", e.code === "ENOENT" ? REASONS.python : String(e.message));
    });
    p.on("exit", (code) => {
      if (this.proc !== p) return;
      this.proc = null;
      if (this.stopping) return;
      this.fail(this.kind || "other", this.text || `${REASONS.other} (${code})`);
    });
  },

  fail(kind, text) {
    this.ready = false; this.state = "error"; this.kind = kind; this.text = text;
    this.changed();
    // Missing access or python does not fix itself quickly; a crash may. Either way: try again later.
    const wait = kind === "other" ? this.retryMs : Math.max(this.retryMs, 10000);
    this.retryMs = Math.min(this.retryMs * 2, 30000);
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.start(), wait);
    if (this.retryTimer.unref) this.retryTimer.unref();
  },

  // Try again now (the settings panel's "Try again" after a fix)
  retry() {
    if (this.proc) return;
    this.retryMs = 1000;
    this.start();
  },

  write(line) {
    if (!this.proc || !this.ready) return false;
    try { this.proc.stdin.write(line + "\n"); return true; } catch { return false; }
  },

  press(n) {
    if (!(n >= 1 && n <= COUNT)) return false;
    const fresh = !this.down.has(n);
    this.down.add(n);
    if (fresh) { this.presses++; this.last = { n, at: Date.now() }; }
    const ok = this.write(`d ${n}`);
    if (fresh) this.changed();
    return ok;
  },

  release(n) {
    if (!this.down.has(n)) return;
    this.down.delete(n);
    this.write(`u ${n}`);
    this.changed();
  },

  releaseAll() {
    if (!this.down.size) return;
    this.down.clear();
    this.write("r");
    this.changed();
  },

  changed() { if (this.onChange) try { this.onChange(); } catch { /* drawing only */ } },

  stop() {
    this.stopping = true;
    clearTimeout(this.retryTimer);
    const p = this.proc;
    this.proc = null; this.ready = false;
    if (!p) return;
    try { p.stdin.write("r\nquit\n"); p.stdin.end(); } catch { /* closed */ }
    setTimeout(() => { try { p.kill("SIGTERM"); } catch { /* gone */ } }, 1500).unref();
  },
};

// What this computer supports, for the settings panel
function checks() {
  let uinput = "ok";
  try { fs.accessSync("/dev/uinput", fs.constants.W_OK); }
  catch (e) { uinput = e.code === "ENOENT" ? "missing" : "access"; }
  if (uinput === "ok" && !which("python3")) uinput = "python";
  return { platform: "linux", uinput };
}

module.exports = { joy, checks, REASONS, COUNT };
