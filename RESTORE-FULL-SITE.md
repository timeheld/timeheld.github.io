# Restoring the full Timeheld website at launch

While the coming-soon placeholder is live, only one real page is public:
`/` (`dist/index.html`) shows only the Timeheld logo, "Coming soon" and `support@timeheld.app`.

Every other page, including `/privacy/`, is a redirect stub to `/` (meta refresh + `location.replace('/')`,
`<meta name="robots" content="noindex">`, canonical `https://timeheld.app/`, a fallback link):

| Public URL | Stub in `dist/` | Original preserved at |
|---|---|---|
| `/privacy/` | `dist/privacy/index.html` | `preserved/full-site/privacy/index.html` |
| `/downloads/` | `dist/downloads/index.html` | `preserved/full-site/downloads/index.html` |
| `/guide/` | `dist/guide/index.html` | `preserved/full-site/guide/index.html` |
| `/releases/` | `dist/releases/index.html` | `preserved/full-site/releases/index.html` |
| any unknown URL (GitHub Pages 404) | `dist/404.html` | `preserved/full-site/404.html` |

Also preserved:

- `preserved/full-site/index.html`: the full homepage.

Every preserved file is byte-for-byte identical to `main` before the placeholder;
`tests/redirect-stubs.test.mjs` pins their sha256. `preserved/` is outside `dist/`, so it is
not deployed. `dist/site.js`, `dist/demo-clock.mjs`, `dist/styles.css` and all assets
are unchanged. The git tag `full-site-before-placeholder` marks `main` exactly as it was
before the placeholder (commit `0e955a6`, the PR #4 merge).

**Privacy caution:** `/privacy/` is the Chrome Web Store privacy URL, so restore it before
(or together with) any store submission. `preserved/full-site/privacy/index.html` is the
October 25, 2026 policy. If a newer policy has been approved since (for example privacy
policy v0.8 from Legal) or has already been committed to `dist/privacy/index.html`, do
**not** restore the preserved copy over it, which would roll the policy back. Publish the
approved version instead, with the original header and footer (Option B, step 3).

## Option A (preferred if nothing else changed): revert the placeholder merge

This undoes everything the placeholder PR changed: the placeholder page, all four redirect
stubs (including `/privacy/`), the self-hosted Inter subset, the check-site/test
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
#    3a. If no newer policy has been approved and dist/privacy/index.html is still the
#        stub (check with `grep -c noindex dist/privacy/index.html`: prints 1, and
#        `git log --oneline full-site-before-placeholder..HEAD -- dist/privacy/index.html`
#        lists only the placeholder PR commits), restore the original:
git mv -f preserved/full-site/privacy/index.html dist/privacy/index.html
git diff full-site-before-placeholder -- dist/privacy/index.html   # prints nothing
#    3b. Otherwise (a newer policy, e.g. v0.8, is approved or committed): skip 3a. Build
#        dist/privacy/index.html from preserved/full-site/privacy/index.html (keep its <head>,
#        <header class="site-header">…</header> and footer) with the approved policy text in
#        <main>, make sure it has no noindex/refresh, then:
#        git rm preserved/full-site/privacy/index.html

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
