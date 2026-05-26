import { assertFiniteNumber, assertIndexInRange } from "./arrays";
import { sampleTerrainAtPosition, type TerrainLayer } from "./terrain";
import { killAgent, type WorldState } from "./world";

export const MOVEMENT_SYSTEM_VERSION = "qubok_evolve.movement.v2" as const;

export type BoundsMode = "none" | "wrap" | "clamp";

export type MovementStepConfig = {
  readonly deltaSeconds: number;
  readonly boundsMode?: BoundsMode;
  readonly clearForces?: boolean;
  readonly minimumEnergy?: number;
  readonly terrain?: TerrainLayer;
};

export type MovementStepMetrics = {
  readonly tick: number;
  readonly deltaSeconds: number;
  readonly aliveCount: number;
  readonly movedCount: number;
  readonly deadCount: number;
  readonly distanceAccumulated: number;
  readonly energySpent: number;
  readonly terrainMovementSampleCount: number;
  readonly terrainMovementCostSum: number;
  readonly terrainFrictionSum: number;
  readonly terrainDragSum: number;
};

const EPSILON = 0.000001;
const DEFAULT_MINIMUM_ENERGY = 0;
const MAX_DELTA_SECONDS = 0.25;
const MIN_TERRAIN_SPEED_SCALE = 0.1;
const MAX_TERRAIN_SPEED_SCALE = 2;

export function addForce(world: WorldState, index: number, fx: number, fy: number): void {
  assertIndexInRange(index, world.count, "agent index");
  assertFiniteNumber(fx, "fx");
  assertFiniteNumber(fy, "fy");

  world.fx[index] += fx;
  world.fy[index] += fy;
}

export function clearForces(world: WorldState): void {
  world.fx.fill(0, 0, world.count);
  world.fy.fill(0, 0, world.count);
}

export function setVelocityFromHeading(world: WorldState, index: number, speed: number): void {
  assertIndexInRange(index, world.count, "agent index");
  assertFiniteNumber(speed, "speed");

  world.vx[index] = world.headingX[index] * speed;
  world.vy[index] = world.headingY[index] * speed;
}

export function stepMovement(world: WorldState, config: MovementStepConfig): MovementStepMetrics {
  const deltaSeconds = validateDeltaSeconds(config.deltaSeconds);
  const boundsMode = config.boundsMode ?? "wrap";
  const clearForcesAfterStep = config.clearForces ?? true;
  const minimumEnergy = config.minimumEnergy ?? DEFAULT_MINIMUM_ENERGY;
  const terrain = config.terrain;

  assertFiniteNumber(minimumEnergy, "minimumEnergy");

  let aliveCount = 0;
  let movedCount = 0;
  let deadCount = 0;
  let distanceAccumulated = 0;
  let energySpent = 0;
  let terrainMovementSampleCount = 0;
  let terrainMovementCostSum = 0;
  let terrainFrictionSum = 0;
  let terrainDragSum = 0;

  for (let index = 0; index < world.count; index += 1) {
    if (world.alive[index] !== 1) {
      continue;
    }

    aliveCount += 1;

    const previousX = world.x[index];
    const previousY = world.y[index];
    const terrainSample = terrain ? sampleTerrainAtPosition(terrain, previousX, previousY) : undefined;
    const terrainMovementCost = Math.max(EPSILON, terrainSample?.movementCost ?? 1);
    const terrainFriction = Math.max(0, terrainSample?.friction ?? 1);
    const terrainDrag = Math.max(0, terrainSample?.drag ?? 0);

    if (terrainSample) {
      terrainMovementSampleCount += 1;
      terrainMovementCostSum += terrainMovementCost;
      terrainFrictionSum += terrainFriction;
      terrainDragSum += terrainDrag;
    }

    const safeMass = Math.max(world.mass[index], EPSILON);
    let vx = world.vx[index] + (world.fx[index] / safeMass) * deltaSeconds;
    let vy = world.vy[index] + (world.fy[index] / safeMass) * deltaSeconds;

    const drag = Math.max(0, world.drag[index] + terrainDrag);
    const dragFactor = Math.max(0, 1 - drag * deltaSeconds);
    vx *= dragFactor;
    vy *= dragFactor;

    const terrainSpeedScale = clamp(terrainFriction / terrainMovementCost, MIN_TERRAIN_SPEED_SCALE, MAX_TERRAIN_SPEED_SCALE);
    const maxSpeed = Math.max(0, world.maxSpeed[index] * terrainSpeedScale);
    const speedBeforeClamp = Math.hypot(vx, vy);
    let speed = speedBeforeClamp;

    if (maxSpeed > EPSILON && speedBeforeClamp > maxSpeed) {
      const scale = maxSpeed / speedBeforeClamp;
      vx *= scale;
      vy *= scale;
      speed = maxSpeed;
    }

    let nextX = previousX + vx * deltaSeconds;
    let nextY = previousY + vy * deltaSeconds;

    if (boundsMode === "wrap") {
      nextX = wrapCoordinate(nextX, world.worldWidth);
      nextY = wrapCoordinate(nextY, world.worldHeight);
    } else if (boundsMode === "clamp") {
      nextX = clamp(nextX, 0, world.worldWidth);
      nextY = clamp(nextY, 0, world.worldHeight);
    }

    const frameDistance = Math.hypot(nextX - previousX, nextY - previousY);

    world.vx[index] = vx;
    world.vy[index] = vy;
    world.x[index] = nextX;
    world.y[index] = nextY;
    world.age[index] += deltaSeconds;
    world.distanceExplored[index] += frameDistance;

    if (speed > EPSILON) {
      world.headingX[index] = vx / speed;
      world.headingY[index] = vy / speed;
    }

    const basalCost = Math.max(0, world.metabolism[index]) * deltaSeconds;
    const movementCost = frameDistance * safeMass * 0.0005 * terrainMovementCost;
    const spent = basalCost + movementCost;
    world.energy[index] -= spent;
    energySpent += spent;

    if (world.energy[index] <= minimumEnergy) {
      world.energy[index] = 0;
      killAgent(world, index);
      deadCount += 1;
    }

    if (frameDistance > EPSILON) {
      movedCount += 1;
      distanceAccumulated += frameDistance;
    }
  }

  if (clearForcesAfterStep) {
    clearForces(world);
  }

  world.tick += 1;
  world.timeSeconds += deltaSeconds;

  return {
    tick: world.tick,
    deltaSeconds,
    aliveCount,
    movedCount,
    deadCount,
    distanceAccumulated,
    energySpent,
    terrainMovementSampleCount,
    terrainMovementCostSum,
    terrainFrictionSum,
    terrainDragSum
  };
}

function validateDeltaSeconds(deltaSeconds: number): number {
  assertFiniteNumber(deltaSeconds, "deltaSeconds");

  if (deltaSeconds <= 0 || deltaSeconds > MAX_DELTA_SECONDS) {
    throw new Error(`deltaSeconds must be > 0 and <= ${MAX_DELTA_SECONDS}. Received: ${deltaSeconds}`);
  }

  return deltaSeconds;
}

function wrapCoordinate(value: number, size: number): number {
  if (size <= 0) {
    return value;
  }

  const wrapped = value % size;
  return wrapped < 0 ? wrapped + size : wrapped;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
