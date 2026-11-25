## What and why

<!-- What changes for a reader or contributor, and why. -->

## Docs and app text (in this pull request)

Tick what this change affects and update it here; leave the rest unticked. Reader-facing words follow
[docs/glossary.md](../docs/glossary.md).

- [ ] README **Features**: a new or changed reader-facing feature has its bullet (nothing checks this; it fell six
  merges behind once)
- [ ] README: included timelines, counts
- [ ] **Code map** (`docs/development.md`): a new file or module, or one whose job changed, has its row
- [ ] `docs/data-format.md`: new or changed fields, rules the app checks (`npm run docs:check` catches missing fields)
- [ ] `docs/development.md`: npm scripts (`docs:check` catches missing ones), how to build or check
- [ ] App text: Legend, tour, labels, tooltips, messages
- [ ] `docs/glossary.md`: a new reader-facing word, or a renamed one (renamed everywhere)
- [ ] `docs/BACKLOG.md`, `docs/feature-audit.md`: items this finishes or changes
- [ ] Nothing to update

## Checks

- [ ] Tests, lint and build pass; `npm run data:compare` for data changes
- [ ] UI change: `npm run a11y:report` summary line pasted below. Don't commit `docs/wcag-report.md`: the maintainers
  refresh it after each batch of merges.
- [ ] UI change: screenshots before and after
- [ ] New or changed test or check: mutation run pasted below (break what it guards, it fails; restore, it passes)

<!-- a11y report summary, e.g. "Failing: 0 (ancient-classical, 34 views)" -->
<!-- mutation run, e.g. "dropped the year guard in parseYear: 2 FAIL (years.test.ts); restored: 41/41" -->
