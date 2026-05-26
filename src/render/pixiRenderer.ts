import { Application, Container, Graphics } from "pixi.js";
import type { EnergySurvivalStats } from "../sim/energy";
import type { FieldRenderSnapshot } from "../sim/fieldRenderSnapshot";
import type { FieldDynamicsStepMetrics } from "../sim/fieldDynamics";
import type { ObstacleLifecycleTelemetry } from "../sim/lifecycleTelemetry";
import type { MovementStepMetrics } from "../sim/movement";
import type { ObstacleSoftResponseStats } from "../sim/obstacleResponse";
import type { ObstacleMaskRenderSnapshot } from "../sim/obstacleRenderSnapshot";
import type { TerrainRenderSnapshot } from "../sim/terrainRenderSnapshot";
import type { LocalNeighborSummary } from "../sim/neighborQuery";
import type { PredatorPreyInteractionStats } from "../sim/predatorPrey";
import type { RenderSnapshot, RenderSnapshotStats } from "../sim/renderSnapshot";
import type { ReproductionStepStats } from "../sim/reproduction";
import type { ResourceBuildStats, ResourcePickupStats } from "../sim/resources";
import type { SensorPassStats } from "../sim/sensors";
import type { SpatialHashBuildStats } from "../sim/spatialHash";
import type { SpawnValidationStats } from "../sim/spawnValidation";
import { createPerfMetricsBus } from "../shared/perfMetrics";
import type { PerfOverlaySink } from "./debugOverlay";
import { makeRenderDebugConfig, type RenderDebugConfig, type RenderDebugConfigPatch } from "./renderDebugConfig";

export type SimulationFrameSource = (deltaSeconds: number) => {
  readonly snapshot: RenderSnapshot;
  readonly obstacleMaskSnapshot: ObstacleMaskRenderSnapshot;
  readonly terrainRenderSnapshot: TerrainRenderSnapshot;
  readonly fieldRenderSnapshot: FieldRenderSnapshot;
  readonly fieldDynamicsStats: FieldDynamicsStepMetrics;
  readonly snapshotStats: RenderSnapshotStats;
  readonly movementMetrics: MovementStepMetrics;
  readonly obstacleResponseStats: ObstacleSoftResponseStats;
  readonly obstacleLifecycleTelemetry: ObstacleLifecycleTelemetry;
  readonly energyStats: EnergySurvivalStats;
  readonly spatialBuildStats: SpatialHashBuildStats;
  readonly neighborQueryStats: LocalNeighborSummary;
  readonly sensorStats: SensorPassStats;
  readonly predatorPreyStats: PredatorPreyInteractionStats;
  readonly reproductionStats: ReproductionStepStats;
  readonly resourceBuildStats: ResourceBuildStats;
  readonly resourcePickupStats: ResourcePickupStats;
  readonly resourceRespawnStats: SpawnValidationStats;
  readonly resourceAliveCount: number;
  readonly resourceTargetCount: number;
  readonly resourceRespawnedCount: number;
  readonly gridBuildMs: number;
  readonly neighborQueryMs: number;
  readonly sensorMs: number;
  readonly obstacleResponseMs: number;
  readonly predatorPreyMs: number;
  readonly resourceMs: number;
  readonly energyMs: number;
  readonly reproductionMs: number;
  readonly fieldDynamicsMs: number;
  readonly simMsPerTick: number;
};

export type PixiRendererOptions = {
  host: HTMLElement;
  perfOverlay: PerfOverlaySink;
  snapshotSource: SimulationFrameSource;
  renderDebugConfig?: RenderDebugConfigPatch;
};

export type PixiRendererHandle = {
  destroy: () => void;
  updateRenderDebugConfig: (patch: RenderDebugConfigPatch) => void;
  getRenderDebugConfig: () => RenderDebugConfig;
};

type AgentGlyph = { readonly graphic: Graphics; colorRGBA: number };

const GRID_STEP_PX = 64;
const MAX_DEVICE_PIXEL_RATIO = 2;
const MAX_RENDER_DELTA_SECONDS = 1 / 20;
const FIELD_VECTOR_MAX_SCREEN_LENGTH = 22;
const FIELD_VECTOR_MIN_SCREEN_LENGTH = 4;

export async function mountPixiRenderer(options: PixiRendererOptions): Promise<PixiRendererHandle> {
  const app = new Application();

  await app.init({
    background: 0x07090b,
    resizeTo: options.host,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO),
    powerPreference: "high-performance"
  });

  app.canvas.className = "qubok_evolve-canvas";
  options.host.append(app.canvas);

  let renderDebugConfig = makeRenderDebugConfig(options.renderDebugConfig);
  const world = new Container();
  const backgroundLayer = new Graphics();
  const gridLayer = new Graphics();
  const obstacleLayer = new Graphics();
  const terrainLayer = new Graphics();
  const fieldLayer = new Graphics();
  const agentLayer = new Container();

  world.addChild(backgroundLayer, gridLayer, terrainLayer, fieldLayer, obstacleLayer, agentLayer);
  app.stage.addChild(world);
  applyRenderDebugVisibility(renderDebugConfig, gridLayer, terrainLayer, fieldLayer, obstacleLayer, agentLayer);

  const glyphs: AgentGlyph[] = [];
  const metrics = createPerfMetricsBus();
  let frameIndex = 0;

  const updateRenderDebugConfig = (patch: RenderDebugConfigPatch): void => {
    renderDebugConfig = makeRenderDebugConfig({ ...renderDebugConfig, ...patch });
    applyRenderDebugVisibility(renderDebugConfig, gridLayer, terrainLayer, fieldLayer, obstacleLayer, agentLayer);
  };

  const drawStaticLayers = (): void => {
    drawBackground(backgroundLayer, options.host.clientWidth, options.host.clientHeight);
    drawGrid(gridLayer, options.host.clientWidth, options.host.clientHeight);
  };

  drawStaticLayers();
  const resizeObserver = new ResizeObserver(drawStaticLayers);
  resizeObserver.observe(options.host);

  app.ticker.add((ticker) => {
    const endRenderScope = metrics.beginScope("renderMsPerFrame");
    const deltaSeconds = Math.min(ticker.deltaMS / 1000, MAX_RENDER_DELTA_SECONDS);
    const frame = options.snapshotSource(deltaSeconds);

    applyRenderDebugVisibility(renderDebugConfig, gridLayer, terrainLayer, fieldLayer, obstacleLayer, agentLayer);

    metrics.record("simMsPerTick", frame.simMsPerTick);
    metrics.record("gridBuildMs", frame.gridBuildMs);
    metrics.record("neighborQueryMs", frame.neighborQueryMs);
    metrics.record("sensorMs", frame.sensorMs);
    metrics.record("obstacleResponseMs", frame.obstacleResponseMs);
    metrics.record("obstacleResponseForces", frame.obstacleResponseStats.forceAppliedCount);
    metrics.record("obstacleResponseHits", frame.obstacleResponseStats.obstacleHits);
    metrics.record("obstacleResponseCellChecks", frame.obstacleResponseStats.obstacleCellChecks);
    metrics.record("obstacleResponseSkippedCells", frame.obstacleResponseStats.obstacleCellsSkippedByStride);
    metrics.record("obstacleResponseLimitHits", frame.obstacleResponseStats.obstacleCellCheckLimitHits);
    metrics.record("obstacleResponseBoundaryHits", frame.obstacleResponseStats.boundaryHits);
    metrics.record("obstacleLifecycleEvents", frame.obstacleLifecycleTelemetry.lifecycleEventCount);
    metrics.record("obstacleLifecyclePressure", frame.obstacleLifecycleTelemetry.lifecyclePressureScore);
    metrics.record("obstacleSpawnBlockedAttempts", frame.obstacleLifecycleTelemetry.spawnBlockedAttempts);
    metrics.record("obstacleSpawnFallbacks", frame.obstacleLifecycleTelemetry.spawnFallbacks);
    metrics.record("obstacleSpawnFailures", frame.obstacleLifecycleTelemetry.spawnFailures);
    metrics.record("obstacleReproductionBlocked", frame.obstacleLifecycleTelemetry.reproductionBlockedByObstacle);
    metrics.record("obstacleReproductionFailures", frame.obstacleLifecycleTelemetry.reproductionPlacementFailures);
    metrics.record("obstacleResourceRespawns", frame.obstacleLifecycleTelemetry.resourceRespawnedCount);
    metrics.record("obstacleRenderCellCount", frame.obstacleMaskSnapshot.occupiedCellCount);
    metrics.record("terrainRenderCellCount", frame.terrainRenderSnapshot.sampleCellCount);
    metrics.record("terrainRenderTruncated", frame.terrainRenderSnapshot.truncated ? 1 : 0);
    metrics.record("fieldRenderVectorCount", frame.fieldRenderSnapshot.sampleVectorCount);
    metrics.record("fieldRenderTruncated", frame.fieldRenderSnapshot.truncated ? 1 : 0);
    metrics.record("predatorPreyMs", frame.predatorPreyMs);
    metrics.record("resourceMs", frame.resourceMs);
    metrics.record("energyMs", frame.energyMs);
    metrics.record("reproductionMs", frame.reproductionMs);
    metrics.record("entityCount", frame.snapshot.count);
    metrics.record("aliveCount", frame.snapshotStats.aliveCount);
    metrics.record("averageEnergy01", frame.snapshotStats.averageEnergy01);
    metrics.record("tick", frame.snapshot.tick);
    metrics.record("movementIntegratedCount", frame.movementMetrics.movedCount);
    metrics.record("movementAliveCount", frame.movementMetrics.aliveCount);
    metrics.record("movementDistanceSum", frame.movementMetrics.distanceAccumulated);
    metrics.record("terrainMovementSampleCount", frame.movementMetrics.terrainMovementSampleCount);
    metrics.record("terrainMovementCostSum", frame.movementMetrics.terrainMovementCostSum);
    metrics.record("terrainFrictionSum", frame.movementMetrics.terrainFrictionSum);
    metrics.record("terrainDragSum", frame.movementMetrics.terrainDragSum);
    metrics.record("fieldMovementSampleCount", frame.movementMetrics.fieldMovementSampleCount);
    metrics.record("fieldFlowXSum", frame.movementMetrics.fieldFlowXSum);
    metrics.record("fieldFlowYSum", frame.movementMetrics.fieldFlowYSum);
    metrics.record("fieldFlowMagnitudeSum", frame.movementMetrics.fieldFlowMagnitudeSum);
    metrics.record("fieldDynamicsMs", frame.fieldDynamicsMs);
    metrics.record("fieldDynamicsActiveCellCount", frame.fieldDynamicsStats.activeCellCount);
    metrics.record("fieldDynamicsUpdatedCellCount", frame.fieldDynamicsStats.updatedCellCount);
    metrics.record("fieldDynamicsTransferCount", frame.fieldDynamicsStats.diffusionTransferCount);
    metrics.record("fieldDynamicsMagnitudeLoss", frame.fieldDynamicsStats.decayMagnitudeLoss);
    metrics.record("fieldDynamicsMagnitudeAfter", frame.fieldDynamicsStats.totalMagnitudeAfter);
    metrics.record("deathsThisStep", frame.energyStats.deathsThisStep);
    metrics.record("starvingCount", frame.energyStats.starvingCount);
    metrics.record("starvationDamage", frame.energyStats.starvationDamage);
    metrics.record("neighborCandidates", frame.neighborQueryStats.totalCandidates);
    metrics.record("avgNeighborsPerAgent", frame.neighborQueryStats.avgNeighborsPerAgent);
    metrics.record("sensorVisibleNeighbors", frame.sensorStats.visibleNeighborCount);
    metrics.record("sensorSectorWrites", frame.sensorStats.sectorWrites);
    metrics.record("sensorFoodVisibleCount", frame.sensorStats.foodVisibleCount);
    metrics.record("sensorFoodSectorWrites", frame.sensorStats.foodSectorWrites);
    metrics.record("sensorObstacleSectorWrites", frame.sensorStats.obstacleSectorWrites);
    metrics.record("sensorObstacleMaskCellChecks", frame.sensorStats.obstacleMaskCellChecks);
    metrics.record("sensorObstacleMaskHits", frame.sensorStats.obstacleMaskHits);
    metrics.record("sensorObstacleMaskSectorWrites", frame.sensorStats.obstacleMaskSectorWrites);
    metrics.record("sensorFoodSignalSum", frame.sensorStats.foodSignalSum);
    metrics.record("sensorObstacleSignalSum", frame.sensorStats.obstacleSignalSum);
    metrics.record("sensorFoodScheduled", frame.sensorStats.foodSensorScheduled ? 1 : 0);
    metrics.record("sensorObstacleScheduled", frame.sensorStats.obstacleSensorScheduled ? 1 : 0);
    metrics.record("sensorFoodSkippedByCadence", frame.sensorStats.foodSkippedByCadence ? 1 : 0);
    metrics.record("sensorObstacleSkippedByCadence", frame.sensorStats.obstacleSkippedByCadence ? 1 : 0);
    metrics.record("terrainSensorSampleCount", frame.sensorStats.terrainSensorSampleCount);
    metrics.record("terrainSensorMovementCostSum", frame.sensorStats.terrainSensorMovementCostSum);
    metrics.record("terrainSensorFrictionSum", frame.sensorStats.terrainSensorFrictionSum);
    metrics.record("terrainSensorDragSum", frame.sensorStats.terrainSensorDragSum);
    metrics.record("terrainSensorResourceAffinitySum", frame.sensorStats.terrainSensorResourceAffinitySum);
    metrics.record("terrainSensorScheduled", frame.sensorStats.terrainSensorScheduled ? 1 : 0);
    metrics.record("terrainSensorSkippedByCadence", frame.sensorStats.terrainSkippedByCadence ? 1 : 0);
    metrics.record("avgVisibleNeighborsPerAgent", frame.sensorStats.averageVisibleNeighborsPerCheckedAgent);
    metrics.record("attacksThisStep", frame.predatorPreyStats.attacksThisStep);
    metrics.record("killsThisStep", frame.predatorPreyStats.killsThisStep);
    metrics.record("predatorDamageDealt", frame.predatorPreyStats.damageDealt);
    metrics.record("predatorEnergyGained", frame.predatorPreyStats.energyGained);
    metrics.record("resourceAliveCount", frame.resourceAliveCount);
    metrics.record("terrainResourceSampleCount", frame.resourceRespawnStats.terrainResourceSampleCount);
    metrics.record("terrainResourceAffinitySum", frame.resourceRespawnStats.terrainResourceAffinitySum);
    metrics.record("terrainResourceRejectedCount", frame.resourceRespawnStats.terrainResourceRejectedCount);
    metrics.record("foodPickupCount", frame.resourcePickupStats.consumedCount);
    metrics.record("foodEnergyTransferred", frame.resourcePickupStats.energyTransferred);
    metrics.record("birthsThisStep", frame.reproductionStats.birthsThisStep);
    metrics.record("reproductionEligibleCount", frame.reproductionStats.eligibleCount);
    metrics.record("blockedBirthsByCapacity", frame.reproductionStats.blockedByCapacity);
    metrics.record("terrainOffspringSampleCount", frame.reproductionStats.terrainOffspringSampleCount);
    metrics.record("terrainOffspringAffinitySum", frame.reproductionStats.terrainOffspringAffinitySum);
    metrics.record("terrainOffspringRejectedCount", frame.reproductionStats.terrainOffspringRejectedCount);
    metrics.record("reusableSlotCount", frame.snapshot.reusableSlotCount);
    metrics.record("spawnReusedSlotCount", frame.snapshot.spawnReusedSlotCount);
    metrics.record("spawnAppendedSlotCount", frame.snapshot.spawnAppendedSlotCount);
    metrics.record("mutationChangedCount", frame.reproductionStats.mutationChangedCount);

    const endTerrainRenderScope = metrics.beginScope("terrainRenderMs");
    if (renderDebugConfig.showTerrainLayer) {
      renderTerrainLayer(terrainLayer, frame.terrainRenderSnapshot, options.host.clientWidth, options.host.clientHeight);
    } else {
      terrainLayer.clear();
    }
    const terrainRenderMs = endTerrainRenderScope();

    const endFieldRenderScope = metrics.beginScope("fieldRenderMs");
    if (renderDebugConfig.showFieldVectorLayer) {
      renderFieldVectorLayer(fieldLayer, frame.fieldRenderSnapshot, options.host.clientWidth, options.host.clientHeight, renderDebugConfig);
    } else {
      fieldLayer.clear();
    }
    const fieldRenderMs = endFieldRenderScope();

    const endObstacleRenderScope = metrics.beginScope("obstacleRenderMs");
    if (renderDebugConfig.showObstacleLayer) {
      renderObstacleMask(obstacleLayer, frame.obstacleMaskSnapshot, options.host.clientWidth, options.host.clientHeight);
    } else {
      obstacleLayer.clear();
    }
    const obstacleRenderMs = endObstacleRenderScope();

    if (renderDebugConfig.showAgents) {
      renderSnapshot(agentLayer, glyphs, frame.snapshot, options.host.clientWidth, options.host.clientHeight);
    }

    const renderMsPerFrame = endRenderScope();
    metrics.record("frameMs", ticker.elapsedMS);
    metrics.record("fps", app.ticker.FPS);

    frameIndex += 1;
    if (frameIndex % 10 === 0) {
      const snapshot = metrics.makeSnapshot();
      options.perfOverlay.update({
        fps: snapshot.values.fps,
        frameMs: snapshot.values.frameMs,
        renderMsPerFrame,
        simMsPerTick: snapshot.values.simMsPerTick,
        gridBuildMs: snapshot.values.gridBuildMs,
        neighborQueryMs: snapshot.values.neighborQueryMs,
        sensorMs: snapshot.values.sensorMs,
        obstacleResponseMs: snapshot.values.obstacleResponseMs,
        obstacleResponseForces: snapshot.values.obstacleResponseForces,
        obstacleResponseHits: snapshot.values.obstacleResponseHits,
        obstacleResponseCellChecks: snapshot.values.obstacleResponseCellChecks,
        obstacleResponseSkippedCells: snapshot.values.obstacleResponseSkippedCells,
        obstacleResponseLimitHits: snapshot.values.obstacleResponseLimitHits,
        obstacleResponseBoundaryHits: snapshot.values.obstacleResponseBoundaryHits,
        obstacleLifecycleEvents: snapshot.values.obstacleLifecycleEvents,
        obstacleLifecyclePressure: snapshot.values.obstacleLifecyclePressure,
        obstacleSpawnBlockedAttempts: snapshot.values.obstacleSpawnBlockedAttempts,
        obstacleSpawnFallbacks: snapshot.values.obstacleSpawnFallbacks,
        obstacleSpawnFailures: snapshot.values.obstacleSpawnFailures,
        obstacleReproductionBlocked: snapshot.values.obstacleReproductionBlocked,
        obstacleReproductionFailures: snapshot.values.obstacleReproductionFailures,
        obstacleResourceRespawns: snapshot.values.obstacleResourceRespawns,
        obstacleRenderMs: snapshot.values.obstacleRenderMs || obstacleRenderMs,
        obstacleRenderCellCount: snapshot.values.obstacleRenderCellCount,
        terrainRenderMs: snapshot.values.terrainRenderMs || terrainRenderMs,
        terrainRenderCellCount: snapshot.values.terrainRenderCellCount,
        terrainRenderTruncated: snapshot.values.terrainRenderTruncated,
        fieldRenderMs: snapshot.values.fieldRenderMs || fieldRenderMs,
        fieldRenderVectorCount: snapshot.values.fieldRenderVectorCount,
        fieldRenderTruncated: snapshot.values.fieldRenderTruncated,
        predatorPreyMs: snapshot.values.predatorPreyMs,
        resourceMs: snapshot.values.resourceMs,
        energyMs: snapshot.values.energyMs,
        reproductionMs: snapshot.values.reproductionMs,
        entityCount: snapshot.values.entityCount,
        aliveCount: snapshot.values.aliveCount,
        averageEnergy01: snapshot.values.averageEnergy01,
        tick: snapshot.values.tick,
        movementIntegratedCount: snapshot.values.movementIntegratedCount,
        terrainMovementSampleCount: snapshot.values.terrainMovementSampleCount,
        terrainMovementCostSum: snapshot.values.terrainMovementCostSum,
        terrainFrictionSum: snapshot.values.terrainFrictionSum,
        terrainDragSum: snapshot.values.terrainDragSum,
        fieldMovementSampleCount: snapshot.values.fieldMovementSampleCount,
        fieldFlowXSum: snapshot.values.fieldFlowXSum,
        fieldFlowYSum: snapshot.values.fieldFlowYSum,
        fieldFlowMagnitudeSum: snapshot.values.fieldFlowMagnitudeSum,
        fieldDynamicsMs: snapshot.values.fieldDynamicsMs,
        fieldDynamicsActiveCellCount: snapshot.values.fieldDynamicsActiveCellCount,
        fieldDynamicsUpdatedCellCount: snapshot.values.fieldDynamicsUpdatedCellCount,
        fieldDynamicsTransferCount: snapshot.values.fieldDynamicsTransferCount,
        fieldDynamicsMagnitudeLoss: snapshot.values.fieldDynamicsMagnitudeLoss,
        fieldDynamicsMagnitudeAfter: snapshot.values.fieldDynamicsMagnitudeAfter,
        deathsThisStep: snapshot.values.deathsThisStep,
        starvingCount: snapshot.values.starvingCount,
        starvationDamage: snapshot.values.starvationDamage,
        spatialUsedCells: frame.spatialBuildStats.usedCellCount,
        spatialMaxCellOccupancy: frame.spatialBuildStats.maxCellOccupancy,
        neighborCandidates: snapshot.values.neighborCandidates,
        avgNeighborsPerAgent: snapshot.values.avgNeighborsPerAgent,
        maxNeighborsForAgent: frame.neighborQueryStats.maxNeighborsForAgent,
        sensorVisibleNeighbors: snapshot.values.sensorVisibleNeighbors,
        sensorSectorWrites: snapshot.values.sensorSectorWrites,
        avgVisibleNeighborsPerAgent: snapshot.values.avgVisibleNeighborsPerAgent,
        sensorFoodVisibleCount: snapshot.values.sensorFoodVisibleCount,
        sensorFoodSectorWrites: snapshot.values.sensorFoodSectorWrites,
        sensorObstacleSectorWrites: snapshot.values.sensorObstacleSectorWrites,
        sensorObstacleMaskCellChecks: snapshot.values.sensorObstacleMaskCellChecks,
        sensorObstacleMaskHits: snapshot.values.sensorObstacleMaskHits,
        sensorObstacleMaskSectorWrites: snapshot.values.sensorObstacleMaskSectorWrites,
        sensorFoodSignalSum: snapshot.values.sensorFoodSignalSum,
        sensorObstacleSignalSum: snapshot.values.sensorObstacleSignalSum,
        sensorFoodScheduled: snapshot.values.sensorFoodScheduled,
        sensorObstacleScheduled: snapshot.values.sensorObstacleScheduled,
        sensorFoodSkippedByCadence: snapshot.values.sensorFoodSkippedByCadence,
        sensorObstacleSkippedByCadence: snapshot.values.sensorObstacleSkippedByCadence,
        terrainSensorSampleCount: snapshot.values.terrainSensorSampleCount,
        terrainSensorMovementCostSum: snapshot.values.terrainSensorMovementCostSum,
        terrainSensorFrictionSum: snapshot.values.terrainSensorFrictionSum,
        terrainSensorDragSum: snapshot.values.terrainSensorDragSum,
        terrainSensorResourceAffinitySum: snapshot.values.terrainSensorResourceAffinitySum,
        terrainSensorScheduled: snapshot.values.terrainSensorScheduled,
        terrainSensorSkippedByCadence: snapshot.values.terrainSensorSkippedByCadence,
        attacksThisStep: snapshot.values.attacksThisStep,
        killsThisStep: snapshot.values.killsThisStep,
        predatorDamageDealt: snapshot.values.predatorDamageDealt,
        predatorEnergyGained: snapshot.values.predatorEnergyGained,
        resourceAliveCount: snapshot.values.resourceAliveCount,
        terrainResourceSampleCount: snapshot.values.terrainResourceSampleCount,
        terrainResourceAffinitySum: snapshot.values.terrainResourceAffinitySum,
        terrainResourceRejectedCount: snapshot.values.terrainResourceRejectedCount,
        resourceTargetCount: frame.resourceTargetCount,
        foodPickupCount: snapshot.values.foodPickupCount,
        foodEnergyTransferred: snapshot.values.foodEnergyTransferred,
        birthsThisStep: snapshot.values.birthsThisStep,
        reproductionEligibleCount: snapshot.values.reproductionEligibleCount,
        blockedBirthsByCapacity: snapshot.values.blockedBirthsByCapacity,
        terrainOffspringSampleCount: snapshot.values.terrainOffspringSampleCount,
        terrainOffspringAffinitySum: snapshot.values.terrainOffspringAffinitySum,
        terrainOffspringRejectedCount: snapshot.values.terrainOffspringRejectedCount,
        reusableSlotCount: snapshot.values.reusableSlotCount,
        spawnReusedSlotCount: snapshot.values.spawnReusedSlotCount,
        spawnAppendedSlotCount: snapshot.values.spawnAppendedSlotCount,
        mutationChangedCount: snapshot.values.mutationChangedCount,
        metrics: snapshot
      });
    }
  });

  return {
    updateRenderDebugConfig,
    getRenderDebugConfig: () => renderDebugConfig,
    destroy: () => {
      resizeObserver.disconnect();
      app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
    }
  };
}

function applyRenderDebugVisibility(config: RenderDebugConfig, gridLayer: Graphics, terrainLayer: Graphics, fieldLayer: Graphics, obstacleLayer: Graphics, agentLayer: Container): void {
  gridLayer.visible = config.showGrid;
  terrainLayer.visible = config.showTerrainLayer;
  fieldLayer.visible = config.showFieldVectorLayer;
  obstacleLayer.visible = config.showObstacleLayer;
  agentLayer.visible = config.showAgents;
}

function renderFieldVectorLayer(layer: Graphics, snapshot: FieldRenderSnapshot, viewportWidth: number, viewportHeight: number, config: RenderDebugConfig): void {
  layer.clear();
  if (snapshot.sampleVectorCount <= 0 || config.fieldVectorAlpha <= 0 || config.fieldVectorScale <= 0) return;

  const scaleX = viewportWidth / snapshot.worldWidth;
  const scaleY = viewportHeight / snapshot.worldHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (viewportWidth - snapshot.worldWidth * scale) * 0.5;
  const offsetY = (viewportHeight - snapshot.worldHeight * scale) * 0.5;
  const stride = Math.max(1, Math.round(config.fieldVectorStride));

  for (let index = 0; index < snapshot.sampleVectorCount; index += 1) {
    if (index % stride !== 0) continue;
    const magnitude = snapshot.magnitude[index];
    if (magnitude < config.fieldVectorMinMagnitude) continue;
    const x = offsetX + snapshot.centerX[index] * scale;
    const y = offsetY + snapshot.centerY[index] * scale;
    const dirX = snapshot.flowX[index] / magnitude;
    const dirY = snapshot.flowY[index] / magnitude;
    const length = Math.max(FIELD_VECTOR_MIN_SCREEN_LENGTH, Math.min(FIELD_VECTOR_MAX_SCREEN_LENGTH, magnitude * config.fieldVectorScale));
    const endX = x + dirX * length;
    const endY = y + dirY * length;
    const headLength = Math.min(5, length * 0.35);
    const normalX = -dirY;
    const normalY = dirX;
    layer.moveTo(x, y);
    layer.lineTo(endX, endY);
    layer.moveTo(endX, endY);
    layer.lineTo(endX - dirX * headLength + normalX * headLength * 0.45, endY - dirY * headLength + normalY * headLength * 0.45);
    layer.moveTo(endX, endY);
    layer.lineTo(endX - dirX * headLength - normalX * headLength * 0.45, endY - dirY * headLength - normalY * headLength * 0.45);
  }

  layer.stroke({ width: 1, color: 0x7cc7ff, alpha: config.fieldVectorAlpha });
}

function renderTerrainLayer(layer: Graphics, snapshot: TerrainRenderSnapshot, viewportWidth: number, viewportHeight: number): void {
  layer.clear();
  if (snapshot.sampleCellCount <= 0) return;
  const scaleX = viewportWidth / snapshot.worldWidth;
  const scaleY = viewportHeight / snapshot.worldHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (viewportWidth - snapshot.worldWidth * scale) * 0.5;
  const offsetY = (viewportHeight - snapshot.worldHeight * scale) * 0.5;
  const cellSizePx = Math.max(1, snapshot.cellSize * scale);
  for (let index = 0; index < snapshot.sampleCellCount; index += 1) {
    const cellId = snapshot.cellIds[index];
    const cellX = cellId % snapshot.columns;
    const cellY = Math.floor(cellId / snapshot.columns);
    const materialId = snapshot.materialIds[index];
    const x = offsetX + cellX * snapshot.cellSize * scale;
    const y = offsetY + cellY * snapshot.cellSize * scale;
    const palette = getTerrainMaterialColor(materialId);
    layer.rect(x, y, cellSizePx, cellSizePx).fill({ color: palette.color, alpha: palette.alpha });
  }
}

function getTerrainMaterialColor(materialId: number): { readonly color: number; readonly alpha: number } {
  switch (materialId % 4) {
    case 1: return { color: 0x5c4a2f, alpha: 0.22 };
    case 2: return { color: 0x244d63, alpha: 0.26 };
    case 3: return { color: 0x535a61, alpha: 0.2 };
    default: return { color: 0x243a2d, alpha: 0.18 };
  }
}

function renderObstacleMask(layer: Graphics, snapshot: ObstacleMaskRenderSnapshot, viewportWidth: number, viewportHeight: number): void {
  layer.clear();
  if (snapshot.occupiedCellCount <= 0) return;
  const scaleX = viewportWidth / snapshot.worldWidth;
  const scaleY = viewportHeight / snapshot.worldHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (viewportWidth - snapshot.worldWidth * scale) * 0.5;
  const offsetY = (viewportHeight - snapshot.worldHeight * scale) * 0.5;
  const cellSizePx = Math.max(1, snapshot.cellSize * scale);
  for (let index = 0; index < snapshot.occupiedCellCount; index += 1) {
    const cellId = snapshot.occupiedCellIds[index];
    const cellX = cellId % snapshot.columns;
    const cellY = Math.floor(cellId / snapshot.columns);
    const x = offsetX + cellX * snapshot.cellSize * scale;
    const y = offsetY + cellY * snapshot.cellSize * scale;
    layer.rect(x, y, cellSizePx, cellSizePx).fill({ color: 0x314255, alpha: 0.34 });
    layer.rect(x + 0.5, y + 0.5, Math.max(0, cellSizePx - 1), Math.max(0, cellSizePx - 1)).stroke({ width: 1, color: 0x8fb8d8, alpha: 0.16 });
  }
}

function renderSnapshot(parent: Container, glyphs: AgentGlyph[], snapshot: RenderSnapshot, viewportWidth: number, viewportHeight: number): void {
  ensureGlyphCount(parent, glyphs, snapshot);
  const scaleX = viewportWidth / snapshot.worldWidth;
  const scaleY = viewportHeight / snapshot.worldHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (viewportWidth - snapshot.worldWidth * scale) * 0.5;
  const offsetY = (viewportHeight - snapshot.worldHeight * scale) * 0.5;
  for (let index = 0; index < glyphs.length; index += 1) {
    const glyph = glyphs[index].graphic;
    const visible = index < snapshot.count && snapshot.alive[index] === 1;
    glyph.visible = visible;
    if (!visible) continue;
    glyph.x = offsetX + snapshot.x[index] * scale;
    glyph.y = offsetY + snapshot.y[index] * scale;
    glyph.rotation = Math.atan2(snapshot.headingY[index], snapshot.headingX[index]);
    glyph.scale.set(Math.max(1.0, snapshot.radius[index] * scale * 1.15));
    const maxEnergy = Math.max(snapshot.maxEnergy[index], 0.000001);
    const energy01 = Math.max(0.18, Math.min(1, snapshot.energy[index] / maxEnergy));
    glyph.alpha = 0.32 + energy01 * 0.68;
  }
}

function ensureGlyphCount(parent: Container, glyphs: AgentGlyph[], snapshot: RenderSnapshot): void {
  while (glyphs.length < snapshot.count) {
    const index = glyphs.length;
    const colorRGBA = snapshot.colorRGBA[index] ?? 0xffffffff;
    const glyph = createAgentGlyph(colorRGBA);
    glyphs.push(glyph);
    parent.addChild(glyph.graphic);
  }
  for (let index = 0; index < snapshot.count; index += 1) {
    const colorRGBA = snapshot.colorRGBA[index];
    if (glyphs[index].colorRGBA !== colorRGBA) {
      redrawAgentGlyph(glyphs[index].graphic, colorRGBA);
      glyphs[index].colorRGBA = colorRGBA;
    }
  }
}

function createAgentGlyph(colorRGBA: number): AgentGlyph {
  const graphic = new Graphics();
  redrawAgentGlyph(graphic, colorRGBA);
  return { graphic, colorRGBA };
}

function redrawAgentGlyph(graphic: Graphics, colorRGBA: number): void {
  const color = (colorRGBA >>> 8) & 0xffffff;
  const alpha = Math.max(0.2, Math.min(1, (colorRGBA & 0xff) / 255));
  graphic.clear();
  graphic.circle(0, 0, 1).fill({ color, alpha });
  graphic.moveTo(0.35, 0);
  graphic.lineTo(1.35, 0);
  graphic.stroke({ width: 0.35, color: 0xe8f4ff, alpha: 0.55 });
}

function drawBackground(layer: Graphics, width: number, height: number): void {
  layer.clear();
  layer.rect(0, 0, width, height).fill(0x07090b);
  layer.rect(0, 0, width, height).fill({ color: 0x0f151b, alpha: 0.36 });
}

function drawGrid(layer: Graphics, width: number, height: number): void {
  layer.clear();
  for (let x = 0; x <= width; x += GRID_STEP_PX) { layer.moveTo(x + 0.5, 0); layer.lineTo(x + 0.5, height); }
  for (let y = 0; y <= height; y += GRID_STEP_PX) { layer.moveTo(0, y + 0.5); layer.lineTo(width, y + 0.5); }
  layer.stroke({ width: 1, color: 0x26313a, alpha: 0.38 });
}
