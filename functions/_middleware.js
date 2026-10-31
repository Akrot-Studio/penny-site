/* Penny's website moved from studdit.app to penny.akrot.app: old addresses forward there, keeping the page and query.
   Everything else passes through. */
const OLD = new Set(['studdit.app', 'www.studdit.app']);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (!OLD.has(url.hostname)) return next();
  url.hostname = 'penny.akrot.app'; url.protocol = 'https:'; url.port = '';
  return Response.redirect(url.toString(), 301);
}
