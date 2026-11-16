# Changelog

All notable changes from the repository's initial handoff onward will be recorded here. Earlier development history was not supplied and is not reconstructed.

## Unreleased

### Added
- Initial developer handoff documentation and repository setup.
- The supplied SQLite database as a baseline, at the project owner's request.
- A Recent Entries view showing up to 20 entries for all players in the selected game, with confirmation and undo of a specific saved entry by ID.
- Frontend offline-queue and backend stat-entry API regression tests.

### Changed
- Adopted the HoopTrack project name. Some compatibility-sensitive technical identifiers remain unchanged; see the developer documentation.
- Undoing a queued entry cancels its local retry with a warning that an ambiguous network failure may already have reached the server; undo is blocked while a save or sync is in flight.
- Queue flushes share an in-module lock, process a starting snapshot in order, and stop on submission failure. Newly queued items wait for a later flush; sync remains best-effort without cross-tab coordination or server idempotency.
