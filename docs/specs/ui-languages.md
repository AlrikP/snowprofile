# UI languages

The interface is in Estonian or English, as each person chooses (`docs/product.md`,
"Languages"). The language of what people write is separate: text fields hold both
languages (`bilingual-content.md`).

## Requirements

### Requirement: A person picks the language

A signed-in person must be able to switch between Estonian and English from the user
menu. The choice must be saved on their user. When saving fails, the language must stay
as it was, and the page must say why.

#### Scenario: ui-languages.switched

- **Given** a person using the app in Estonian
- **When** they choose English
- **Then** English is saved as their language, and they can change it again

#### Scenario: ui-languages.save-failed

- **Given** a person using the app in English
- **When** they choose Estonian and saving fails
- **Then** the app stays in English and says why

### Requirement: The choice follows the person

The chosen language must be kept on the user and in a cookie, so it holds in every
browser they sign in from: a page that rendered in another language must render again in
theirs.

#### Scenario: ui-languages.follows-user

- **Given** a person who chose English, in a browser whose cookie says Estonian
- **When** they open a page signed in
- **Then** the cookie is set to English, and the page renders in English

### Requirement: The default before a choice

Before a choice, the language must come from the cookie, then the browser's preferred
language when it is Estonian or English, then Estonian.

#### Scenario: ui-languages.browser-default

- **Given** a visitor with no language cookie
- **When** their browser prefers English, German, or nothing
- **Then** the app is in English, Estonian, and Estonian, and a cookie overrides the
  browser
