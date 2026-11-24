-- ===========================================================================
-- db/seed.sql — demo dataset of well-known, publicly documented UAP cases.
-- Coordinates are approximate; credibility scores are illustrative.
-- Idempotent: replaces every row tagged source='seed'. Apply with
-- `npm run db:seed`.
-- ===========================================================================

BEGIN;

-- Seed rows are historical and far apart, so skip the clustering trigger.
ALTER TABLE uap_sightings DISABLE TRIGGER trg_sighting_cluster_sync;

DELETE FROM uap_sightings WHERE source = 'seed';

INSERT INTO uap_sightings
  (title, description, event_timestamp, location_coordinates, location_name,
   source_tier, evidence_types, credibility_score, is_gov_declassified, source)
VALUES
  ('Roswell Debris Recovery', 'Rancher reports unusual debris field; USAAF press release announces a recovered "flying disc", retracted within a day as a weather balloon.', '1947-07-08T14:00:00Z', 'SRID=4326;POINT(-104.5230 33.3943)', 'Roswell, New Mexico, USA', 'CLASS_B', '{}', 71, true, 'seed'),
  ('Kenneth Arnold Sighting', 'Private pilot reports nine bright objects moving "like a saucer skipped across water" near Mount Rainier at an estimated 1,200 mph.', '1947-06-24T21:00:00Z', 'SRID=4326;POINT(-121.7603 46.8523)', 'Mount Rainier, Washington, USA', 'CLASS_B', '{}', 68, false, 'seed'),
  ('Washington D.C. Flyover', 'Multiple radar returns over restricted airspace near the Capitol on consecutive weekends; jets scrambled, visual contact reported.', '1952-07-19T23:40:00Z', 'SRID=4326;POINT(-77.0365 38.8977)', 'Washington, D.C., USA', 'CLASS_A', '{RADAR_VISUAL}', 86, true, 'seed'),
  ('Levelland Engine Failures', 'Several motorists report a glowing egg-shaped object; vehicle engines and headlights fail as it approaches.', '1957-11-02T23:00:00Z', 'SRID=4326;POINT(-102.3488 33.5873)', 'Levelland, Texas, USA', 'CLASS_C', '{}', 58, true, 'seed'),
  ('Socorro Landing Trace', 'Police officer witnesses an oval craft with two small figures; landing impressions and scorched vegetation documented.', '1964-04-24T17:45:00Z', 'SRID=4326;POINT(-106.8908 34.0584)', 'Socorro, New Mexico, USA', 'CLASS_B', '{OPTICAL_PHOTO}', 74, true, 'seed'),
  ('Westall School Encounter', 'Over 200 students and staff observe a disc descend into a nearby paddock before departing at speed.', '1966-04-06T11:00:00Z', 'SRID=4326;POINT(145.1300 -37.9400)', 'Westall, Victoria, Australia', 'CLASS_B', '{}', 70, false, 'seed'),
  ('Malmstrom Missile Shutdown', 'Security personnel report a glowing red object over the launch facility as ICBMs go offline.', '1967-03-16T08:00:00Z', 'SRID=4326;POINT(-111.1830 47.5050)', 'Malmstrom AFB, Montana, USA', 'CLASS_B', '{RADAR_VISUAL}', 69, true, 'seed'),
  ('Tehran F-4 Intercept', 'Imperial Iranian Air Force F-4s lose instruments and weapons systems when approaching a brilliant object.', '1976-09-19T00:30:00Z', 'SRID=4326;POINT(51.3890 35.6892)', 'Tehran, Iran', 'CLASS_A', '{RADAR_VISUAL}', 84, true, 'seed'),
  ('Rendlesham Forest Incident', 'USAF personnel investigate lights in the forest near RAF Woodbridge; a triangular craft and ground impressions are reported.', '1980-12-26T03:00:00Z', 'SRID=4326;POINT(1.4330 52.0870)', 'Rendlesham Forest, Suffolk, UK', 'CLASS_A', '{}', 81, true, 'seed'),
  ('Trans-en-Provence Trace', 'Farmer reports a craft landing; French GEPAN analysis finds altered soil and plant chlorophyll at the site.', '1981-01-08T17:00:00Z', 'SRID=4326;POINT(6.3500 43.5040)', 'Trans-en-Provence, France', 'CLASS_B', '{}', 73, true, 'seed'),
  ('Hudson Valley Boomerang', 'Thousands of residents report a huge silent boomerang of lights drifting over the valley over several years.', '1984-03-24T21:00:00Z', 'SRID=4326;POINT(-73.9000 41.5000)', 'Hudson Valley, New York, USA', 'CLASS_C', '{OPTICAL_PHOTO}', 55, false, 'seed'),
  ('JAL Flight 1628', 'Cargo 747 crew tracks enormous lights pacing the aircraft over Alaska; FAA radar shows intermittent returns.', '1986-11-17T02:00:00Z', 'SRID=4326;POINT(-146.0000 64.0000)', 'Fort Yukon, Alaska, USA', 'CLASS_A', '{RADAR_VISUAL}', 80, true, 'seed'),
  ('Belgian Triangle Wave', 'Belgian Air Force F-16s lock onto fast-maneuvering targets after hundreds of reports of silent black triangles.', '1990-03-30T23:00:00Z', 'SRID=4326;POINT(4.3517 50.8503)', 'Brussels region, Belgium', 'CLASS_A', '{RADAR_VISUAL,OPTICAL_PHOTO}', 83, true, 'seed'),
  ('Ariel School Landing', 'Sixty-two schoolchildren describe a craft landing near the playground and small beings approaching.', '1994-09-16T10:00:00Z', 'SRID=4326;POINT(31.0400 -17.7300)', 'Ruwa, Zimbabwe', 'CLASS_C', '{}', 62, false, 'seed'),
  ('Varginha Incident', 'Witnesses report a crashed craft and a strange creature; heavy military movement reported in the town.', '1996-01-20T15:30:00Z', 'SRID=4326;POINT(-45.4300 -21.5500)', 'Varginha, Minas Gerais, Brazil', 'CLASS_C', '{}', 52, false, 'seed'),
  ('Phoenix Lights', 'A mile-wide V of lights passes silently over Arizona, seen by thousands including the state governor.', '1997-03-13T19:30:00Z', 'SRID=4326;POINT(-112.0740 33.4484)', 'Phoenix, Arizona, USA', 'CLASS_B', '{OPTICAL_VIDEO}', 76, false, 'seed'),
  ('O''Hare Airport Disc', 'United Airlines staff report a dark metallic disc hovering over gate C17 before punching a hole through clouds.', '2006-11-07T16:15:00Z', 'SRID=4326;POINT(-87.9073 41.9742)', 'Chicago O''Hare, Illinois, USA', 'CLASS_B', '{}', 66, false, 'seed'),
  ('Stephenville Lights', 'Dozens of residents including a pilot report a mile-long object pursued by jets; FAA radar data later released.', '2008-01-08T18:15:00Z', 'SRID=4326;POINT(-98.2023 32.2207)', 'Stephenville, Texas, USA', 'CLASS_B', '{RADAR_VISUAL}', 72, true, 'seed'),
  ('Nimitz "Tic Tac" Encounter', 'USS Princeton radar tracks objects dropping 80,000 ft in seconds; F/A-18 pilots observe a white tic-tac shaped craft. FLIR1 video later released by the DoD.', '2004-11-14T14:00:00Z', 'SRID=4326;POINT(-117.6000 31.5000)', 'Pacific Ocean, off Baja California', 'CLASS_A', '{RADAR_VISUAL,FLIR_THERMAL,OPTICAL_VIDEO}', 94, true, 'seed'),
  ('USS Roosevelt "Gimbal"', 'F/A-18 ATFLIR captures a rotating object flying against the wind, part of a fleet reported by the aircrew.', '2015-01-21T09:00:00Z', 'SRID=4326;POINT(-79.5000 31.0000)', 'Atlantic Ocean, off Jacksonville, Florida', 'CLASS_A', '{FLIR_THERMAL,OPTICAL_VIDEO}', 89, true, 'seed'),
  ('USS Roosevelt "GoFast"', 'ATFLIR tracks a small object skimming low over the ocean at high apparent speed.', '2015-01-22T09:30:00Z', 'SRID=4326;POINT(-79.2000 31.3000)', 'Atlantic Ocean, off Jacksonville, Florida', 'CLASS_A', '{FLIR_THERMAL,OPTICAL_VIDEO}', 82, true, 'seed'),
  ('USS Omaha Sphere', 'Ship combat information center films a spherical object that descends into the sea; no debris recovered.', '2019-07-15T23:00:00Z', 'SRID=4326;POINT(-117.8000 32.6000)', 'Pacific Ocean, off San Diego, California', 'CLASS_A', '{RADAR_VISUAL,OPTICAL_VIDEO}', 85, true, 'seed'),
  ('Lake Huron Octagon Shootdown', 'NORAD tracks an octagonal object at 20,000 ft; it is shot down over the lake after a series of high-altitude intercepts.', '2023-02-12T19:42:00Z', 'SRID=4326;POINT(-82.4000 44.8000)', 'Lake Huron, Michigan, USA', 'CLASS_A', '{RADAR_VISUAL}', 79, true, 'seed'),
  ('Hessdalen Valley Lights', 'Recurring luminous phenomena photographed and instrumented by a long-running research station.', '1984-02-12T22:00:00Z', 'SRID=4326;POINT(11.1900 62.8000)', 'Hessdalen, Norway', 'CLASS_B', '{OPTICAL_PHOTO,RADAR_VISUAL}', 77, false, 'seed'),
  ('Kaikoura Lights', 'Argosy freight crew and a TV team film lights tracked on Wellington radar along the coast.', '1978-12-31T02:00:00Z', 'SRID=4326;POINT(173.6800 -42.4000)', 'Kaikoura, New Zealand', 'CLASS_B', '{RADAR_VISUAL,OPTICAL_VIDEO}', 75, false, 'seed'),
  ('Shag Harbour Splashdown', 'Witnesses see a lit object crash into the harbour; RCMP and navy divers search but recover nothing.', '1967-10-04T23:20:00Z', 'SRID=4326;POINT(-65.7200 43.5000)', 'Shag Harbour, Nova Scotia, Canada', 'CLASS_B', '{}', 72, true, 'seed'),
  ('Colares Light Beams', 'Brazilian Air Force "Operação Prato" documents lights firing beams at residents of the island.', '1977-10-20T21:00:00Z', 'SRID=4326;POINT(-48.2800 -0.9300)', 'Colares, Pará, Brazil', 'CLASS_B', '{OPTICAL_PHOTO}', 67, true, 'seed'),
  ('Mexico City Eclipse Sightings', 'During the total eclipse, many independent videos capture a stationary bright object near the sun.', '1991-07-11T20:00:00Z', 'SRID=4326;POINT(-99.1332 19.4326)', 'Mexico City, Mexico', 'CLASS_C', '{OPTICAL_VIDEO}', 54, false, 'seed');

ALTER TABLE uap_sightings ENABLE TRIGGER trg_sighting_cluster_sync;

-- A couple of demo hotspots so the radar rings have something to show.
DELETE FROM hotspot_alerts WHERE location_name IN ('Brussels region, Belgium', 'Hudson Valley, New York, USA');
INSERT INTO hotspot_alerts (center, location_name, sighting_count, severity_level, last_detected_at) VALUES
  ('SRID=4326;POINT(4.3517 50.8503)', 'Brussels region, Belgium', 9, 'CRITICAL_FLAP', now()),
  ('SRID=4326;POINT(-73.9000 41.5000)', 'Hudson Valley, New York, USA', 4, 'ELEVATED', now() - interval '1 hour');

-- Seed discussion on the Nimitz case.
INSERT INTO uap_intel_threads (sighting_id, operator_handle, intel_text)
SELECT id, 'SPY1_RADAR_OPS', 'Princeton SPY-1 returns show descent from ~80k ft to sea level in under a second. No known propulsion fits.'
FROM uap_sightings WHERE source = 'seed' AND title LIKE 'Nimitz%';
INSERT INTO uap_intel_threads (sighting_id, operator_handle, intel_text)
SELECT id, 'FLIR_ANALYST', 'FLIR1 shows no visible exhaust plume or control surfaces. Thermal signature is uniform.'
FROM uap_sightings WHERE source = 'seed' AND title LIKE 'Nimitz%';

COMMIT;
