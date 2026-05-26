# m30 integration: repository status sync

Milestone 30 updates the repository landing surface so it matches the real runtime status after m26-m29.

## Problem fixed

The top-level README still described milestone 1, even though the codebase is now at m30. That made GitHub's main page materially stale.

## Implementation

- README.md now identifies the current version as 0.1.0-milestone.30 / m30.
- docs/milestones.md provides a compact milestone index.
- scripts/test-repo-status.mjs verifies package/appVersion/README/docs status sync.
- npm run test now includes test:repo-status.

## Acceptance

- npm run test:repo-status
- npm run test
- npm run build
- npm run bench:world-free-list

## Explicitly not changed

- no simulation behavior changes
- no renderer changes
- no terrain editor
- no controller/brain
- no worker migration
