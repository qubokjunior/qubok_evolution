import { PROJECT_MILESTONE_LABEL, PROJECT_NAME } from "../shared/appVersion";
import type { PerfMetricsSnapshot } from "../shared/perfMetrics";

export type PerfOverlaySnapshot = {
  readonly fps: number;
  readonly frameMs: number;
  readonly renderMsPerFrame: number;
  readonly simMsPerTick: number;
  readonly gridBuildMs: number;
  readonly neighborQueryMs: number;
  readonly sensorMs: number;
  readonly predatorPreyMs: number;
  readonly resourceMs: number;
  readonly energyMs: number;
  readonly reproductionMs: number;
  readonly entityCount: number;
  readonly aliveCount: number;
  readonly averageEnergy01: number;
  readonly tick: number;
  readonly movementIntegratedCount: number;
  readonly deathsThisStep: number;
  readonly starvingCount: number;
  readonly starvationDamage: number;
  readonly spatialUsedCells: number;
  readonly spatialMaxCellOccupancy: number;
  readonly neighborCandidates: number;
  readonly avgNeighborsPerAgent: number;
  readonly maxNeighborsForAgent: number;
  readonly sensorVisibleNeighbors: number;
  readonly sensorSectorWrites: number;
  readonly sensorFoodVisibleCount: number;
  readonly sensorFoodSectorWrites: number;
  readonly sensorObstacleSectorWrites: number;
  readonly sensorFoodSignalSum: number;
  readonly sensorObstacleSignalSum: number;
  readonly sensorFoodScheduled: number;
  readonly sensorObstacleScheduled: number;
  readonly sensorFoodSkippedByCadence: number;
  readonly sensorObstacleSkippedByCadence: number;
  readonly avgVisibleNeighborsPerAgent: number;
  readonly attacksThisStep: number;
  readonly killsThisStep: number;
  readonly predatorDamageDealt: number;
  readonly predatorEnergyGained: number;
  readonly resourceAliveCount: number;
  readonly resourceTargetCount: number;
  readonly foodPickupCount: number;
  readonly foodEnergyTransferred: number;
  readonly birthsThisStep: number;
  readonly reproductionEligibleCount: number;
  readonly blockedBirthsByCapacity: number;
  readonly mutationChangedCount: number;
  readonly metrics?: PerfMetricsSnapshot;
};

export type PerfOverlaySink = {
  update: (snapshot: PerfOverlaySnapshot) => void;
  destroy: () => void;
};

const formatMs = (value: number): string => `${value.toFixed(2)} ms`;
const formatFps = (value: number): string => `${value.toFixed(1)} fps`;
const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatDecimal = (value: number): string => value.toFixed(2);
const formatInt = (value: number): string => Math.round(value).toString();

export function createPerfOverlay(host: HTMLElement): PerfOverlaySink {
  const root = document.createElement("section");
  root.className = "qubok_evolve-perf-overlay";
  root.setAttribute("aria-label", `${PROJECT_NAME} performance overlay`);

  const title = document.createElement("div");
  title.className = "qubok_evolve-perf-title";

  const titleText = document.createElement("span");
  titleText.textContent = PROJECT_NAME;

  const badge = document.createElement("span");
  badge.className = "qubok_evolve-perf-badge";
  badge.textContent = PROJECT_MILESTONE_LABEL;

  title.append(titleText, badge);
  root.append(title);

  const rows = {
    fps: createValueRow(root, "fps"),
    frameMs: createValueRow(root, "frame"),
    renderMsPerFrame: createValueRow(root, "render"),
    simMsPerTick: createValueRow(root, "sim tick"),
    gridBuildMs: createValueRow(root, "grid build"),
    neighborQueryMs: createValueRow(root, "neighbor q"),
    sensorMs: createValueRow(root, "sensor"),
    predatorPreyMs: createValueRow(root, "pred/prey"),
    resourceMs: createValueRow(root, "resource"),
    energyMs: createValueRow(root, "energy"),
    reproductionMs: createValueRow(root, "repro"),
    entityCount: createValueRow(root, "entities"),
    aliveCount: createValueRow(root, "alive"),
    averageEnergy01: createValueRow(root, "avg energy"),
    tick: createValueRow(root, "tick"),
    movementIntegratedCount: createValueRow(root, "integrated"),
    deathsThisStep: createValueRow(root, "deaths/tick"),
    starvingCount: createValueRow(root, "starving"),
    starvationDamage: createValueRow(root, "starve dmg"),
    spatialUsedCells: createValueRow(root, "grid cells"),
    spatialMaxCellOccupancy: createValueRow(root, "max/cell"),
    neighborCandidates: createValueRow(root, "candidates"),
    avgNeighborsPerAgent: createValueRow(root, "avg neigh"),
    maxNeighborsForAgent: createValueRow(root, "max neigh"),
    sensorVisibleNeighbors: createValueRow(root, "visible"),
    sensorSectorWrites: createValueRow(root, "sector writes"),
    sensorFoodVisibleCount: createValueRow(root, "food visible"),
    sensorFoodSectorWrites: createValueRow(root, "food sectors"),
    sensorObstacleSectorWrites: createValueRow(root, "obs sectors"),
    sensorFoodSignalSum: createValueRow(root, "food signal"),
    sensorObstacleSignalSum: createValueRow(root, "obs signal"),
    sensorFoodScheduled: createValueRow(root, "food sched"),
    sensorObstacleScheduled: createValueRow(root, "obs sched"),
    sensorFoodSkippedByCadence: createValueRow(root, "food skip"),
    sensorObstacleSkippedByCadence: createValueRow(root, "obs skip"),
    avgVisibleNeighborsPerAgent: createValueRow(root, "avg visible"),
    attacksThisStep: createValueRow(root, "attacks"),
    killsThisStep: createValueRow(root, "kills"),
    predatorDamageDealt: createValueRow(root, "damage"),
    predatorEnergyGained: createValueRow(root, "hunt energy"),
    resourceAliveCount: createValueRow(root, "food alive"),
    resourceTargetCount: createValueRow(root, "food target"),
    foodPickupCount: createValueRow(root, "food eaten"),
    foodEnergyTransferred: createValueRow(root, "food energy"),
    birthsThisStep: createValueRow(root, "births"),
    reproductionEligibleCount: createValueRow(root, "repro elig"),
    blockedBirthsByCapacity: createValueRow(root, "birth block"),
    mutationChangedCount: createValueRow(root, "mut changed")
  };

  host.append(root);

  const update = (snapshot: PerfOverlaySnapshot): void => {
    rows.fps.textContent = formatFps(snapshot.fps);
    rows.frameMs.textContent = formatMs(snapshot.frameMs);
    rows.renderMsPerFrame.textContent = formatMs(snapshot.renderMsPerFrame);
    rows.simMsPerTick.textContent = formatMs(snapshot.simMsPerTick);
    rows.gridBuildMs.textContent = formatMs(snapshot.gridBuildMs);
    rows.neighborQueryMs.textContent = formatMs(snapshot.neighborQueryMs);
    rows.sensorMs.textContent = formatMs(snapshot.sensorMs);
    rows.predatorPreyMs.textContent = formatMs(snapshot.predatorPreyMs);
    rows.resourceMs.textContent = formatMs(snapshot.resourceMs);
    rows.energyMs.textContent = formatMs(snapshot.energyMs);
    rows.reproductionMs.textContent = formatMs(snapshot.reproductionMs);
    rows.entityCount.textContent = formatInt(snapshot.entityCount);
    rows.aliveCount.textContent = formatInt(snapshot.aliveCount);
    rows.averageEnergy01.textContent = formatPercent(snapshot.averageEnergy01);
    rows.tick.textContent = formatInt(snapshot.tick);
    rows.movementIntegratedCount.textContent = formatInt(snapshot.movementIntegratedCount);
    rows.deathsThisStep.textContent = formatInt(snapshot.deathsThisStep);
    rows.starvingCount.textContent = formatInt(snapshot.starvingCount);
    rows.starvationDamage.textContent = formatDecimal(snapshot.starvationDamage);
    rows.spatialUsedCells.textContent = formatInt(snapshot.spatialUsedCells);
    rows.spatialMaxCellOccupancy.textContent = formatInt(snapshot.spatialMaxCellOccupancy);
    rows.neighborCandidates.textContent = formatInt(snapshot.neighborCandidates);
    rows.avgNeighborsPerAgent.textContent = formatDecimal(snapshot.avgNeighborsPerAgent);
    rows.maxNeighborsForAgent.textContent = formatInt(snapshot.maxNeighborsForAgent);
    rows.sensorVisibleNeighbors.textContent = formatInt(snapshot.sensorVisibleNeighbors);
    rows.sensorSectorWrites.textContent = formatInt(snapshot.sensorSectorWrites);
    rows.sensorFoodVisibleCount.textContent = formatInt(snapshot.sensorFoodVisibleCount);
    rows.sensorFoodSectorWrites.textContent = formatInt(snapshot.sensorFoodSectorWrites);
    rows.sensorObstacleSectorWrites.textContent = formatInt(snapshot.sensorObstacleSectorWrites);
    rows.sensorFoodSignalSum.textContent = formatDecimal(snapshot.sensorFoodSignalSum);
    rows.sensorObstacleSignalSum.textContent = formatDecimal(snapshot.sensorObstacleSignalSum);
    rows.sensorFoodScheduled.textContent = formatInt(snapshot.sensorFoodScheduled);
    rows.sensorObstacleScheduled.textContent = formatInt(snapshot.sensorObstacleScheduled);
    rows.sensorFoodSkippedByCadence.textContent = formatInt(snapshot.sensorFoodSkippedByCadence);
    rows.sensorObstacleSkippedByCadence.textContent = formatInt(snapshot.sensorObstacleSkippedByCadence);
    rows.avgVisibleNeighborsPerAgent.textContent = formatDecimal(snapshot.avgVisibleNeighborsPerAgent);
    rows.attacksThisStep.textContent = formatInt(snapshot.attacksThisStep);
    rows.killsThisStep.textContent = formatInt(snapshot.killsThisStep);
    rows.predatorDamageDealt.textContent = formatDecimal(snapshot.predatorDamageDealt);
    rows.predatorEnergyGained.textContent = formatDecimal(snapshot.predatorEnergyGained);
    rows.resourceAliveCount.textContent = formatInt(snapshot.resourceAliveCount);
    rows.resourceTargetCount.textContent = formatInt(snapshot.resourceTargetCount);
    rows.foodPickupCount.textContent = formatInt(snapshot.foodPickupCount);
    rows.foodEnergyTransferred.textContent = formatDecimal(snapshot.foodEnergyTransferred);
    rows.birthsThisStep.textContent = formatInt(snapshot.birthsThisStep);
    rows.reproductionEligibleCount.textContent = formatInt(snapshot.reproductionEligibleCount);
    rows.blockedBirthsByCapacity.textContent = formatInt(snapshot.blockedBirthsByCapacity);
    rows.mutationChangedCount.textContent = formatInt(snapshot.mutationChangedCount);
  };

  return {
    update,
    destroy: () => root.remove()
  };
}

function createValueRow(root: HTMLElement, label: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "qubok_evolve-perf-row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.textContent = "--";

  row.append(labelElement, valueElement);
  root.append(row);

  return valueElement;
}