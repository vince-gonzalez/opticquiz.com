-- ===== OPTICQUIZ IMPACT ARCHIVE — D1 SCHEMA =====
--   Database:  opticquiz-impact   (Cloudflare D1)
--   Binding:   IMPACT
--   Purpose:   A voluntary, consented, revocable record of people OpticQuiz helped.
--              This table IS the citable dataset. Treat it as scientific documentation.
--
--   RULES BAKED INTO THE SCHEMA:
--     1. Nothing is stored unless a human pressed a button.
--     2. created_utc is DAY precision only (no time-of-day) — a timestamp to the second
--        is a fingerprint; a date is a fact. Day precision is enough to cite.
--     3. No IP, no user-agent, no cookie, no referrer, no id we generated on a page view.
--     4. Nothing is public until status='approved' AND consent_public=1. Two locks.
--     5. Every record carries withdraw_hash: consent the submitter can revoke, forever,
--        with no account. That is what makes this an ethical archive and not a testimonial
--        wall.
--     6. contact is PRIVATE. It is never emitted by any public endpoint. Ever.
--
--   Apply with:
--     npx wrangler d1 execute opticquiz-impact --remote --file=./schema.sql
-- ===== END =====

CREATE TABLE IF NOT EXISTS impact (
  id             TEXT PRIMARY KEY,            -- public record id, e.g. "oq-8f2a41c9"
  created_utc    TEXT NOT NULL,               -- ISO date, DAY precision: "2026-08-03"
  helped         TEXT NOT NULL,               -- yes | partly | no
  surface        TEXT NOT NULL,               -- which OpticQuiz surface (see API validation)
  cvd_type       TEXT,                        -- protan|deutan|tritan|other|unknown|none|undisclosed
  role           TEXT,                        -- person|developer|designer|educator|clinician|researcher|other
  region         TEXT,                        -- optional, coarse (country / region), free text, capped
  story          TEXT,                        -- optional narrative, in the submitter's words
  before_after   TEXT,                        -- optional: what was wrong / what changed
  consent_public INTEGER NOT NULL DEFAULT 0,  -- 1 only if they ticked the publish box
  contact        TEXT,                        -- PRIVATE. never published. optional.
  version        TEXT,                        -- tool/page version string, if the surface sent one
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|withdrawn
  withdraw_hash  TEXT NOT NULL,               -- sha256(withdraw code). the code itself is never stored.
  reviewed_utc   TEXT                         -- day the maintainer reviewed it
);

CREATE INDEX IF NOT EXISTS impact_public ON impact (status, consent_public, created_utc);
CREATE INDEX IF NOT EXISTS impact_status ON impact (status);

-- Cache for ADOPTION numbers pulled from public registries (npm, PyPI, ...).
-- These are fetched live from third-party APIs and cached here so the page stays fast.
-- A failed fetch stores nothing: the endpoint reports null + the source URL rather than
-- serving a number we cannot currently verify.
CREATE TABLE IF NOT EXISTS adoption_cache (
  k           TEXT PRIMARY KEY,
  json        TEXT NOT NULL,
  fetched_utc TEXT NOT NULL
);

-- Abuse control ONLY. Key is a salted SHA-256 of the request IP, truncated, bucketed by
-- hour. It cannot be reversed to an IP, it is never joined to a submission, and rows are
-- deleted after the hour they belong to. This is disclosed verbatim on /impact/ and
-- /privacy/. It exists so a script cannot flood the moderation queue.
CREATE TABLE IF NOT EXISTS rl (
  k   TEXT PRIMARY KEY,
  n   INTEGER NOT NULL,
  exp INTEGER NOT NULL
);
