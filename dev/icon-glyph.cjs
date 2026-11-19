// Glyphs on a 40 × 40 grid for the action list and category icon: an arcade joystick (round base,
// shaft, filled ball). status() adds two signal arcs — the JOY · Status action.
// color: stroke and fill colour. Used by make-icons.cjs (orange).
const stick = (color) => `<ellipse cx="18" cy="28.5" rx="13" ry="4.4"/><path d="M5 28.5 v3 a13 4.4 0 0 0 26 0 v-3"/>` +
  `<path d="M18 28 L19.6 16.5"/><circle cx="20" cy="11.5" r="5.6" fill="${color}"/>`;
module.exports = stick;
module.exports.status = (color) => stick(color) + `<path d="M29 9.5 a5 5 0 0 1 2.5 5 M31.5 5.5 a10 10 0 0 1 5 9" stroke-width="2.2"/>`;
