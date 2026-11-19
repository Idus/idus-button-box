// README pictures: docs/keys.png (what the keys look like) and docs/settings.png (the settings
// panel, from dev/test-pi.cjs). Run: node dev/test-pi.cjs /tmp/pi && node dev/make-docs.cjs /tmp/pi
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const K = require("../se.wolfpack.idusbuttonbox.sdPlugin/lib/keys");

const DOCS = path.join(__dirname, "..", "docs");
const piShots = process.argv[2];
const dec = (u) => Buffer.from(u.split(",")[1], "base64").toString();
const cells = [
  ["Button 1, no label", K.key({ n: 1, lamp: "ok" })],
  ["…held", K.key({ n: 1, lamp: "ok", down: true })],
  ["With a label", K.key({ n: 12, text: "GEAR", lamp: "ok" })],
  ["…held", K.key({ n: 12, text: "GEAR", lamp: "ok", down: true })],
  ["Two lines, tap", K.key({ n: 5, text: "QUANTUM|DRIVE", lamp: "ok", mode: "tap" })],
  ["No joystick", K.problem({ title: "NO JOYSTICK", reason: "no access to /dev/uinput", sub: "see the settings", num: 7 })],
];
(async () => {
  fs.mkdirSync(DOCS, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: cells.length * 168 + 16, height: 200 }, deviceScaleFactor: 2 });
  await p.setContent(`<html><body style="margin:0;padding:8px;background:#16181d;display:flex;gap:8px;font:13px 'IBM Plex Sans';color:#8a93a3">
    ${cells.map(([c, u]) => `<figure style="margin:0;display:grid;gap:6px;justify-items:center;width:160px">${dec(u).replace('width="144" height="144"', 'width="152" height="152"')}<figcaption>${c}</figcaption></figure>`).join("")}</body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(DOCS, "keys.png"), fullPage: true });
  await b.close();
  if (piShots) fs.copyFileSync(path.join(piShots, "ready-1100.png"), path.join(DOCS, "settings.png"));
  console.log("docs done");
})();
