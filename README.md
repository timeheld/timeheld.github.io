# Timeheld website

Buildless marketing site for Timeheld. Editable HTML, CSS and JavaScript live in `dist/`.
The live site is https://timeheld.app/, deployed from `main` in `timeheld/timeheld.github.io` by the GitHub Pages workflow. The separate `TimeheldWebsite` checkout is the older Sites version; this checkout is the current public source.

## Preview

Run `python3 -m http.server 4318 --bind 127.0.0.1 --directory dist` and open
http://127.0.0.1:4318. No dependency installation or build step is required.

## Coming-soon placeholder

`/` currently serves a minimal placeholder (`dist/index.html`): the Timeheld logo,
"Coming soon", a `mailto:support@timeheld.app` link and a "Follow @timeheld.app on
Instagram for announcements" line (https://www.instagram.com/timeheld.app/, new tab,
`rel="noopener noreferrer"`, inline SVG glyph). Nothing else. The full
homepage is preserved unchanged at `preserved/full-site/index.html` (not deployed).
`/privacy/` is live: the Timeheld Beta Privacy Policy v1.4 (`dist/privacy/index.html`,
indexable, wording pinned by `tests/privacy-policy.test.mjs`). `/downloads/`, `/guide/`,
`/releases/` and `404.html` are noindex redirect stubs to `/`; their originals (and the old
privacy page) are preserved unchanged in `preserved/full-site/`.
Tag `full-site-before-placeholder` marks the pre-placeholder state. See `RESTORE-FULL-SITE.md` to restore at launch.
The placeholder uses a self-hosted Basic Latin subset of Inter
(`dist/assets/fonts/`, SIL OFL 1.1, licence alongside). It makes no external requests.

## Release status

Public app downloads remain disabled at the user's request. No app binaries,
ZIPs, profiles, certificates, native host executables or developer credentials
belong in this website or its public source repository.

Browser status: Safari is bundled with the Mac app. Chrome, Edge and Firefox
are shown as "Under development" everywhere on the site, with no public
unpacked/temporary/developer-mode install steps. Keep the `#chrome`, `#edge`,
`#firefox` and `#browser-previews` anchors so existing links keep working.
Do not invent browser store URLs or imply public availability. Replace the
status with a real listing link only after a store release and end-to-end
customer setup are verified. `tests/site-content.test.mjs` enforces this.

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
