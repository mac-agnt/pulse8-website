-- Pulse 8 website: its own schema and a limited login role in the
-- Pulse 8 Blended Learning Supabase project.
--
-- Run once, by hand, in Supabase > SQL Editor (as postgres). Safe to run again:
-- a second run only changes the password.
--
-- Before running: replace the password placeholder below with a long random
-- one (for example 40 characters from a password manager, letters and digits
-- only, so it can go into the connection URL as it is). Do NOT save the
-- real password in this file or anywhere in the repo; it goes only into the
-- BOOKING_DATABASE_URL variable in Vercel. The script refuses to run with the
-- placeholder still in place.
--
-- What it does:
--   * a login role `website_app`, with no other rights in the database;
--   * a schema `website` that only `website_app` can use. Supabase's API
--     roles (anon, authenticated, service_role) get nothing in it, so the
--     website's bookings and shop orders, which hold customers' names and
--     addresses, can never be read through Supabase's REST API, even if
--     `website` were added to the exposed schemas later;
--   * `website_app` may create tables there and select, insert, update and
--     delete on them. The website creates its three tables on first use
--     (booking_orders, shop_orders, booking_events) with row level security on.
--
-- Do not add `website` to Settings > API > Exposed schemas.

DO $$
DECLARE
  -- <<< replace this, keep the quotes >>>
  pw text := 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
BEGIN
  IF pw LIKE 'REPLACE_WITH%' OR length(pw) < 24 THEN
    RAISE EXCEPTION 'Set a long random password (24+ characters) in place of the placeholder first.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'website_app') THEN
    EXECUTE format('ALTER ROLE website_app WITH LOGIN PASSWORD %L', pw);
  ELSE
    EXECUTE format(
      'CREATE ROLE website_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 PASSWORD %L',
      pw
    );
  END IF;
END $$;

-- Its own schema, owned by postgres, closed to everyone else.
CREATE SCHEMA IF NOT EXISTS website;
REVOKE ALL ON SCHEMA website FROM PUBLIC;
REVOKE ALL ON SCHEMA website FROM anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA website FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA website FROM anon, authenticated, service_role;

-- website_app: use the schema and create its tables there.
GRANT USAGE, CREATE ON SCHEMA website TO website_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA website TO website_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA website TO website_app;

-- Anything postgres creates in the schema later: website_app may use it,
-- the API roles may not.
ALTER DEFAULT PRIVILEGES IN SCHEMA website GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO website_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA website GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO website_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA website REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA website REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;

-- Check: expect website_app true/true, the API roles false.
SELECT
  r AS role,
  has_schema_privilege(r, 'website', 'USAGE') AS can_use_website,
  has_schema_privilege(r, 'website', 'CREATE') AS can_create_in_website
FROM unnest(ARRAY['website_app', 'anon', 'authenticated', 'service_role']) AS r;
