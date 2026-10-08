# 008.1: Demo data generator

Status: done

A pure function turns a seed into the rows of several fictional organizations, and
`seed(db)` loads them. Each organization draws from its own random stream, so one
organization can be generated, and later reset, on its own.

## Acceptance criteria

- [x] Given a seed, the generator returns the same rows on any day: dates, periods, and
      IDs derive from the seed and a fixed moment, never from the clock.
- [x] One organization generated alone equals the same organization in the full set.
- [x] Every organization has customers, contact persons, projects, technologies in
      categories, tender criteria and answers, employees with profiles and education,
      overlapping participations, own projects, and update requests.
- [x] Text is believable Estonian and English; some English translations are missing on
      purpose.
- [x] Every person, company, and institution is invented, and every email address is at
      `example.com`.
- [x] The dev users from task 006.2 are in the demo organization, with profiles, and the
      admin also belongs to a second organization.
- [x] `seed(db)` loads every organization into a migrated database, and tests check the
      loaded data against the criteria above.
