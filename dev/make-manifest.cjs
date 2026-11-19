// Writes manifest.json. Run: node dev/make-manifest.cjs
const fs = require("node:fs");
const path = require("node:path");
const ID = "se.wolfpack.idusbuttonbox";
const VERSION = "1.0";

const manifest = {
  Name: "Idus Button Box",
  UUID: ID,
  Version: VERSION,
  Author: "Idus",
  Description: "Stream Deck keys as joystick buttons: the plugin makes a virtual joystick, \"Idus Button Box\", with 32 buttons, and each key presses one of them — hold or tap. Games see an ordinary joystick, under Wine/Proton too, so you bind the keys in Star Citizen, DCS, Elite and other games like any button box, with no keyboard shortcuts in the way. Your own label or picture on each key, and a status key. Linux (Wayland and X11). Made by Idus with AI assistance (Claude).",
  URL: "https://github.com/Idus/idus-button-box",
  Icon: "imgs/plugin",
  Category: "Idus Button Box",
  CategoryIcon: "imgs/category",
  SDKVersion: 2,
  CodePath: "plugin.js",
  CodePathLin: "plugin.js",
  Software: { MinimumVersion: "6.5" },
  OS: [{ Platform: "linux", MinimumVersion: "0" }],
  Actions: [{
    Name: "JOY · Button",
    UUID: `${ID}.button`,
    Icon: "imgs/actions/button",
    Tooltip: "Presses a button on the virtual joystick \"Idus Button Box\" (1–32). Bind it in the game like any joystick button.",
    Controllers: ["Keypad"],
    SupportedInMultiActions: true,
    DisableAutomaticStates: true,
    PropertyInspectorPath: "pi/button.html",
    States: [{ Image: "imgs/key", ShowTitle: false }],
  }, {
    Name: "JOY · Status",
    UUID: `${ID}.status`,
    Icon: "imgs/actions/status",
    Tooltip: "Shows the virtual joystick \"Idus Button Box\": ready, the buttons held right now and the last press — or why there is no joystick (press to try again).",
    Controllers: ["Keypad"],
    SupportedInMultiActions: false,
    DisableAutomaticStates: true,
    PropertyInspectorPath: "pi/button.html",
    States: [{ Image: "imgs/status", ShowTitle: false }],
  }],
};
fs.writeFileSync(path.join(__dirname, "..", `${ID}.sdPlugin`, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest", VERSION);
