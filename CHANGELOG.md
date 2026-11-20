# Changelog

All notable changes to Idus Button Box. Format: [Keep a Changelog](https://keepachangelog.com/).

## [1.0.1] – 2026-11-19

### Changed
- New icon: an arcade joystick instead of a panel of buttons, so it no longer looks like Idus SC Deck's. The action list shows a joystick too (with signal arcs on JOY · Status).

## [1.0] – 2026-11-19

### Added
- **JOY · Button** — an OpenDeck key that presses a button on a virtual joystick, "Idus Button Box" (32 buttons), made through `/dev/uinput`. Games see an ordinary joystick, under Wine/Proton too: bind the keys in Star Citizen, DCS, Elite … like any button box.
- Hold (the button follows the key) or Tap (a 90 ms press). Keys in a multi action always tap.
- New keys get the lowest free number, also counting keys on other pages (kept in OpenDeck's global settings). Two keys may share a number; the button stays down until both are let go.
- Your own label on the key, auto-sized, one or two lines; a round arcade button without a label. Orange while the button is down; the lamp shows whether the joystick is ready.
- Your own picture in the middle of the key (PNG, JPG or SVG, scaled to 144 px and kept in the key); the label becomes a caption under it.
- **JOY · Status** — a key that shows READY, the buttons held right now and the last press, or why there is no joystick (press to try again). Its panel lists the numbers your keys use.
- Safety: a key held for more than a minute is let go; every button is let go and the joystick removed when the plugin stops.
- Settings panel with **Test this button**, the joystick's state, the last press, and a one-line fix plus **Try again** when `/dev/uinput` is missing or not writable.
- Installer for the native OpenDeck package and the Flatpak, with checks; works with Idus GitHub Updater.
