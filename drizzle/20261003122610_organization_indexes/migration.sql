-- A profile has at most one open update request; the unique index makes the database hold
-- that even when two requests race. Each tenant table that lists rows per organization
-- gets an index leading with organization_id. Conventions: docs/migrations.md.
CREATE UNIQUE INDEX update_request_profile_id_open_unique ON update_request (profile_id) WHERE closed_at IS NULL;
--> statement-breakpoint
DROP INDEX update_request_profile_id_open_idx;
--> statement-breakpoint
CREATE INDEX technology_category_organization_id_idx ON technology_category (organization_id);
--> statement-breakpoint
CREATE INDEX tender_criterion_organization_id_idx ON tender_criterion (organization_id);
--> statement-breakpoint
CREATE INDEX contact_person_organization_id_idx ON contact_person (organization_id);
--> statement-breakpoint
CREATE INDEX education_organization_id_idx ON education (organization_id);
--> statement-breakpoint
CREATE INDEX participation_organization_id_idx ON participation (organization_id);
--> statement-breakpoint
CREATE INDEX own_project_organization_id_idx ON own_project (organization_id);
--> statement-breakpoint
CREATE INDEX update_request_organization_id_idx ON update_request (organization_id);
--> statement-breakpoint
CREATE INDEX project_contact_organization_id_idx ON project_contact (organization_id);
--> statement-breakpoint
CREATE INDEX project_technology_organization_id_idx ON project_technology (organization_id);
--> statement-breakpoint
CREATE INDEX project_criterion_answer_organization_id_idx ON project_criterion_answer (organization_id);
--> statement-breakpoint
CREATE INDEX participation_technology_organization_id_idx ON participation_technology (organization_id);
--> statement-breakpoint
CREATE INDEX own_project_technology_organization_id_idx ON own_project_technology (organization_id);
