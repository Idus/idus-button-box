// Loads the settings panel in Chromium with a fake host: checks that settings load, that a change
// is saved on the key's context, that numbers used by other keys are marked, that plugin info, the
// fix box and the test button work, and screenshots it at OpenDeck's size (full width, ≤ 384 px high).
//   node dev/test-pi.cjs <out dir>
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { WebSocketServer } = require(process.env.WS_MODULE || "ws");

const PI = path.resolve(process.env.PI_FILE || path.join(__dirname, "..", "se.wolfpack.idusbuttonbox.sdPlugin", "pi", "button.html"));
const out = path.resolve(process.argv[2] || "pi-shots");
fs.mkdirSync(out, { recursive: true });

const base = { type: "info", app: "Idus Button Box", version: "1.0", build: "test", platform: "linux", uinput: "ok",
  state: "ready", kind: "", text: "", nodes: { sysname: "input42", event: "event23", js: "js1" }, used: { 1: 1, 2: 1, 12: 2 }, down: [], presses: 4 };
const cases = {
  ready: { settings: { button: "12", mode: "hold", label: "GEAR" }, info: { ...base, button: 12, last: { n: 12, ago: 3000 } } },
  tap: { settings: { button: "5", mode: "tap", label: "QUANTUM|DRIVE" }, info: { ...base, button: 5, last: null } },
  status: { action: "status", settings: {}, info: { ...base, key: "status", button: 0, usedAll: { 1: 1, 2: 1, 5: 1, 12: 2, 30: 1 }, last: { n: 12, ago: 5000 } } },
  noaccess: { settings: { button: "3" }, info: { ...base, button: 3, state: "error", kind: "access", text: "no access to /dev/uinput", uinput: "access", nodes: { sysname: "", event: "", js: "" }, last: null } },
};

(async () => {
  const browser = await chromium.launch();
  let port = 28600;
  for (const [name, c] of Object.entries(cases)) {
    for (const [W, H] of [[1100, 384], [560, 900]]) {
      port++;
      const got = [];
      const wss = new WebSocketServer({ port });
      wss.on("connection", (ws) => ws.on("message", (b) => {
        const m = JSON.parse(String(b)); got.push(m);
        if (m.event === "sendToPlugin" && m.payload.cmd === "info") ws.send(JSON.stringify({ event: "sendToPropertyInspector", context: "ctx", payload: c.info }));
      }));
      const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); }; });
      await page.goto("file://" + PI);
      await page.evaluate(([port, settings, action]) => window.connectSocket(port, "ctx", "registerPropertyInspector", "{}",
        JSON.stringify({ action: "se.wolfpack.idusbuttonbox." + action, context: "ctx", payload: { settings } })), [port, c.settings, c.action || "button"]);
      await page.waitForTimeout(500);
      let saved = "", typed = "", test = "", pic = "";
      const visibleGroups = await page.evaluate(() => [...document.querySelectorAll(".group .head")].filter((e) => e.offsetParent).map((e) => e.textContent));
      if (W === 1100 && name === "ready") {
        await page.setInputFiles("#picfile", path.join(__dirname, "..", "idus-button-box.png"));
        await page.waitForTimeout(800);
        const set = got.filter((m) => m.event === "setSettings").pop();
        const img = set && set.payload.image || "";
        pic = `${img.slice(0, 22)}… ${img.length} chars, preview=${await page.isVisible("#picprev img")}, hint=${await page.textContent("#pichint")}`;
        await page.screenshot({ path: path.join(out, "picture-1100.png"), fullPage: true });
        await page.click("#picclear");
        await page.waitForTimeout(150);
        const set2 = got.filter((m) => m.event === "setSettings").pop();
        pic += ` · after Remove: image="${set2.payload.image}"`;
      }
      if (W === 1100 && name !== "status") {
        await page.selectOption('select[data-setting="button"]', "7");
        await page.waitForTimeout(150);
        let set = got.filter((m) => m.event === "setSettings").pop();
        saved = set ? `${set.context} button=${set.payload.button} mode=${set.payload.mode} label=${set.payload.label}` : "NOT SAVED";
        await page.fill('input[data-setting="label"]', "LIGHTS");
        await page.waitForTimeout(600);
        set = got.filter((m) => m.event === "setSettings").pop();
        typed = set ? `label=${set.payload.label}` : "NOT SAVED";
        await page.selectOption('select[data-setting="button"]', c.settings.button);
        await page.fill('input[data-setting="label"]', c.settings.label || "");
        await page.waitForTimeout(500);
        await page.click("#test");
        await page.waitForTimeout(100);
        test = (got.some((m) => m.event === "sendToPlugin" && m.payload.cmd === "test") ? "sent " : "not sent ") + await page.textContent("#testmsg");
      }
      await page.evaluate(() => document.fonts.ready);
      const scroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      const opt12 = await page.evaluate(() => document.querySelector('#button option[value="12"]').textContent);
      await page.screenshot({ path: path.join(out, `${name}-${W}.png`), fullPage: true });
      await page.click("footer a[href*='github']");
      const opened = await page.evaluate(() => window.__opened);
      const inuse = await page.textContent("#inuse");
      console.log(JSON.stringify({ name, W, scroll, visibleGroups, saved, typed, test, pic, inuse, opt12, opened, pill: await page.textContent("#state"), fix: await page.isVisible("#fix"), errors }));
      await page.close(); wss.close();
    }
  }
  await browser.close();
})();
