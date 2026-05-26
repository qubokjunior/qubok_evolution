# prompt contract

Use this when asking for implementation work.

## Task

Implement exactly one subsystem: `<name>`.

## Allowed files

List exact files.

## Architecture invariants

- No per-entity classes in the simulation hot path.
- No React state for entity simulation.
- No PixiJS imports in `src/sim`.
- No editor logic in `src/sim`.
- No structural or morphology updates inside hot loops.
- Keep deterministic random behavior.
- Keep tests and benchmarks passing.

## Deliverable format

- Return full files or exact patches.
- Include tests when applicable.
- Include benchmark additions when applicable.
- No pseudocode.
- No broad refactors outside the target subsystem.

## Acceptance checks

```powershell
npm run test
npm run build
npm run bench:m1
```
