# Restoring the full Timeheld website at launch

While the coming-soon placeholder is live, `/` (`dist/index.html`) shows only the
Timeheld logo, "Coming soon" and `support@timeheld.app`. Nothing from the full site
was deleted:

- The full homepage is preserved byte-for-byte at `preserved/full-site/index.html`.
  It is outside `dist/`, so it is not deployed or publicly reachable.
- `dist/privacy/`, `dist/downloads/`, `dist/guide/`, `dist/releases/`, `dist/404.html`,
  `dist/site.js`, `dist/demo-clock.mjs`, `dist/styles.css` and all assets are unchanged.
- The git tag `full-site-before-placeholder` marks `main` exactly as it was
  before the placeholder (commit `0e955a6`, the PR #4 merge).

## Option A (preferred): revert the placeholder merge

This undoes everything the placeholder PR changed: the placeholder page, the self-hosted
Inter subset, the check-site/test changes and this file. It keeps every later commit.

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

If later commits touched the same files and the revert conflicts, use Option B.

## Option B: move the preserved homepage back by hand

```sh
cd timeheld.github.io
git fetch origin --tags
git checkout main
git pull --ff-only
git checkout -b restore-full-site
git mv -f preserved/full-site/index.html dist/index.html
git checkout full-site-before-placeholder -- check-site.py \
  tests/site-content.test.mjs tests/support-contact.test.mjs README.md
git rm tests/placeholder.test.mjs RESTORE-FULL-SITE.md
# Optional: the Inter subset is only used by the placeholder.
git rm -r dist/assets/fonts
# This must print nothing: the restored homepage matches the tagged original.
git diff full-site-before-placeholder -- dist/index.html
```

Before you restore, review the full homepage copy. It still describes the
pre-launch state, for example "Public downloads are not available yet" and
Chrome, Edge and Firefox "Under development". Update it for the launch in the
same branch.

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
curl -fsS -o /dev/null -w '%{http_code}\n' https://timeheld.app/privacy/   # expected: 200
```

GitHub Pages may cache for a few minutes. Add `?v=$(date +%s)` to the URL or use a
private browser window if the old page still shows.
