# Integration m50 - ecology pressure calibration

M50 starts after the closed M49 controller actuator bridge. M49 made controller intent optionally capable of affecting movement, but behavior quality cannot be evaluated while the demo ecology is too forgiving or too noisy. M50 calibrates hunger, scarcity, reproduction pressure, predator pressure, and population pressure so controller and actuator behavior has measurable consequences.

## Current status

M50-A0 is complete: integration scope document, milestone references, and roadmap/status guard scope exist.

M50-A1 config/readout shape is implemented without demo runtime wiring:

- `src/sim/ecologyPressure.ts` defines the renderer-agnostic ecology pressure surface;
- `ECOLOGY_PRESSURE_VERSION` is `qubok_evolve.ecology_pressure.m50`;
- `ECOLOGY_PRESSURE_PRESETS` defines `neutral_lab`, `scarce_food`, `predator_pressure`, `terrain_habitat`, and `field_current_stress` keys;
- `makeEcologyPressureConfig(...)` resolves bounded config with resource-capacity clamping;
- `makeEcologyPressureReadout(...)` builds pressure readouts from existing world/resource/energy/reproduction/predator/resource stats;
- `scripts/test-ecology-pressure.mjs` validates config clamping, preset guards, energy min/max readout, births, blocked births, predator kills, and population pressure;
- `package.json` exposes `test:ecology-pressure` and includes it in `npm run test`.

No demo runtime, render, UI, panel, persistence, package version, or app version behavior is changed in A1.

## Goal

M50 makes behavior matter.

The milestone should expose deterministic ecology pressure without turning it into a full scenario editor. The first pass should make food scarcity, starvation, reproduction, predation, and capacity limits visible enough that controller-driven motion can later be judged against survival and reproduction outcomes.

## Required boundary

- keep ecology pressure logic in `src/sim` / demo config surfaces, not in render code;
- preserve renderer-agnostic simulation state;
- keep new pressure presets deterministic;
- keep risky behavior changes behind explicit config or controlled demo presets;
- do not change controller or actuator algorithms as part of M50;
- do not solve sensor budgeting in M50; that remains M51;
- expose pressure metrics before adding richer UI controls.

## Planned slices

- M50-A0: integration scope document, roadmap/milestone references, and status guards only; no runtime behavior change. Complete.
- M50-A1: define bounded ecology pressure config/readout shape for demo simulation, no panel yet. Complete.
- M50-A2: deterministic pressure scenario tests for resource scarcity, energy loss/gain, starvation death path, births, blocked births, and predator kills.
- M50-A3: demo preset wiring behind safe defaults: neutral lab, scarce food, predator pressure, terrain habitat, and field-current stress.
- M50-A4: overlay/readout QA for ecology pressure metrics.
- M50-A5: compact ecology panel and persistence after metrics and presets are stable.
- M50-final: version/status/docs close and full validation.

## Target config surfaces

Initial config stays small and bounded:

- `ecologyPreset`: deterministic preset key;
- `basalMetabolismScale`;
- `starvationEnergyThreshold`;
- `starvationDamagePerSecond`;
- `resourceTargetCount`;
- `resourceRespawnPerSecond`;
- `reproductionEnergyThreshold`;
- `reproductionEnergyCost`;
- `predatorAttackRadius`;
- `predatorDamageScale`.

## Target metrics

Ecology pressure metrics are distinct from controller, actuator, field, and sensor metrics:

- ecology preset id/key;
- resource target and alive count;
- resource respawn count;
- food pickups and energy transferred;
- average, minimum, and maximum agent energy;
- starving count;
- starvation damage;
- deaths this step;
- births this step;
- blocked births by capacity;
- predator attacks and kills;
- alive count, capacity, reusable slot count, and population pressure ratio.

## Required tests

A1 coverage:

- ecology pressure version and preset keys;
- preset guard accepts known presets and rejects unknown values;
- default neutral config keeps current demo metabolism neutral;
- resource target clamps to resource capacity;
- invalid/non-finite numeric config is clamped;
- readout reports resource counts, pickups, energy range, starvation, births, blocked births, predator kills, reusable slots, and population pressure.

Remaining M50 test coverage:

- deterministic scarce-food scenario changes resource and energy counters;
- starvation death path uses `killAgent` and therefore free-list reuse;
- reproduction can produce births when pressure allows it;
- capacity-blocked births remain visible as metrics;
- predator/prey kills remain deterministic and visible;
- neutral/default preset preserves current safe demo behavior unless a pressure preset is selected;
- ecology metrics are finite and grouped separately from controller/actuator metrics.

## Required debug and UI

- overlay labels for ecology preset, food density, average/min/max energy, starving count, deaths, births, blocked births, attacks, kills, and population pressure;
- compact ecology panel only after core pressure config and metrics are stable;
- optional resource pressure or depleted-cell heatmap can wait until metrics are stable;
- preset import/export integration should wait for M56 unless a small local config patch is needed.

## Out of scope

- new controller/brain logic;
- controller tuning or learning;
- sensor budgeting and selected-agent sensor visualization;
- morphology/component compiler;
- signed-distance terrain/obstacle response;
- full scenario editor;
- workerization, WebGPU, render rewrite, or code-splitting work.
