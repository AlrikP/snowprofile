-- The system user scripts act as, and the catalogue: technology categories, technologies,
-- and tender criteria. Column notes are in datamodel/snowprofile.dbml. Conventions:
-- docs/migrations.md.

-- The actor of seeds, imports, and maintenance scripts (src/db/actor.ts). It has no
-- account, so nobody can sign in as it.
INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES ('00000000-0000-7000-8000-000000000000', 'System', 'system@snowprofile.invalid', 0, 0, 0);
--> statement-breakpoint

CREATE TABLE technology_category (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  name_et text,
  name_en text,
  position integer DEFAULT 0 NOT NULL,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT technology_category_name CHECK (name_et IS NOT NULL OR name_en IS NOT NULL),
  CONSTRAINT technology_category_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX technology_category_id_organization_id_unique ON technology_category (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER technology_category_updated_at AFTER UPDATE ON technology_category FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE technology_category SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE technology (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  category_id text NOT NULL,
  name text NOT NULL,
  normalized_name text NOT NULL,
  merged_into_id text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT technology_category FOREIGN KEY (category_id, organization_id)
    REFERENCES technology_category (id, organization_id),
  CONSTRAINT technology_merged_into FOREIGN KEY (merged_into_id, organization_id)
    REFERENCES technology (id, organization_id),
  CONSTRAINT technology_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX technology_organization_id_normalized_name_unique ON technology (organization_id, normalized_name) WHERE sys_deleted = 0;
--> statement-breakpoint
CREATE UNIQUE INDEX technology_id_organization_id_unique ON technology (id, organization_id);
--> statement-breakpoint
CREATE INDEX technology_category_id_idx ON technology (category_id);
--> statement-breakpoint
CREATE TRIGGER technology_updated_at AFTER UPDATE ON technology FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE technology SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE tender_criterion (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  name_et text,
  name_en text,
  position integer DEFAULT 0 NOT NULL,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT tender_criterion_name CHECK (name_et IS NOT NULL OR name_en IS NOT NULL),
  CONSTRAINT tender_criterion_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX tender_criterion_id_organization_id_unique ON tender_criterion (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER tender_criterion_updated_at AFTER UPDATE ON tender_criterion FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE tender_criterion SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
