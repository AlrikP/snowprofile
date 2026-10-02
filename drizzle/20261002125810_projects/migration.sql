-- Customers, contact persons, projects, and their links to contacts, technologies, and
-- tender criteria. Column notes are in datamodel/snowprofile.dbml. Conventions:
-- docs/migrations.md.

CREATE TABLE customer (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  name text NOT NULL,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT customer_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX customer_organization_id_name_unique ON customer (organization_id, name) WHERE sys_deleted = 0;
--> statement-breakpoint
CREATE UNIQUE INDEX customer_id_organization_id_unique ON customer (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER customer_updated_at AFTER UPDATE ON customer FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE customer SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE contact_person (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  customer_id text NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  no_longer_valid integer DEFAULT 0 NOT NULL,
  note text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT contact_person_customer FOREIGN KEY (customer_id, organization_id)
    REFERENCES customer (id, organization_id),
  CONSTRAINT contact_person_no_longer_valid CHECK (no_longer_valid IN (0, 1)),
  CONSTRAINT contact_person_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX contact_person_customer_id_idx ON contact_person (customer_id);
--> statement-breakpoint
CREATE UNIQUE INDEX contact_person_id_organization_id_unique ON contact_person (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER contact_person_updated_at AFTER UPDATE ON contact_person FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE contact_person SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE project (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  customer_id text,
  name text NOT NULL,
  normalized_name text NOT NULL,
  description_et text,
  description_en text,
  start_date text NOT NULL,
  end_date text,
  tender_reference text,
  total_hours integer,
  total_hours_qualifier text,
  cost integer,
  cost_qualifier text,
  import_ref text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT project_customer FOREIGN KEY (customer_id, organization_id)
    REFERENCES customer (id, organization_id),
  CONSTRAINT project_start_date CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT project_end_date CHECK (end_date IS NULL OR end_date GLOB '[0-9][0-9][0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT project_period CHECK (end_date IS NULL OR end_date >= substr(start_date, 1, length(end_date))),
  CONSTRAINT project_total_hours_qualifier CHECK (total_hours_qualifier IN ('exact', 'approximately', 'more_than')),
  CONSTRAINT project_total_hours_pair CHECK ((total_hours IS NULL) = (total_hours_qualifier IS NULL)),
  CONSTRAINT project_cost_qualifier CHECK (cost_qualifier IN ('exact', 'approximately', 'more_than')),
  CONSTRAINT project_cost_pair CHECK ((cost IS NULL) = (cost_qualifier IS NULL)),
  CONSTRAINT project_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX project_organization_id_import_ref_unique ON project (organization_id, import_ref) WHERE import_ref IS NOT NULL AND sys_deleted = 0;
--> statement-breakpoint
CREATE INDEX project_organization_id_normalized_name_idx ON project (organization_id, normalized_name);
--> statement-breakpoint
CREATE INDEX project_customer_id_idx ON project (customer_id);
--> statement-breakpoint
CREATE UNIQUE INDEX project_id_organization_id_unique ON project (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER project_updated_at AFTER UPDATE ON project FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE project SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE project_contact (
  project_id text NOT NULL,
  contact_person_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (project_id, contact_person_id),
  CONSTRAINT project_contact_project FOREIGN KEY (project_id, organization_id)
    REFERENCES project (id, organization_id),
  CONSTRAINT project_contact_contact_person FOREIGN KEY (contact_person_id, organization_id)
    REFERENCES contact_person (id, organization_id)
);
--> statement-breakpoint
CREATE INDEX project_contact_contact_person_id_idx ON project_contact (contact_person_id);
--> statement-breakpoint

CREATE TABLE project_technology (
  project_id text NOT NULL,
  technology_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (project_id, technology_id),
  CONSTRAINT project_technology_project FOREIGN KEY (project_id, organization_id)
    REFERENCES project (id, organization_id),
  CONSTRAINT project_technology_technology FOREIGN KEY (technology_id, organization_id)
    REFERENCES technology (id, organization_id)
);
--> statement-breakpoint
CREATE INDEX project_technology_technology_id_idx ON project_technology (technology_id);
--> statement-breakpoint

CREATE TABLE project_criterion_answer (
  project_id text NOT NULL,
  criterion_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  answer integer NOT NULL,
  note text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (project_id, criterion_id),
  CONSTRAINT project_criterion_answer_project FOREIGN KEY (project_id, organization_id)
    REFERENCES project (id, organization_id),
  CONSTRAINT project_criterion_answer_criterion FOREIGN KEY (criterion_id, organization_id)
    REFERENCES tender_criterion (id, organization_id),
  CONSTRAINT project_criterion_answer_answer CHECK (answer IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX project_criterion_answer_criterion_id_idx ON project_criterion_answer (criterion_id);
--> statement-breakpoint
CREATE TRIGGER project_criterion_answer_updated_at AFTER UPDATE ON project_criterion_answer FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE project_criterion_answer SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE project_id = NEW.project_id AND criterion_id = NEW.criterion_id;
END;
