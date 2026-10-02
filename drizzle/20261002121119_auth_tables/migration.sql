-- Better Auth core and the organization plugin without teams. The shape follows the plugin;
-- column notes are in datamodel/snowprofile.dbml. Conventions: docs/migrations.md.

-- Auth --------------------------------------------------------------------------------------

CREATE TABLE user (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  email_verified integer DEFAULT 0 NOT NULL,
  image text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  CONSTRAINT user_email_verified CHECK (email_verified IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX user_email_unique ON user (email);
--> statement-breakpoint

CREATE TABLE organization (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  logo text,
  metadata text,
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX organization_slug_unique ON organization (slug);
--> statement-breakpoint

CREATE TABLE session (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at integer NOT NULL,
  ip_address text,
  user_agent text,
  active_organization_id text REFERENCES organization(id) ON DELETE SET NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX session_token_unique ON session (token);
--> statement-breakpoint
CREATE INDEX session_user_id_idx ON session (user_id);
--> statement-breakpoint

CREATE TABLE account (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at integer,
  refresh_token_expires_at integer,
  scope text,
  password text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX account_user_id_idx ON account (user_id);
--> statement-breakpoint
CREATE INDEX account_provider_id_account_id_idx ON account (provider_id, account_id);
--> statement-breakpoint

CREATE TABLE verification (
  id text PRIMARY KEY NOT NULL,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at integer NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX verification_identifier_idx ON verification (identifier);
--> statement-breakpoint

-- Tenancy -----------------------------------------------------------------------------------

-- role has no CHECK: the plugin can store several roles comma-separated, and a new role
-- needs no migration (docs/architecture.md, "Roles").
CREATE TABLE member (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role text DEFAULT 'employee' NOT NULL,
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX member_organization_id_user_id_unique ON member (organization_id, user_id);
--> statement-breakpoint
CREATE INDEX member_user_id_idx ON member (user_id);
--> statement-breakpoint

CREATE TABLE invitation (
  id text PRIMARY KEY NOT NULL,
  organization_id text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text,
  status text DEFAULT 'pending' NOT NULL,
  expires_at integer NOT NULL,
  inviter_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  created_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX invitation_organization_id_email_idx ON invitation (organization_id, email);
