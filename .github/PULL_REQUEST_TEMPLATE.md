## Summary

<!-- What does this PR do? One sentence. -->

## What changed? / How was it verified? / Rollback

- **What changed:**
- **How was it verified** (tests added, staging check, screenshots):
- **Rollback** (revert commit, flag off, migration downgrade):

## Type of change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature / section
- [ ] 🎨 UI / design improvement
- [ ] ⚡ Performance improvement
- [ ] 📝 Content update
- [ ] 🔧 Config / tooling
- [ ] 🔒 Security

## Screenshots

<!-- Add before/after screenshots for any visual changes -->

| Before | After |
|--------|-------|
| | |

## Definition of Done (from plans/README.md)

- [ ] Code merged through a PR with **green CI** (never merge red)
- [ ] Tests added or updated, and they fail without the change
- [ ] Ratchet baseline lowered if any tracked metric improved (`python scripts/quality_ratchet.py --update`)
- [ ] No new lint, type or a11y warnings
- [ ] No new `any`, raw `fetch`, bare `except Exception`, SQL in routers, or hard-coded colours
- [ ] Verified on staging
- [ ] Rollback path known and written above
- [ ] Docs or ADR updated if a pattern changed
- [ ] No secrets in the diff, logs or screenshots
