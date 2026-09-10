/* Cloudflare Worker: receives page edits from the browser and commits them to GitHub.
   Secrets (wrangler secret put): GITHUB_TOKEN. Vars (wrangler.toml): REPO, BRANCH, ALLOWED_ORIGIN. */
const PAGES = new Set(['index','culture','gatherings','governance','dues','building','projects','calendar','resources']);
const MAX_BYTES = 600 * 1024;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/save') return json(await save(request, env), 200, cors);
      if (request.method === 'POST' && url.pathname === '/restore') return json(await restore(request, env), 200, cors);
      if (request.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'esm-edit', repo: env.REPO }, 200, cors);
      return json({ ok: false, error: 'not found' }, 404, cors);
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) }, 400, cors);
    }
  }
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim());
  const allow = allowed.includes('*') || allowed.includes(origin) ? (origin || '*') : allowed[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}
function json(obj, status, headers) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } }); }

function cleanName(n) { return String(n || '').replace(/[\r\n<>]/g, '').trim().slice(0, 60) || 'a neighbor'; }
function pagePath(page) { if (!PAGES.has(page)) throw new Error('unknown page'); return `pages/${page}.html`; }

/* Remove anything that could run script for other visitors; keep everything else as the editor produced it. */
function sanitize(html) {
  let h = String(html);
  if (h.length > MAX_BYTES) throw new Error('page too large');
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<script[^>]*>/gi, '');
  h = h.replace(/<(object|embed|applet)[\s\S]*?<\/\1>/gi, '').replace(/<(object|embed|applet)[^>]*>/gi, '');
  h = h.replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  h = h.replace(/(href|src|action)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
  h = h.replace(/<iframe\b([^>]*)>/gi, (m, attrs) => /src\s*=\s*["']https:\/\/(calendar\.google\.com|www\.google\.com\/calendar|docs\.google\.com|drive\.google\.com|www\.youtube\.com)\//i.test(attrs) ? m : '');
  return h;
}

async function gh(env, path, init = {}) {
  const r = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'esm-edit-worker', 'X-GitHub-Api-Version': '2022-11-28', ...(init.headers || {}) }
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${body.message || 'error'}`);
  return body;
}
const b64e = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));

async function getFile(env, path, ref) {
  const f = await gh(env, `/repos/${env.REPO}/contents/${path}?ref=${encodeURIComponent(ref || env.BRANCH || 'main')}`);
  return { sha: f.sha, text: b64d(f.content) };
}
async function putFile(env, path, text, sha, message) {
  return gh(env, `/repos/${env.REPO}/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message, content: b64e(text), sha, branch: env.BRANCH || 'main' }) });
}
function headerComment(text) { const m = text.match(/^<!--[\s\S]*?-->\s*/); return m ? m[0] : ''; }

async function save(request, env) {
  const { page, html, name } = await request.json();
  const path = pagePath(page);
  const body = sanitize(html);
  if (!body.trim()) throw new Error('empty page');
  const cur = await getFile(env, path);
  const next = headerComment(cur.text) + body.trim() + '\n';
  if (next === cur.text) return { ok: true, unchanged: true };
  const res = await putFile(env, path, next, cur.sha, `Edit by ${cleanName(name)}: ${page}`);
  return { ok: true, commit: res.commit && res.commit.html_url };
}

async function restore(request, env) {
  const { page, sha, name } = await request.json();
  const path = pagePath(page);
  if (!/^[0-9a-f]{7,40}$/i.test(sha || '')) throw new Error('bad version id');
  const old = await getFile(env, path, sha);
  const cur = await getFile(env, path);
  if (old.text === cur.text) return { ok: true, unchanged: true };
  const res = await putFile(env, path, old.text, cur.sha, `Restore by ${cleanName(name)}: ${page} to ${sha.slice(0, 7)}`);
  return { ok: true, commit: res.commit && res.commit.html_url };
}
