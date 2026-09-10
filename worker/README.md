# esm-edit worker

Receives edits from the website and commits them to the repository.

Deploy (one time, from this folder):
```
npx wrangler login
npx wrangler secret put GITHUB_TOKEN   # a GitHub token with Contents: read/write on the site repository
npx wrangler deploy
```
Then put the printed URL into `site.config.json` as `editApi` and commit.
