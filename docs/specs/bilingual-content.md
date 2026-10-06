# Bilingual content

Text that appears in a CV, such as descriptions, roles, and tasks, has an Estonian and an
English version, and either can be missing. Everyone who enters such text uses it, and
everyone who reads it sees the gaps. The storage rules are in `docs/architecture.md`,
"Types". The CV's check for missing translations before generating is in the CV specs.

## Requirements

### Requirement: Both languages are editable

A form must show a bilingual text as two fields, one per language, each labelled with its
language, and must save each language as typed, a blank field as missing.

#### Scenario: bilingual-content.both-languages-editable

- **Given** a form with a bilingual field
- **When** someone fills in the Estonian field and leaves the English one blank
- **Then** the Estonian text is kept and the English one is missing

### Requirement: Missing translations show

Where a text is shown, the app must show it in the UI language. When that translation is
missing, it must show the other language's text, marked as missing.

#### Scenario: bilingual-content.fallback-marked

- **Given** a text with only an Estonian version
- **When** someone reads it with the UI in English
- **Then** they see the Estonian text, marked "No English"

#### Scenario: bilingual-content.none-set

- **Given** a text with neither version
- **When** someone reads it
- **Then** it shows as not added
