# qubok_evolve architecture

Core rule: qubok_evolve is a compiled artificial-life simulator, not an object-oriented game scene.

## Authoring-to-runtime path

```text
Creature editor
  -> Blueprint
  -> Compiler
  -> Runtime archetype
  -> Simulation worker
  -> Renderer / debug UI
```

## Boundaries

| Layer | May own | Must not own |
|---|---|---|
| `src/editor` | Body-grid authoring, sockets, validation UI data | Runtime world state |
| `src/compiler` | Blueprint-to-phenotype transforms | PixiJS, React UI, hot-loop state |
| `src/sim` | Deterministic typed-array simulation state | PixiJS, React state, editor objects |
| `src/render` | PixiJS canvas, draw snapshots, debug visuals | Authoritative simulation state |
| `src/ui` | Shell, panels, inspector, charts | Entity arrays, hot simulation state |

## Non-negotiables

- No `Entity` classes in simulation hot loops.
- No dynamic component objects in runtime hot loops.
- No PixiJS imports inside `src/sim`.
- No editor logic inside `src/sim`.
- React, if introduced later, is UI only.
- Simulation state is owned by simulation modules, later by the simulation worker.
- Renderer consumes snapshots or views, never owns truth.
