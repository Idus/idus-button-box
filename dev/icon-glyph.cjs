// The button-box glyph on a 40 × 40 grid: a panel with six round buttons, one pressed (filled) —
// like the box on the app icon. color: stroke and fill colour. Used by make-icons.cjs (orange).
module.exports = (color) => `<rect x="4.5" y="9" width="31" height="22" rx="4.5"/>` +
  `<g stroke-width="2">` +
  [[12, 16.2], [20, 16.2], [28, 16.2], [12, 23.8], [20, 23.8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5"/>`).join("") +
  `<circle cx="28" cy="23.8" r="2.9" fill="${color}" stroke="none"/></g>`;
