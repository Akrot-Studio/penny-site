-- Penny newsletter sign-ups (Cloudflare D1 "penny-newsletter", bound to the website as NEWSLETTER).
-- Apply: npx wrangler d1 execute penny-newsletter --remote --file tools/newsletter-schema.sql
-- Export: npx wrangler d1 execute penny-newsletter --remote --command "SELECT email, created, source FROM subscribers ORDER BY created" --json
CREATE TABLE IF NOT EXISTS subscribers (
  email   TEXT PRIMARY KEY,          -- lower-cased
  created TEXT NOT NULL,             -- ISO time of sign-up
  source  TEXT,                      -- page the form was on, e.g. /changelog
  consent TEXT NOT NULL,             -- the exact wording the person agreed to
  lang    TEXT,                      -- browser language, for later
  token   TEXT NOT NULL UNIQUE       -- secret for the unsubscribe link
);
-- sign-ups per visitor per day, to slow down abuse; the key is a salted hash, never an IP address
CREATE TABLE IF NOT EXISTS rate (
  k   TEXT PRIMARY KEY,
  n   INTEGER NOT NULL,
  day TEXT NOT NULL
);
