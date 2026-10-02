-- Profiles, education, participations, own projects, and update requests. Column notes are
-- in datamodel/snowprofile.dbml. Conventions: docs/migrations.md.

-- user_id is not a foreign key to member: Better Auth deletes member rows when a member is
-- removed, and a leaver's profile outlives that (docs/architecture.md, "Leavers").
CREATE TABLE employee_profile (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  user_id text NOT NULL REFERENCES user(id),
  full_name text NOT NULL,
  join_date text,
  left_date text,
  birth_date text,
  confirmed_at integer,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  CONSTRAINT employee_profile_join_date CHECK (join_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT employee_profile_left_date CHECK (left_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT employee_profile_birth_date CHECK (birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT employee_profile_employment CHECK (left_date >= join_date)
);
--> statement-breakpoint
CREATE UNIQUE INDEX employee_profile_organization_id_user_id_unique ON employee_profile (organization_id, user_id);
--> statement-breakpoint
CREATE INDEX employee_profile_user_id_idx ON employee_profile (user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX employee_profile_id_organization_id_unique ON employee_profile (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER employee_profile_updated_at AFTER UPDATE ON employee_profile FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE employee_profile SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE education (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  profile_id text NOT NULL,
  institution_et text,
  institution_en text,
  field_et text,
  field_en text,
  degree_et text,
  degree_en text,
  start_date text,
  end_date text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT education_profile FOREIGN KEY (profile_id, organization_id) REFERENCES employee_profile (id, organization_id),
  CONSTRAINT education_institution CHECK (institution_et IS NOT NULL OR institution_en IS NOT NULL),
  CONSTRAINT education_start_date CHECK (start_date IS NULL OR start_date GLOB '[0-9][0-9][0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT education_end_date CHECK (end_date IS NULL OR end_date GLOB '[0-9][0-9][0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT education_period CHECK (end_date IS NULL OR end_date >= substr(start_date, 1, length(end_date))),
  CONSTRAINT education_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX education_profile_id_idx ON education (profile_id);
--> statement-breakpoint
CREATE TRIGGER education_updated_at AFTER UPDATE ON education FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE education SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE participation (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  profile_id text NOT NULL,
  project_id text NOT NULL,
  start_date text NOT NULL,
  end_date text,
  role_et text,
  role_en text,
  hours integer,
  hours_qualifier text,
  tasks_et text,
  tasks_en text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT participation_profile FOREIGN KEY (profile_id, organization_id) REFERENCES employee_profile (id, organization_id),
  CONSTRAINT participation_project FOREIGN KEY (project_id, organization_id) REFERENCES project (id, organization_id),
  CONSTRAINT participation_start_date CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT participation_end_date CHECK (end_date IS NULL OR end_date GLOB '[0-9][0-9][0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT participation_period CHECK (end_date IS NULL OR end_date >= substr(start_date, 1, length(end_date))),
  CONSTRAINT participation_hours_qualifier CHECK (hours_qualifier IN ('exact', 'approximately', 'more_than')),
  CONSTRAINT participation_hours_pair CHECK ((hours IS NULL) = (hours_qualifier IS NULL)),
  CONSTRAINT participation_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX participation_profile_id_idx ON participation (profile_id);
--> statement-breakpoint
CREATE INDEX participation_project_id_idx ON participation (project_id);
--> statement-breakpoint
CREATE UNIQUE INDEX participation_id_organization_id_unique ON participation (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER participation_updated_at AFTER UPDATE ON participation FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE participation SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE participation_technology (
  participation_id text NOT NULL,
  technology_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (participation_id, technology_id),
  CONSTRAINT participation_technology_participation FOREIGN KEY (participation_id, organization_id) REFERENCES participation (id, organization_id),
  CONSTRAINT participation_technology_technology FOREIGN KEY (technology_id, organization_id) REFERENCES technology (id, organization_id)
);
--> statement-breakpoint
CREATE INDEX participation_technology_technology_id_idx ON participation_technology (technology_id);
--> statement-breakpoint

CREATE TABLE own_project (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  profile_id text NOT NULL,
  name text NOT NULL,
  employer text,
  customer_name text,
  description_et text,
  description_en text,
  start_date text NOT NULL,
  end_date text,
  tender_reference text,
  total_hours integer,
  total_hours_qualifier text,
  cost integer,
  cost_qualifier text,
  role_et text,
  role_en text,
  hours integer,
  hours_qualifier text,
  tasks_et text,
  tasks_en text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  sys_deleted integer DEFAULT 0 NOT NULL,
  CONSTRAINT own_project_profile FOREIGN KEY (profile_id, organization_id) REFERENCES employee_profile (id, organization_id),
  CONSTRAINT own_project_start_date CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT own_project_end_date CHECK (end_date IS NULL OR end_date GLOB '[0-9][0-9][0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' OR end_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT own_project_period CHECK (end_date IS NULL OR end_date >= substr(start_date, 1, length(end_date))),
  CONSTRAINT own_project_total_hours_qualifier CHECK (total_hours_qualifier IN ('exact', 'approximately', 'more_than')),
  CONSTRAINT own_project_total_hours_pair CHECK ((total_hours IS NULL) = (total_hours_qualifier IS NULL)),
  CONSTRAINT own_project_cost_qualifier CHECK (cost_qualifier IN ('exact', 'approximately', 'more_than')),
  CONSTRAINT own_project_cost_pair CHECK ((cost IS NULL) = (cost_qualifier IS NULL)),
  CONSTRAINT own_project_hours_qualifier CHECK (hours_qualifier IN ('exact', 'approximately', 'more_than')),
  CONSTRAINT own_project_hours_pair CHECK ((hours IS NULL) = (hours_qualifier IS NULL)),
  CONSTRAINT own_project_sys_deleted CHECK (sys_deleted IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX own_project_profile_id_idx ON own_project (profile_id);
--> statement-breakpoint
CREATE UNIQUE INDEX own_project_id_organization_id_unique ON own_project (id, organization_id);
--> statement-breakpoint
CREATE TRIGGER own_project_updated_at AFTER UPDATE ON own_project FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE own_project SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
--> statement-breakpoint

CREATE TABLE own_project_technology (
  own_project_id text NOT NULL,
  technology_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (own_project_id, technology_id),
  CONSTRAINT own_project_technology_own_project FOREIGN KEY (own_project_id, organization_id) REFERENCES own_project (id, organization_id),
  CONSTRAINT own_project_technology_technology FOREIGN KEY (technology_id, organization_id) REFERENCES technology (id, organization_id)
);
--> statement-breakpoint
CREATE INDEX own_project_technology_technology_id_idx ON own_project_technology (technology_id);
--> statement-breakpoint

CREATE TABLE update_request (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  profile_id text NOT NULL,
  message text,
  closed_at integer,
  closed_reason text,
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  updated_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  updated_by text NOT NULL REFERENCES user(id),
  CONSTRAINT update_request_profile FOREIGN KEY (profile_id, organization_id) REFERENCES employee_profile (id, organization_id),
  CONSTRAINT update_request_closed_reason CHECK (closed_reason IN ('confirmed', 'canceled')),
  CONSTRAINT update_request_closed_pair CHECK ((closed_at IS NULL) = (closed_reason IS NULL))
);
--> statement-breakpoint
CREATE INDEX update_request_profile_id_open_idx ON update_request (profile_id) WHERE closed_at IS NULL;
--> statement-breakpoint
CREATE TRIGGER update_request_updated_at AFTER UPDATE ON update_request FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE update_request SET updated_at = CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)
  WHERE id = NEW.id;
END;
