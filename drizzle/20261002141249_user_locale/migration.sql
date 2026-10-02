-- The UI language the user chose, kept beside the cookie so it follows them to another
-- browser. Null until they choose one; the cookie or the browser's language decides until
-- then. Conventions: docs/migrations.md.
ALTER TABLE user ADD COLUMN locale text CONSTRAINT user_locale CHECK (locale IN ('et', 'en'));
