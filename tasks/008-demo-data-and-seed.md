# 008: Demo data generator and seed

Status: todo
Depends on: task 007 (the tables it fills)

The generator serves local development, tests, performance data, and demos
(`docs/product.md`, "Demo data"). It must be reproducible.

## Acceptance criteria

- [ ] Given a seed, the generator always produces the same data, at a fixed moment, so
      counts and periods are the same on any day.
- [ ] It creates several fictional organizations with customers, contact persons,
      projects, technologies in categories, tender criteria and answers, employees with
      profiles and education, overlapping participations, own projects, and update
      requests.
- [ ] Text is believable Estonian and English; some translations are missing on purpose,
      so the CV's missing-translation flag has data.
- [ ] Every person, company, and email address is fictional (`example.com` addresses).
- [ ] `db:seed` loads it into the local database; it doesn't overwrite existing data
      unless asked to reset.
- [ ] It can reset one demo organization without touching others.
- [ ] It refuses a database that isn't a local file, and a production stack unless
      `DEMO_MODE` is on; tests cover both refusals.
- [ ] The dev users from task 006.2 are part of the seed.
