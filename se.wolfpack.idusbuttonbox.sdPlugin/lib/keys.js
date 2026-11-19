// Key images for Idus Button Box, in the Idus look: the same card, orange tab and status lamp as
// the Idus SC Deck and Hamster Wheel keys. 144 × 144 SVG.
//   head  — orange JOY tab, the button number beside it, the lamp (green: the joystick is ready)
//   body  — your label (auto-sized, one or two lines), or a round button cap when there is none
//   down  — while the button is held: orange frame, lighter card, orange label / pressed cap
"use strict";

const C = {
  bg: "#16181d", surface: "#1e222b", deep: "#0f1115", line: "#2a2f3a", fg: "#e8eaed",
  muted: "#8a93a3", soft: "#9fb4d4", dim: "#5a6270", title: "#ffd9a0", accent: "#ff9a3c",
  ok: "#46d160", warn: "#ffb13c", error: "#e0525b",
};
const MONO = "JetBrains Mono, DejaVu Sans Mono, monospace";
const DISPLAY = "Saira, IBM Plex Sans, sans-serif";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const n = (x) => Number(x.toFixed(1));

// Card, orange tab, the text beside it and the status lamp — as on the other Idus keys
function head({ tab = "JOY", label = "", labelColor = C.title, lamp = "idle", down = false, frame }) {
  const w = tab.length * 7.3 + 14;
  const lamps = {
    ok: `<circle cx="128" cy="25.5" r="8.5" fill="${C.ok}" opacity="0.18"/><circle cx="128" cy="25.5" r="5" fill="${C.ok}"/>`,
    warn: `<circle cx="128" cy="25.5" r="8.5" fill="${C.warn}" opacity="0.18"/><circle cx="128" cy="25.5" r="5" fill="${C.warn}"/>`,
    error: `<circle cx="128" cy="25.5" r="5" fill="${C.error}"/>`,
    idle: `<circle cx="128" cy="25.5" r="5" fill="${C.dim}"/>`,
  };
  const stroke = frame || (down ? C.accent : C.line);
  return `<rect width="144" height="144" fill="${C.bg}"/>` +
    `<rect x="4.5" y="4.5" width="135" height="135" rx="16" fill="${down ? C.surface : C.deep}" stroke="${stroke}" stroke-width="${stroke === C.line ? 1.5 : 2.5}"/>` +
    `<rect x="13" y="15" width="${n(w)}" height="21" rx="6" fill="${down ? C.accent : C.surface}" stroke="${C.accent}" stroke-width="1.3"/>` +
    `<text x="${n(13 + w / 2)}" y="29.5" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="11" letter-spacing="0.8" fill="${down ? C.bg : C.accent}">${esc(tab)}</text>` +
    `<text x="${n(13 + w + 6)}" y="33" font-family="${MONO}" font-weight="700" font-size="20" fill="${labelColor}">${esc(label)}</text>` +
    (lamps[lamp] || lamps.idle);
}

// Split a label into at most two lines: an explicit "|" or line break wins, otherwise the most
// even split at a space when the text is long
function lines(text) {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  if (!t) return [];
  const forced = String(text).split(/\s*(?:\||\\n|\n)\s*/).map((s) => s.trim()).filter(Boolean);
  if (forced.length > 1) return forced.slice(0, 2);
  if (t.length <= 8 || !t.includes(" ")) return [t];
  let best = [t], score = Infinity;
  for (let i = t.indexOf(" "); i >= 0; i = t.indexOf(" ", i + 1)) {
    const a = t.slice(0, i), b = t.slice(i + 1), s = Math.max(a.length, b.length);
    if (s < score) { score = s; best = [a, b]; }
  }
  return best;
}

// Width of a line in em for Saira 700 (capitals and digits are wide, small letters narrower)
const em = (l) => [...l].reduce((w, ch) => w + (ch === " " ? 0.25 : /[MW]/.test(ch) ? 0.84 : /[ijlI.,:;|!'1]/.test(ch) ? 0.3 : /[A-Z]/.test(ch) ? 0.64 : /[0-9]/.test(ch) ? 0.58 : /[mw]/.test(ch) ? 0.84 : 0.54), 0);
// Font size that fits the widest line into the card
function fit(ls) {
  const widest = Math.max(...ls.map(em), 0.5);
  const max = ls.length > 1 ? 30 : 38;
  return Math.max(11, Math.min(max, 116 / widest));
}

function label(text, down) {
  const ls = lines(text);
  const size = fit(ls);
  const lh = size * 1.08;
  const mid = 89;
  const y0 = mid - ((ls.length - 1) * lh) / 2 + size * 0.36;
  return ls.map((l, i) => `<text x="72" y="${n(y0 + i * lh)}" text-anchor="middle" font-family="${DISPLAY}" font-weight="700" font-size="${n(size)}" fill="${down ? C.accent : C.fg}">${esc(l)}</text>`).join("");
}

// A round arcade-style button cap — the key's picture when it has no label
function cap(down) {
  const cy = 88;
  return `<circle cx="72" cy="${cy}" r="33" fill="none" stroke="${C.line}" stroke-width="2"/>` +
    (down
      ? `<circle cx="72" cy="${cy}" r="31" fill="${C.accent}" opacity="0.16"/><circle cx="72" cy="${cy + 1.5}" r="24" fill="${C.accent}"/>` +
        `<ellipse cx="72" cy="${cy - 4}" rx="14" ry="6" fill="${C.title}" opacity="0.35"/>`
      : `<circle cx="72" cy="${cy + 4}" r="25" fill="${C.deep}" stroke="${C.dim}" stroke-width="1.5"/>` +
        `<circle cx="72" cy="${cy}" r="25" fill="${C.surface}" stroke="${C.soft}" stroke-width="2"/>` +
        `<ellipse cx="72" cy="${cy - 8}" rx="13" ry="5.5" fill="${C.soft}" opacity="0.14"/>`);
}

const url = (body) => "data:image/svg+xml;base64," +
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">${body}</svg>`).toString("base64");

// n: button number · text: the label (empty → button cap) · down: held · lamp: ok | warn | error | idle
// mode: "tap" adds a small TAP mark under the label
function key({ n: num, text = "", down = false, lamp = "idle", mode = "hold" }) {
  const body = String(text).trim() ? label(text, down) : cap(down);
  const tapMark = mode === "tap"
    ? `<text x="72" y="131" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="9.5" letter-spacing="1.2" fill="${C.dim}">TAP</text>` : "";
  return url(head({ label: num ? String(num) : "–", labelColor: down ? C.accent : C.title, lamp, down }) + body + tapMark);
}

// A problem, shown for a few seconds: big title, the reason (wrapped) and a muted sub line
function problem({ title, reason, sub, num }) {
  const words = String(reason || "").split(" "), ls = [];
  for (const w of words) {
    const last = ls[ls.length - 1];
    if (last && (last + " " + w).length <= 17) ls[ls.length - 1] = last + " " + w;
    else ls.push(w);
  }
  const body = ls.slice(0, 3).map((l, i) =>
    `<text x="72" y="${92 + i * 15}" text-anchor="middle" font-family="${MONO}" font-weight="500" font-size="11.5" fill="${C.fg}">${esc(l)}</text>`).join("");
  return url(head({ label: num ? String(num) : "ERR", labelColor: C.error, lamp: "error", frame: C.error }) +
    `<text x="72" y="70" text-anchor="middle" font-family="${DISPLAY}" font-weight="700" font-size="16" letter-spacing="0.6" fill="${C.error}">${esc(title)}</text>` +
    body + (sub ? `<text x="72" y="130" text-anchor="middle" font-family="${MONO}" font-weight="500" font-size="10.5" fill="${C.muted}">${esc(sub)}</text>` : ""));
}

module.exports = { key, problem, cap, lines, C };
