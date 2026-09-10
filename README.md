# Ecovilla San Mateo — Neighbor Network

The community website for Ecovilla San Mateo neighbors. Anyone can edit it: open any page and use the **Edit this page** button.

## How it works
- `pages/*.html` — the content of each page (one file per page). This is what the in-page editor changes.
- `assets/` — stylesheet, scripts, images and the icon sprite.
- `build.py` — wraps each page in the shared header/nav/footer and writes `_site/`.
- `.github/workflows/deploy.yml` — rebuilds and publishes to GitHub Pages on every commit (about a minute).
- `worker/` — the small Cloudflare Worker that receives edits from the browser and commits them to this repository.
- `site.config.json` — the repository name and the edit service URL, injected into every page at build time.

## Editing
Every save is a git commit with the editor's name in the message, so the full history is preserved. The editor's **History** panel lists previous versions of a page and can restore any of them.

## Local preview
```
python3 build.py && python3 -m http.server -d _site 8765
```
