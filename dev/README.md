# Dev tools

```bash
cd dev && npm install                  # ws (for the fake host); Playwright and ImageMagick are expected on the system
node make-manifest.cjs                 # manifest.json (version lives here)
node make-icons.cjs                    # action/category icons, default key, plugin + app icon
DRYRUN=1 node fake-opendeck.cjs out 9  # plugin under a fake OpenDeck: hold, tap, shared number, multi action, safety, page switch
node test-pi.cjs pi-shots              # settings panel in Chromium + screenshots
node make-docs.cjs pi-shots            # docs/keys.png, docs/settings.png
node sheet.cjs out.png a.svg b.svg     # key snapshots side by side
bash package.sh                        # dist/se.wolfpack.idusbuttonbox.sdPlugin.zip
```

`DRYRUN=1` runs `lib/joy.py` without `/dev/uinput`: every event goes to `out/events.log` (`time type code value`; buttons are codes 288–303 and 704–719).

Version bump: `make-manifest.cjs` VERSION, the `plugin.js` header + APP_VERSION + BUILD, the installer header, `pi/button.html` eyebrow and CHANGELOG. The manifest Version must equal the release tag minus "v".

Release (from a fresh clone, not the SMB share):

```bash
cd ~ && rm -rf /tmp/bb-build && git clone -q https://github.com/Idus/idus-button-box /tmp/bb-build && cd /tmp/bb-build && bash dev/package.sh >/dev/null && awk '/^## \[X.Y\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md > /tmp/notes-bb.md && gh release create vX.Y --title "Idus Button Box vX.Y" --notes-file /tmp/notes-bb.md dist/se.wolfpack.idusbuttonbox.sdPlugin.zip install-idus-button-box.sh idus-button-box.png
```
