# qubok_evolve

High-performance realtime 2D artificial-life ecosystem simulator.

## Milestone 1

Implemented:
- Vite + TypeScript scaffold.
- PixiJS renderer boundary in `src/render/`.
- Dark canvas.
- Basic Pixi render loop.
- FPS / frame-time overlay.
- Static architecture docs and boundary checks.

Not implemented yet:
- Simulation runtime state.
- Entity typed arrays.
- Seeded random generator.
- Spatial hash.
- Web Worker.

## Commands

```powershell
npm install
npm run test
npm run build
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Boundary rule

PixiJS is allowed in `src/render/` only. The simulation layer must remain renderer-agnostic.
