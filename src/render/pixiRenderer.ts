import { Application, Container, Graphics } from "pixi.js";
import type { EnergySurvivalStats } from "../sim/energy";
import type { MovementStepMetrics } from "../sim/movement";
import type { LocalNeighborSummary } from "../sim/neighborQuery";
import type { PredatorPreyInteractionStats } from "../sim/predatorPrey";
import type { RenderSnapshot, RenderSnapshotStats } from "../sim/renderSnapshot";
import type { ReproductionStepStats } from "../sim/reproduction";
import type { ResourceBuildStats, ResourcePickupStats } from "../sim/resources";
import type { SensorPassStats } from "../sim/sensors";
import type { SpatialHashBuildStats } from "../sim/spatialHash";
import { createPerfMetricsBus } from "../shared/perfMetrics";
import type { PerfOverlaySink } from "./debugOverlay";

export type SimulationFrameSource = (deltaSeconds: number) => {
  readonly snapshot: RenderSnapshot;
  readonly snapshotStats: RenderSnapshotStats;
  readonly movementMetrics: MovementStepMetrics;
  readonly energyStats: EnergySurvivalStats;
  readonly spatialBuildStats: SpatialHashBuildStats;
  readonly neighborQueryStats: LocalNeighborSummary;
  readonly sensorStats: SensorPassStats;
  readonly predatorPreyStats: PredatorPreyInteractionStats;
  readonly reproductionStats: ReproductionStepStats;
  readonly resourceBuildStats: ResourceBuildStats;
  readonly resourcePickupStats: ResourcePickupStats;
  readonly resourceAliveCount: number;
  readonly resourceTargetCount: number;
  readonly resourceRespawnedCount: number;
  readonly gridBuildMs: number;
  readonly neighborQueryMs: number;
  readonly sensorMs: number;
  readonly predatorPreyMs: number;
  readonly resourceMs: number;
  readonly energyMs: number;
  readonly reproductionMs: number;
  readonly simMsPerTick: number;
};

export type PixiRendererOptions = {
  host: HTMLElement;
  perfOverlay: PerfOverlaySink;
  snapshotSource: SimulationFrameSource;
};

export type PixiRendererHandle = {
  destroy: () => void;
};

type AgentGlyph = {
  readonly graphic: Graphics;
  colorRGBA: number;
};

const GRID_STEP_PX = 64;
const MAX_DEVICE_PIXEL_RATIO = 2;
const MAX_RENDER_DELTA_SECONDS = 1 / 20;

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

  const world = new Container();
  const backgroundLayer = new Graphics();
  const gridLayer = new Graphics();
  const agentLayer = new Container();

  world.addChild(backgroundLayer, gridLayer, agentLayer);
  app.stage.addChild(world);

  const glyphs: AgentGlyph[] = [];
  const metrics = createPerfMetricsBus();
  let frameIndex = 0;

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

    metrics.record("simMsPerTick", frame.simMsPerTick);
    metrics.record("gridBuildMs", frame.gridBuildMs);
    metrics.record("neighborQueryMs", frame.neighborQueryMs);
    metrics.record("sensorMs", frame.sensorMs);
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
    metrics.record("sensorFoodSignalSum", frame.sensorStats.foodSignalSum);
    metrics.record("sensorObstacleSignalSum", frame.sensorStats.obstacleSignalSum);
    metrics.record("avgVisibleNeighborsPerAgent", frame.sensorStats.averageVisibleNeighborsPerCheckedAgent);
    metrics.record("attacksThisStep", frame.predatorPreyStats.attacksThisStep);
    metrics.record("killsThisStep", frame.predatorPreyStats.killsThisStep);
    metrics.record("predatorDamageDealt", frame.predatorPreyStats.damageDealt);
    metrics.record("predatorEnergyGained", frame.predatorPreyStats.energyGained);
    metrics.record("resourceAliveCount", frame.resourceAliveCount);
    metrics.record("foodPickupCount", frame.resourcePickupStats.consumedCount);
    metrics.record("foodEnergyTransferred", frame.resourcePickupStats.energyTransferred);
    metrics.record("birthsThisStep", frame.reproductionStats.birthsThisStep);
    metrics.record("reproductionEligibleCount", frame.reproductionStats.eligibleCount);
    metrics.record("blockedBirthsByCapacity", frame.reproductionStats.blockedByCapacity);
    metrics.record("mutationChangedCount", frame.reproductionStats.mutationChangedCount);

    renderSnapshot(agentLayer, glyphs, frame.snapshot, options.host.clientWidth, options.host.clientHeight);

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
        predatorPreyMs: snapshot.values.predatorPreyMs,
        resourceMs: snapshot.values.resourceMs,
        energyMs: snapshot.values.energyMs,
        reproductionMs: snapshot.values.reproductionMs,
        entityCount: snapshot.values.entityCount,
        aliveCount: snapshot.values.aliveCount,
        averageEnergy01: snapshot.values.averageEnergy01,
        tick: snapshot.values.tick,
        movementIntegratedCount: snapshot.values.movementIntegratedCount,
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
        sensorFoodSignalSum: snapshot.values.sensorFoodSignalSum,
        sensorObstacleSignalSum: snapshot.values.sensorObstacleSignalSum,
        attacksThisStep: snapshot.values.attacksThisStep,
        killsThisStep: snapshot.values.killsThisStep,
        predatorDamageDealt: snapshot.values.predatorDamageDealt,
        predatorEnergyGained: snapshot.values.predatorEnergyGained,
        resourceAliveCount: snapshot.values.resourceAliveCount,
        resourceTargetCount: frame.resourceTargetCount,
        foodPickupCount: snapshot.values.foodPickupCount,
        foodEnergyTransferred: snapshot.values.foodEnergyTransferred,
        birthsThisStep: snapshot.values.birthsThisStep,
        reproductionEligibleCount: snapshot.values.reproductionEligibleCount,
        blockedBirthsByCapacity: snapshot.values.blockedBirthsByCapacity,
        mutationChangedCount: snapshot.values.mutationChangedCount,
        metrics: snapshot
      });
    }
  });

  return {
    destroy: () => {
      resizeObserver.disconnect();
      app.destroy(
        { removeView: true },
        {
          children: true,
          texture: false,
          textureSource: false
        }
      );
    }
  };
}

function renderSnapshot(
  parent: Container,
  glyphs: AgentGlyph[],
  snapshot: RenderSnapshot,
  viewportWidth: number,
  viewportHeight: number
): void {
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

    if (!visible) {
      continue;
    }

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

  for (let x = 0; x <= width; x += GRID_STEP_PX) {
    layer.moveTo(x + 0.5, 0);
    layer.lineTo(x + 0.5, height);
  }

  for (let y = 0; y <= height; y += GRID_STEP_PX) {
    layer.moveTo(0, y + 0.5);
    layer.lineTo(width, y + 0.5);
  }

  layer.stroke({
    width: 1,
    color: 0x26313a,
    alpha: 0.38
  });
}