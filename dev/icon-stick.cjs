// Arcade joystick for the Idus Button Box app icon, centred on (0,0), about 240 × 240. id: prefix for the gradient ids.
module.exports = function stick(id = "j") {
  const C = { accent: "#ff9a3c", title: "#ffd9a0", deep: "#0f1115", surface: "#1e222b", line: "#2a2f3a", soft: "#9fb4d4", dim: "#5a6270" };
  const btn = (x, y, s) => // a small arcade button on the base, seen at an angle: ring, body, cap
    `<ellipse cx="${x}" cy="${y + 2 * s}" rx="${19 * s}" ry="${7.5 * s}" fill="${C.deep}" stroke="#3a4352" stroke-width="1.5"/>` +
    `<path d="M${x - 14 * s} ${y + 1 * s} V${y - 5 * s} A${14 * s} ${5.6 * s} 0 0 1 ${x + 14 * s} ${y - 5 * s} V${y + 1 * s} A${14 * s} ${5.6 * s} 0 0 1 ${x - 14 * s} ${y + 1 * s} Z" fill="#6f8099"/>` +
    `<ellipse cx="${x}" cy="${y - 5 * s}" rx="${14 * s}" ry="${5.6 * s}" fill="${C.soft}"/>` +
    `<ellipse cx="${x - 3 * s}" cy="${y - 6 * s}" rx="${6.5 * s}" ry="${2 * s}" fill="#ffffff" opacity="0.35"/>`;
  return `<defs>
    <linearGradient id="${id}shaft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a6270"/><stop offset="0.45" stop-color="#d7dee8"/><stop offset="1" stop-color="#4a515e"/></linearGradient>
    <radialGradient id="${id}ball" cx="0.36" cy="0.32" r="0.75"><stop offset="0" stop-color="#ffd09a"/><stop offset="0.35" stop-color="#ff9a3c"/><stop offset="1" stop-color="#a8521a"/></radialGradient>
    <linearGradient id="${id}side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e222b"/><stop offset="1" stop-color="#0b0d10"/></linearGradient>
    <radialGradient id="${id}glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff9a3c" stop-opacity="0.35"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="0" cy="96" rx="122" ry="26" fill="#000" opacity="0.35"/>
  <path d="M-112 62 V78 A112 30 0 0 0 112 78 V62 Z" fill="url(#${id}side)" stroke="#3a4352" stroke-width="3"/>
  <ellipse cx="0" cy="62" rx="112" ry="30" fill="${C.surface}" stroke="#3a4352" stroke-width="3"/>
  <ellipse cx="0" cy="62" rx="100" ry="24" fill="none" stroke="${C.line}" stroke-width="1.5"/>
  ${btn(-64, 68, 1.25)}${btn(66, 70, 1.25)}
  <ellipse cx="0" cy="58" rx="24" ry="8.5" fill="${C.deep}" stroke="${C.dim}" stroke-width="2"/>
  <path d="M-9 58 L6 -44 L26 -44 L11 58 Z" fill="url(#${id}shaft)"/>
  <circle cx="18" cy="-72" r="70" fill="url(#${id}glow)"/>
  <circle cx="16" cy="-70" r="44" fill="url(#${id}ball)"/>
  <ellipse cx="0" cy="-88" rx="15" ry="9" fill="${C.title}" opacity="0.55" transform="rotate(-25 0 -88)"/>`;
};
