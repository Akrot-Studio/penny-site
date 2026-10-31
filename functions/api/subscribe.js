/* POST /api/subscribe: adds an address to the newsletter list (D1, binding NEWSLETTER).
   Fields: email, source (the page), lang, and "website", a hidden trap field only bots fill in.
   Replies JSON to the site's script, or a small page when the form is sent without JavaScript.
   No IP address is stored: at most 5 sign-ups a day per visitor, counted under a hash that changes daily. */
import { CONSENT, page } from '../_lib.js';

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i, PER_DAY = 5;

const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

export async function onRequestPost({ request, env }) {
  const json = (request.headers.get('Accept') || '').includes('application/json');
  const reply = (ok, msg, status = 200) => json
    ? Response.json({ ok, msg }, { status, headers: { 'Cache-Control': 'no-store' } })
    : page(ok ? "You're on the list" : 'That didn\'t work', `<p class="sub">${msg}</p><div class="cta"><a class="btn copper" href="/">Back to Penny</a></div>`, status);

  let f; try { f = await request.formData(); } catch { return reply(false, 'Please try again.', 400); }
  const email = String(f.get('email') || '').trim().toLowerCase();
  if (f.get('website')) return reply(true, 'Thanks! The next newsletter will find you.');   // a bot: pretend it worked
  if (email.length > 254 || !EMAIL.test(email)) return reply(false, 'Please check your email address.', 400);

  const db = env.NEWSLETTER, day = new Date().toISOString().slice(0, 10);
  const k = await sha(day + '|' + (request.headers.get('CF-Connecting-IP') || '') + '|penny-newsletter');
  await db.prepare('DELETE FROM rate WHERE day <> ?').bind(day).run();
  const r = await db.prepare('INSERT INTO rate (k, n, day) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n').bind(k, day).first();
  if (r && r.n > PER_DAY) return reply(false, 'Too many sign-ups from here today. Please try again tomorrow.', 429);

  const source = String(f.get('source') || '').slice(0, 80), lang = String(f.get('lang') || '').slice(0, 16);
  await db.prepare('INSERT INTO subscribers (email, created, source, consent, lang, token) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING')
    .bind(email, new Date().toISOString(), source, CONSENT, lang, crypto.randomUUID()).run();
  return reply(true, "Thanks! You're on the list. We'll only write when there's something worth reading.");
}
