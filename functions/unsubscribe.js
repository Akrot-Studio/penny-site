/* /unsubscribe?t=<token>: the link every newsletter will carry. Opening it asks first (so mail scanners that
   open links don't unsubscribe anyone); the button removes the address from the list for good. */
import { page } from './_lib.js';

const form = t => `<p class="sub">Click below and your address is removed from Penny's newsletter list straight away.</p>
<form method="post" class="cta"><input type="hidden" name="t" value="${String(t).replace(/[^\w-]/g, '')}"><button class="btn copper" type="submit">Unsubscribe</button><a class="btn ghost" href="/">Keep me on the list</a></form>`;

export async function onRequestGet({ request }) {
  const t = new URL(request.url).searchParams.get('t');
  return t ? page('Unsubscribe from the newsletter?', form(t))
    : page('Unsubscribe', '<p class="sub">Use the unsubscribe link at the bottom of any newsletter, or write to <a href="mailto:akrotstudio@gmail.com" style="color:var(--copper-hi)">akrotstudio@gmail.com</a> and we\'ll remove you.</p>');
}

export async function onRequestPost({ request, env }) {
  let t = ''; try { t = String((await request.formData()).get('t') || ''); } catch {}
  if (t) await env.NEWSLETTER.prepare('DELETE FROM subscribers WHERE token = ?').bind(t).run();
  return page("You're unsubscribed", '<p class="sub">Your address is off the list. Sorry to see you go.</p><div class="cta"><a class="btn copper" href="/">Back to Penny</a></div>');
}
