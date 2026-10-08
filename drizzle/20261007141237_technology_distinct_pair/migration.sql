-- Pairs of technologies an admin marked "Not a duplicate", so the near-duplicate rule
-- never suggests them again. A pair is stored once, the lower ID first.
CREATE TABLE technology_distinct_pair (
  technology_id text NOT NULL,
  other_technology_id text NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id),
  created_at integer DEFAULT (CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER)) NOT NULL,
  created_by text NOT NULL REFERENCES user(id),
  PRIMARY KEY (technology_id, other_technology_id),
  CONSTRAINT technology_distinct_pair_technology FOREIGN KEY (technology_id, organization_id)
    REFERENCES technology (id, organization_id),
  CONSTRAINT technology_distinct_pair_other_technology FOREIGN KEY (other_technology_id, organization_id)
    REFERENCES technology (id, organization_id),
  CONSTRAINT technology_distinct_pair_order CHECK (technology_id < other_technology_id)
);
--> statement-breakpoint
CREATE INDEX technology_distinct_pair_organization_id_idx ON technology_distinct_pair (organization_id);
--> statement-breakpoint
CREATE INDEX technology_distinct_pair_other_technology_id_idx ON technology_distinct_pair (other_technology_id);
