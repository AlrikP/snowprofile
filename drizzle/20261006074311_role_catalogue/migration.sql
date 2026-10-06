-- The role catalogue (docs/product.md, "Role catalogue"): roles move from the role_et and
-- role_en columns of participation and own_project into project_role, linked through
-- participation_role and own_project_role. Column notes are in datamodel/snowprofile.dbml.
-- Conventions: docs/migrations.md.

CREATE TABLE project_role (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  name_et text,
  name_en text,
  normalized_name text NOT NULL,
  merged_into_id text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT project_role_merged_into FOREIGN KEY (merged_into_id, organization_id)
    REFERENCES project_role (id, organization_id),
  CONSTRAINT project_role_name CHECK (name_et IS NOT NULL OR name_en IS NOT NULL),
  CONSTRAINT project_role_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX project_role_organization_id_normalized_name_unique ON project_role (organization_id, normalized_name) WHERE sys_deleted = 0;
--> statement-breakpoint
CREATE UNIQUE INDEX project_role_id_organization_id_unique ON project_role (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER project_role_updated_at AFTER UPDATE ON project_role FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE project_role SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE participation_role (
  participation_id text NOT NULL,
  role_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (participation_id, role_id),
  CONSTRAINT participation_role_participation FOREIGN KEY (participation_id, organization_id) REFERENCES participation (id, organization_id),
  CONSTRAINT participation_role_role FOREIGN KEY (role_id, organization_id) REFERENCES project_role (id, organization_id)
);
--> statement-breakpoint
CREATE INDEX participation_role_organization_id_idx ON participation_role (organization_id);
--> statement-breakpoint
CREATE INDEX participation_role_role_id_idx ON participation_role (role_id);
--> statement-breakpoint

CREATE TABLE own_project_role (
  own_project_id text NOT NULL,
  role_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (own_project_id, role_id),
  CONSTRAINT own_project_role_own_project FOREIGN KEY (own_project_id, organization_id) REFERENCES own_project (id, organization_id),
  CONSTRAINT own_project_role_role FOREIGN KEY (role_id, organization_id) REFERENCES project_role (id, organization_id)
);
--> statement-breakpoint
CREATE INDEX own_project_role_organization_id_idx ON own_project_role (organization_id);
--> statement-breakpoint
CREATE INDEX own_project_role_role_id_idx ON own_project_role (role_id);
--> statement-breakpoint

-- Backfill: one catalogue entry per organization and normalized name, from the roles both
-- tables hold, then a link from each row to its entry. The normalization approximates the
-- app's (lowercase, Estonian letters without diacritics, no spaces or punctuation): SQLite's
-- lower() folds only ASCII, and there is no Unicode decomposition in SQL. Only local and test
-- databases hold roles at this point; the sheet migration loads real ones through the app's
-- normalization.
CREATE TEMP TABLE role_source AS
SELECT 'participation' AS source, id AS row_id, organization_id,
  NULLIF(trim(role_et), '') AS name_et, NULLIF(trim(role_en), '') AS name_en
FROM participation
UNION ALL
SELECT 'own_project', id, organization_id, NULLIF(trim(role_et), ''), NULLIF(trim(role_en), '')
FROM own_project;
--> statement-breakpoint
DELETE FROM role_source WHERE name_et IS NULL AND name_en IS NULL;
--> statement-breakpoint
ALTER TABLE role_source ADD COLUMN normalized_name text;
--> statement-breakpoint
UPDATE role_source SET normalized_name = lower(
  replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    COALESCE(name_et, name_en),
    'Ä', 'a'), 'ä', 'a'), 'Ö', 'o'), 'ö', 'o'), 'Õ', 'o'), 'õ', 'o'),
    'Ü', 'u'), 'ü', 'u'), 'Š', 's'), 'š', 's'), 'Ž', 'z'), 'ž', 'z'));
--> statement-breakpoint
UPDATE role_source SET normalized_name =
  replace(replace(replace(replace(replace(replace(replace(replace(replace(
    normalized_name,
    ' ', ''), '-', ''), '.', ''), ',', ''), '/', ''), '(', ''), ')', ''), '_', ''), '''', '');
--> statement-breakpoint
-- A UUIDv7 per entry, as the app generates them: the current time in milliseconds, the
-- version 7, the RFC 9562 variant, and random bits. Where spellings differ, min() picks a
-- capitalized one, because uppercase sorts first.
INSERT INTO project_role (id, organization_id, name_et, name_en, normalized_name, created_by, updated_by)
SELECT
  lower(
    substr(printf('%012x', CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)), 1, 8) || '-' ||
    substr(printf('%012x', CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)), 9, 4) || '-7' ||
    substr(hex(randomblob(2)), 2, 3) || '-' ||
    substr('89ab', 1 + abs(random() % 4), 1) || substr(hex(randomblob(2)), 2, 3) || '-' ||
    hex(randomblob(6))
  ),
  organization_id, min(name_et), min(name_en), normalized_name,
  '00000000-0000-7000-8000-000000000000', '00000000-0000-7000-8000-000000000000'
FROM role_source
GROUP BY organization_id, normalized_name;
--> statement-breakpoint
INSERT INTO participation_role (participation_id, role_id, organization_id, created_by)
SELECT source.row_id, project_role.id, source.organization_id, '00000000-0000-7000-8000-000000000000'
FROM role_source AS source
JOIN project_role ON project_role.organization_id = source.organization_id
  AND project_role.normalized_name = source.normalized_name
WHERE source.source = 'participation';
--> statement-breakpoint
INSERT INTO own_project_role (own_project_id, role_id, organization_id, created_by)
SELECT source.row_id, project_role.id, source.organization_id, '00000000-0000-7000-8000-000000000000'
FROM role_source AS source
JOIN project_role ON project_role.organization_id = source.organization_id
  AND project_role.normalized_name = source.normalized_name
WHERE source.source = 'own_project';
--> statement-breakpoint
DROP TABLE role_source;
--> statement-breakpoint

-- No deployed database exists yet, so the columns go in the same migration as the backfill
-- instead of a later one (docs/migrations.md, "Backward compatible").
ALTER TABLE participation DROP COLUMN role_et;
--> statement-breakpoint
ALTER TABLE participation DROP COLUMN role_en;
--> statement-breakpoint
ALTER TABLE own_project DROP COLUMN role_et;
--> statement-breakpoint
ALTER TABLE own_project DROP COLUMN role_en;
