# Misfits Operations Hub

Public operations archive and player handbook for the Misfits Arma 3 group.

The site is plain HTML and CSS so GitHub Pages can publish it directly from the
repository root without a build tool. Start at `index.html`; shared styling and
the black/white/red/blue theme are in `assets/site.css`.

The Misfits Aux source repository remains private. This repository contains
only player-facing documentation and no addon source, release keys, or campaign
assets.

## Page map

- `getting-started.html`: onboarding, mod installation, basic setup, and first operation.
- `systems.html`: everything the universal Aux changes for players and mission makers.
- `medical.html`: casualty workflow, airway/breathing, PAK rules, and custom items.
- `rules.html`: group conduct, gameplay, attendance, and technical expectations.
- `campaigns.html`: campaign summaries and campaign-specific mod information.
- `mission-making.html`: framework, Aux objects/modules, dependencies, and submission checks.
- `packages.html`: detailed mod-loading and troubleshooting reference.
- `operations.html`: operation archive rendered from sanitised records.
- `players.html`: lifetime attendance and statistics aggregated in the browser.
- `data/operations.json`: optional versioned input for both archive pages.

The operations layer is plain static HTML, CSS, JavaScript, and JSON. It has no
database, analytics, cookies, login provider, or paid runtime dependency. Raw
Steam IDs must never be placed in `data/operations.json`; the publishing bridge
will replace them with non-sensitive stable identifiers.

Dashed **Put here** panels are editorial prompts. Replace them with finished
copy while retaining the surrounding headings and page structure.
