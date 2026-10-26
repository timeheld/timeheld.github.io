# Timeheld website

Buildless marketing site for Timeheld. Editable HTML, CSS and JavaScript live in `dist/`.
The live site is https://timeheld.app/, deployed from `main` in `timeheld/timeheld.github.io` by the GitHub Pages workflow. The separate `TimeheldWebsite` checkout is the older Sites version; this checkout is the current public source.

## Preview

Run `python3 -m http.server 4318 --bind 127.0.0.1 --directory dist` and open
http://127.0.0.1:4318. No dependency installation or build step is required.

## Release status

Public app downloads remain disabled at the user's request. No app binaries,
ZIPs, profiles, certificates, native host executables or developer credentials
belong in this website or its public source repository.

The browser pages now describe the Mac build-93 testing previews: Safari is
bundled, Chrome passed a live start/open-page-block/release check, and Edge and
Firefox packages are built but awaiting real-browser acceptance. Setup guidance
is for invited testers who already have the Mac update. Do not invent browser
store URLs or imply public availability before signed/store releases exist.
The preview files are opened from the installed app, not downloaded here.

Analytics imagery uses synthetic data from the app's isolated renderer.
The interactive timer is a presentation demo; it never blocks browser sites.

## Checks

Run `node --input-type=module --check < dist/site.js`,
`node --test tests/*.test.mjs`, and `python3 check-site.py`.

Timer and Superfocus use ten-second countdowns. Stopwatch counts up until
the visitor pauses or resets it, with minutes and hours formatted correctly. The phone shield follows running, paused and finished states.
Superfocus disables pause, reset and mode changes until its commitment ends.
The simulated shield follows the native iPhone ShieldConfiguration source: the
52×56 mark, dark background, mode-specific text, and green/red Close button.
Close dismisses the simulated app; reopening Safari while focusing shows the shield again.
This website animation never changes the visitor’s real device.

Pause/resume uses explicit state actions. Clock ticks leave controls untouched;
controller regression checks cover repeated pause/resume, ticker ownership and phone state.

Layout QA includes all preview modes at 320, 390, 768, 1024, 1440 and
1920 CSS pixels, long stopwatch labels, and the supporting pages. Clock
explanations sit outside the dial and status rows wrap without clipping.
