# Restoring the full Timeheld website at launch

While the coming-soon placeholder is live, only two real pages are public:

- `/` (`dist/index.html`) shows only the Timeheld logo, "Coming soon" and `support@timeheld.app`.
- `/privacy/` (`dist/privacy/index.html`) is live and indexable (it is the Chrome Web Store
  privacy URL). Its policy text is unchanged; only the header nav and the footer links to
  hidden pages were removed so it doesn't send visitors into redirects.

Every other page is a redirect stub to `/` (meta refresh + `location.replace('/')`,
`<meta name="robots" content="noindex">`, canonical `https://timeheld.app/`, a fallback link):

| Public URL | Stub in `dist/` | Original preserved at |
|---|---|---|
| `/downloads/` | `dist/downloads/index.html` | `preserved/full-site/downloads/index.html` |
| `/guide/` | `dist/guide/index.html` | `preserved/full-site/guide/index.html` |
| `/releases/` | `dist/releases/index.html` | `preserved/full-site/releases/index.html` |
| any unknown URL (GitHub Pages 404) | `dist/404.html` | `preserved/full-site/404.html` |

Also preserved:

- `preserved/full-site/index.html`: the full homepage.
- `preserved/full-site/privacy/index.html`: the privacy page with its original header and footer.

Every preserved file is byte-for-byte identical to `main` before the placeholder;
`tests/redirect-stubs.test.mjs` pins their sha256. `preserved/` is outside `dist/`, so it is
not deployed. `dist/site.js`, `dist/demo-clock.mjs`, `dist/styles.css` and all assets
are unchanged. The git tag `full-site-before-placeholder` marks `main` exactly as it was
before the placeholder (commit `0e955a6`, the PR #4 merge).

**Privacy caution:** if `/privacy/` has been updated since the placeholder (for example
privacy policy v0.8 has been published), do **not** copy `preserved/full-site/privacy/index.html`
over it. That would roll the policy back. Restore only the header and footer (Option B, step 3).

## Option A (preferred if nothing else changed): revert the placeholder merge

This undoes everything the placeholder PR changed: the placeholder page, all four redirect
stubs, the privacy header/footer edit, the self-hosted Inter subset, the check-site/test
changes and this file. It keeps every later commit.

```sh
cd timeheld.github.io            # a clean clone of timeheld/timeheld.github.io
git fetch origin --tags
git checkout main
git pull --ff-only
git checkout -b restore-full-site
MERGE=$(gh pr list --repo timeheld/timeheld.github.io --state merged \
  --head coming-soon-placeholder --json mergeCommit --jq '.[0].mergeCommit.oid')
echo "$MERGE"                     # must print the placeholder PR's merge commit
git revert -m 1 --no-edit "$MERGE"
```

If the revert conflicts (most likely in `dist/privacy/index.html` after a policy update),
run `git revert --abort` and use Option B.

## Option B: move the preserved pages back by hand

```sh
cd timeheld.github.io
git fetch origin --tags
git checkout main
git pull --ff-only
git checkout -b restore-full-site

# 1. Homepage, downloads, guide, release notes and 404 replace the placeholder and stubs.
for page in index.html downloads/index.html guide/index.html releases/index.html 404.html; do
  git mv -f "preserved/full-site/$page" "dist/$page"
done

# 2. Each restored page must match the tagged original exactly (this prints nothing).
git diff full-site-before-placeholder -- dist/index.html dist/downloads/index.html \
  dist/guide/index.html dist/releases/index.html dist/404.html

# 3. Privacy page.
#    3a. If dist/privacy/index.html is unchanged since the placeholder (check with
#        `git log --oneline full-site-before-placeholder..HEAD -- dist/privacy/index.html`:
#        only the placeholder commit(s) listed), restore the original:
git mv -f preserved/full-site/privacy/index.html dist/privacy/index.html
git diff full-site-before-placeholder -- dist/privacy/index.html   # prints nothing
#    3b. Otherwise (the policy was updated, e.g. v0.8): skip 3a. Instead copy the
#        <header class="site-header">…</header> element and the footer's link group
#        <div><a href="/downloads/">Downloads</a>…<a href="mailto:support@timeheld.app">…</a></div>
#        from preserved/full-site/privacy/index.html into dist/privacy/index.html,
#        keep the new policy text, then: git rm preserved/full-site/privacy/index.html

# 4. Checks and tests back to the full-site versions.
git checkout full-site-before-placeholder -- check-site.py \
  tests/site-content.test.mjs tests/support-contact.test.mjs README.md
git rm tests/placeholder.test.mjs tests/redirect-stubs.test.mjs RESTORE-FULL-SITE.md
# Optional: the Inter subset is only used by the placeholder.
git rm -r dist/assets/fonts

# 5. preserved/ must now be empty (prints nothing).
git ls-files preserved
```

Before you restore, review the full-site copy. It still describes the pre-launch state,
for example "Public downloads are not available yet" and Chrome, Edge and Firefox
"Under development". Update it for the launch in the same branch.

## Check, open the PR, deploy

```sh
node --input-type=module --check < dist/site.js
node --test tests/*.test.mjs
python3 check-site.py
python3 -m http.server 4318 --bind 127.0.0.1 --directory dist   # then open http://127.0.0.1:4318/
git commit -am "Restore the full Timeheld website"   # Option B only; Option A has already committed
git push -u origin restore-full-site
gh pr create --base main --head restore-full-site \
  --title "Restore the full Timeheld website" --body "Removes the coming-soon placeholder. See RESTORE-FULL-SITE.md."
```

Merge the PR once it's reviewed. The Pages workflow (`.github/workflows/pages.yml`) runs
on every push to `main` and deploys `dist/`.

## Verify the Pages deploy

```sh
gh run list --repo timeheld/timeheld.github.io --workflow pages.yml --limit 1
gh run watch --repo timeheld/timeheld.github.io "$(gh run list --repo timeheld/timeheld.github.io \
  --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
curl -fsS https://timeheld.app/ | grep -o '<title>[^<]*</title>'
# expected: <title>Timeheld — Make the time count</title>  (not "Timeheld — Coming soon")
curl -fsS https://timeheld.app/ | grep -c 'id="browsers"'          # expected: 1
for path in privacy downloads guide releases; do
  printf '%s ' "$path"; curl -fsS -o /dev/null -w '%{http_code}\n' "https://timeheld.app/$path/"   # expected: 200
done
for path in downloads guide releases privacy; do
  curl -fsS "https://timeheld.app/$path/" | grep -c 'noindex\|http-equiv="refresh"'   # expected: 0 for each
done
curl -sS https://timeheld.app/does-not-exist | grep -o '<title>[^<]*</title>'
# expected: <title>Page not found — Timeheld</title>
```

GitHub Pages may cache for a few minutes. Add `?v=$(date +%s)` to the URL or use a
private browser window if the old page still shows.
