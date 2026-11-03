/* POST /api/redeem { code } -> { key }: turns a code into a signed Penny Pro key that the app checks offline.
   A code can be:
     - a Penny promo code from the codes table (D1, binding NEWSLETTER): single-use gift codes or shared campaign codes,
       each with an optional end date ("until") and an optional Pro length in days (no length = Pro for good)
     - a Lemon Squeezy license key from a Windows purchase (when LS_STORE_ID and LS_PRODUCT_ID are set): checked with
       Lemon Squeezy, which also counts how many devices it has been used on
   The key is signed here with LICENSE_KEY (a Cloudflare secret; the private half of the pair whose public half ships in
   license-public.pem), so codes can never be turned into Pro by editing the app.
   Privacy: only how many times each code was used is kept. No IP address, device id or name is stored; attempts are
   limited to 10 a day per visitor under a hash that changes daily. */
const PER_DAY = 10, LS_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const out = (body, status = 200) => Response.json(body, { status, headers: { ...CORS, 'Cache-Control': 'no-store' } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(env, payload) {
  const pem = String(env.LICENSE_KEY || '').replace(/-----[^-]+-----|\s/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  return 'PENNY-' + b64u(data) + '.' + b64u(await crypto.subtle.sign({ name: 'Ed25519' }, key, data));
}
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString();

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  if (!env.LICENSE_KEY) return out({ error: 'Codes aren’t available right now. Please try again later.' }, 503);
  let b; try { b = await request.json(); } catch { return out({ error: 'Please try again.' }, 400); }
  const raw = String(b.code || '').trim();
  if (!raw || raw.length > 64) return out({ error: 'Enter the code exactly as you received it.' }, 400);

  const db = env.NEWSLETTER, day = new Date().toISOString().slice(0, 10);
  const k = await sha(day + '|' + (request.headers.get('CF-Connecting-IP') || '') + '|penny-redeem');
  await db.prepare('DELETE FROM rate WHERE day <> ?').bind(day).run();
  const r = await db.prepare('INSERT INTO rate (k, n, day) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n').bind(k, day).first();
  if (r && r.n > PER_DAY) return out({ error: 'Too many tries today. Please try again tomorrow.' }, 429);
  const base = { v: 1, id: crypto.randomUUID(), plan: 'pro', email: '', issued: new Date().toISOString() };

  /* a Windows purchase: a Lemon Squeezy license key */
  if (LS_KEY.test(raw)) {
    if (!env.LS_STORE_ID || !env.LS_PRODUCT_ID) return out({ error: 'That code isn’t valid.' }, 404);
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ license_key: raw, instance_name: 'Penny ' + day })
    });
    const j = await res.json().catch(() => ({}));
    const m = j.meta || {};
    if (String(m.store_id) !== String(env.LS_STORE_ID) || String(m.product_id) !== String(env.LS_PRODUCT_ID)) return out({ error: 'That code isn’t valid.' }, 404);
    if (!j.activated) return out({ error: j.error && /limit/i.test(j.error) ? 'This purchase is already used on the most devices it allows. Write to support@akrot.app and we’ll help.' : 'That purchase code couldn’t be used. Write to support@akrot.app and we’ll help.' }, 409);
    return out({ key: await sign(env, { ...base, name: 'Penny Pro', source: 'purchase', expires: null }), plan: 'lifetime' });
  }

  /* a Penny promo code */
  const code = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const c = await db.prepare('SELECT code, kind, max_uses, uses, until, days, active FROM codes WHERE code = ?').bind(code).first();
  if (!c || !c.active) return out({ error: 'That code isn’t valid.' }, 404);
  if (c.until && day > c.until) return out({ error: 'That code has ended.' }, 410);
  if (c.max_uses != null && c.uses >= c.max_uses) return out({ error: c.kind === 'single' ? 'That code has already been used.' : 'That code has run out.' }, 410);
  const upd = await db.prepare('UPDATE codes SET uses = uses + 1 WHERE code = ? AND (max_uses IS NULL OR uses < max_uses)').bind(code).run();
  if (!upd.meta || !upd.meta.changes) return out({ error: 'That code has run out.' }, 410);   // the last use went to someone else a moment ago
  await db.prepare('INSERT INTO redemptions (code, at) VALUES (?, ?)').bind(code, base.issued).run();
  const expires = c.days ? addDays(c.days) : null;
  return out({ key: await sign(env, { ...base, name: 'Penny Pro (' + code + ')', source: 'code', code, expires }), plan: expires ? 'until' : 'lifetime', expires });
}
