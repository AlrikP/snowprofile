# 042: Technology duplicate suggestions

Status: done
Depends on: task 026 (the technology catalogue)

Task 026 refuses a name that matches a live entry exactly after normalizing. The prototype
(`prototypes/technologies.html`) also shows near-duplicates: a "Possible duplicates" list
for admins (Postgres → PostgreSQL, React.js → React) with a merge button each, and a
warning with "Add anyway" when a new name is close to an existing one (state `duplicate`).

## Decisions

Decided with the user; the rule goes into `docs/architecture.md` with 042.1.

1. **The rule:** two names are near-duplicates when their stems match. A stem is the
   normalized name without a trailing version number (Java 21), mapped through a short
   hand-kept alias list for abbreviations and translations (Postgres, K8s, TS, JS,
   X-Road, Mongo), and without one known suffix (js, sql, db, lang, core, css, search).
   Names that normalize the same are exact duplicates, which task 026 already refuses.
2. **Checked against** the seed's catalogue and about 50 variants typed in practice: it
   finds all 25 intended pairs (Postgres/PostgreSQL, React.js/React, Vue 3/Vue.js,
   Golang/Go, K8s/Kubernetes, Oracle DB/Oracle, .NET Core/.NET, X-Road/X-tee, and more),
   and avoids Java/JavaScript, Spring/Spring Boot, MySQL/MSSQL, C/C#/C++, and
   Kafka/Kafka Streams. Its one false match is Angular/AngularJS. A prefix match or an
   edit distance did worse: edit distance found 1 of the pairs and matched MySQL/MSSQL.
3. **False matches:** an admin marks a pair "Not a duplicate", stored per organization,
   and it is never suggested again.

## Subtasks

- 042.1: Possible duplicates for admins (`01-possible-duplicates.md`)
- 042.2: A warning when adding or renaming (`02-add-warning.md`)

## Acceptance criteria

- [x] All subtasks are done.

## Outcome

- Both subtasks are done; their Outcome sections hold the details.
- The rule was checked against 22 intended pairs, not the 25 decision 2 names;
  `technology-duplicates.test.ts` holds them, and `docs/architecture.md`, "Technology
  duplicates", records the rule.
