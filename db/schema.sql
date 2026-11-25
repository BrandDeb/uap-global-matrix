-- ===========================================================================
-- db/schema.sql — UAP Global Matrix (plain Postgres 16+ with PostGIS)
-- ---------------------------------------------------------------------------
-- Runs on Neon (or any Postgres with the postgis extension). Idempotent: safe
-- to re-run. Apply with `npm run db:migrate`.
--
-- Access model: the app talks to the database ONLY from server code (route
-- handlers / server components) using DATABASE_URL, so there is no row-level
-- security layer — authorization lives in the API routes.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- --- enums -----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE classification_tier AS ENUM ('CLASS_A', 'CLASS_B', 'CLASS_C', 'FLAGGED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sensor_evidence_type AS ENUM
    ('RADAR_VISUAL', 'FLIR_THERMAL', 'OPTICAL_VIDEO', 'OPTICAL_PHOTO', 'SATELLITE_ANOMALY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --- operators (GitHub-verified profiles) ----------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id               text PRIMARY KEY,               -- "github:<numeric id>"
  operator_handle  text NOT NULL UNIQUE,
  avatar_url       text,
  operator_rank    text NOT NULL DEFAULT 'NOVICE_OBSERVER',
  reputation_score integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
-- Synced client state: pilot name, avatar, theme, secrets, badges, arcade bests.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- --- sightings -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uap_sightings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text NOT NULL,
  description          text NOT NULL,
  event_timestamp      timestamptz NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  location_coordinates geography(Point, 4326) NOT NULL,
  location_name        text NOT NULL,
  source_tier          classification_tier NOT NULL DEFAULT 'CLASS_C',
  evidence_types       sensor_evidence_type[] NOT NULL DEFAULT '{}',
  credibility_score    numeric(5, 2) CHECK (credibility_score BETWEEN 0 AND 100),
  media_assets         jsonb NOT NULL DEFAULT '[]',
  is_gov_declassified  boolean NOT NULL DEFAULT false,
  media_gallery        jsonb NOT NULL DEFAULT '[]',
  document_vault_url   text,
  source               text NOT NULL DEFAULT 'citizen'   -- provenance: citizen | seed | nuforc | ...
);
-- Archival metadata (declassified archive, 1942–2026).
ALTER TABLE uap_sightings ADD COLUMN IF NOT EXISTS archive_source text;
ALTER TABLE uap_sightings ADD COLUMN IF NOT EXISTS document_id text;
ALTER TABLE uap_sightings ADD COLUMN IF NOT EXISTS craft_morphology text;
ALTER TABLE uap_sightings ADD COLUMN IF NOT EXISTS era_tag text;
ALTER TABLE uap_sightings ADD COLUMN IF NOT EXISTS primary_source_url text;
CREATE INDEX IF NOT EXISTS uap_sightings_geo_idx  ON uap_sightings USING gist (location_coordinates);
CREATE INDEX IF NOT EXISTS uap_sightings_time_idx ON uap_sightings (event_timestamp DESC);
CREATE INDEX IF NOT EXISTS uap_sightings_created_idx ON uap_sightings (created_at DESC);
CREATE INDEX IF NOT EXISTS uap_sightings_source_idx ON uap_sightings (source);

CREATE TABLE IF NOT EXISTS verification_logs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id                 uuid REFERENCES uap_sightings (id) ON DELETE CASCADE,
  checked_at                  timestamptz NOT NULL DEFAULT now(),
  exif_data_extracted         jsonb NOT NULL DEFAULT '{}',
  is_metadata_authentic       boolean NOT NULL DEFAULT true,
  synthetic_confidence_score  numeric(5, 4),
  aircraft_in_proximity_count integer NOT NULL DEFAULT 0,
  satellite_conjunction       boolean NOT NULL DEFAULT false,
  weather_condition_summary   varchar(255)
);

-- --- community -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uap_intel_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id     uuid NOT NULL REFERENCES uap_sightings (id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES uap_intel_threads (id) ON DELETE CASCADE,
  operator_handle text NOT NULL,
  intel_text      text NOT NULL CHECK (length(intel_text) BETWEEN 1 AND 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS uap_intel_threads_sighting_idx ON uap_intel_threads (sighting_id, created_at);

CREATE TABLE IF NOT EXISTS sighting_co_witnesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id     uuid NOT NULL REFERENCES uap_sightings (id) ON DELETE CASCADE,
  operator_handle text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sighting_id, operator_handle)
);

CREATE TABLE IF NOT EXISTS uap_intel_upvotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id     uuid NOT NULL REFERENCES uap_sightings (id) ON DELETE CASCADE,
  operator_handle text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sighting_id, operator_handle)
);
CREATE INDEX IF NOT EXISTS uap_intel_upvotes_recent_idx ON uap_intel_upvotes (created_at DESC);

CREATE TABLE IF NOT EXISTS uap_ai_briefs (
  sighting_id       uuid PRIMARY KEY REFERENCES uap_sightings (id) ON DELETE CASCADE,
  summary_text      text NOT NULL,
  threat_assessment text NOT NULL DEFAULT 'LOW',
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- --- hotspot clustering ----------------------------------------------------
-- A hotspot is >= 3 sightings within 50 km reported inside a 72 h window.
CREATE TABLE IF NOT EXISTS hotspot_alerts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center           geography(Point, 4326) NOT NULL,
  location_name    text NOT NULL,
  sighting_count   integer NOT NULL,
  severity_level   text NOT NULL,            -- ELEVATED | CRITICAL_FLAP
  last_detected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hotspot_alerts_geo_idx ON hotspot_alerts USING gist (center);

CREATE OR REPLACE FUNCTION sync_hotspot_cluster() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  n integer;
  existing uuid;
BEGIN
  SELECT count(*) INTO n
  FROM uap_sightings s
  WHERE ST_DWithin(s.location_coordinates, NEW.location_coordinates, 50000)
    AND s.event_timestamp BETWEEN NEW.event_timestamp - interval '72 hours'
                              AND NEW.event_timestamp + interval '72 hours';
  IF n < 3 THEN RETURN NEW; END IF;

  SELECT id INTO existing FROM hotspot_alerts h
  WHERE ST_DWithin(h.center, NEW.location_coordinates, 50000)
  ORDER BY h.last_detected_at DESC LIMIT 1;

  IF existing IS NULL THEN
    INSERT INTO hotspot_alerts (center, location_name, sighting_count, severity_level)
    VALUES (NEW.location_coordinates, NEW.location_name, n,
            CASE WHEN n >= 6 THEN 'CRITICAL_FLAP' ELSE 'ELEVATED' END);
  ELSE
    UPDATE hotspot_alerts
       SET sighting_count = n,
           severity_level = CASE WHEN n >= 6 THEN 'CRITICAL_FLAP' ELSE 'ELEVATED' END,
           last_detected_at = now()
     WHERE id = existing;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sighting_cluster_sync ON uap_sightings;
CREATE TRIGGER trg_sighting_cluster_sync
  AFTER INSERT ON uap_sightings
  FOR EACH ROW EXECUTE FUNCTION sync_hotspot_cluster();

-- --- read views (geography decoded to lat/lng) -----------------------------
CREATE OR REPLACE VIEW v_uap_sightings AS
SELECT s.id, s.title, s.description, s.event_timestamp, s.created_at, s.location_name,
       s.source_tier, s.evidence_types, s.credibility_score, s.is_gov_declassified,
       s.media_gallery, s.document_vault_url, s.source,
       ST_Y(s.location_coordinates::geometry) AS latitude,
       ST_X(s.location_coordinates::geometry) AS longitude,
       s.archive_source, s.document_id, s.craft_morphology, s.era_tag, s.primary_source_url
FROM uap_sightings s;

CREATE OR REPLACE VIEW v_hotspot_alerts AS
SELECT h.id, h.location_name, h.sighting_count, h.severity_level, h.last_detected_at,
       ST_Y(h.center::geometry) AS latitude,
       ST_X(h.center::geometry) AS longitude
FROM hotspot_alerts h;

-- --- trending: upvotes in the last 7 days ----------------------------------
CREATE OR REPLACE FUNCTION trending_sightings(max_rows integer DEFAULT 8)
RETURNS TABLE (id uuid, title text, upvote_count bigint)
LANGUAGE sql STABLE AS $$
  SELECT s.id, s.title, count(u.id) AS upvote_count
  FROM uap_intel_upvotes u JOIN uap_sightings s ON s.id = u.sighting_id
  WHERE u.created_at > now() - interval '7 days'
  GROUP BY s.id, s.title
  ORDER BY upvote_count DESC, s.title
  LIMIT max_rows;
$$;

-- --- arcade leaderboards ----------------------------------------------------
CREATE TABLE IF NOT EXISTS arcade_scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game       text NOT NULL,
  handle     text NOT NULL,
  score      integer NOT NULL CHECK (score >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS arcade_scores_game_time_idx ON arcade_scores (game, created_at DESC);
CREATE INDEX IF NOT EXISTS arcade_scores_game_score_idx ON arcade_scores (game, score DESC);

-- --- daily challenge ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_guesses (
  day        integer NOT NULL,
  handle     text NOT NULL,
  guess      text NOT NULL,
  correct    boolean NOT NULL,
  streak     integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, handle)
);

-- --- crop circle gallery -----------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_circles (
  id         text PRIMARY KEY,
  handle     text NOT NULL,
  field      text NOT NULL,
  image      bytea NOT NULL,
  likes      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crop_circles_likes_idx ON crop_circles (likes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS crop_circles_new_idx ON crop_circles (created_at DESC);
