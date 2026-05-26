import type { WorldState } from "./world";

export const RENDER_SNAPSHOT_VERSION = "qubok_evolve.render_snapshot.v1" as const;

export type RenderSnapshot = {
  readonly version: typeof RENDER_SNAPSHOT_VERSION;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly count: number;
  readonly tick: number;
  readonly timeSeconds: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly headingX: Float32Array;
  readonly headingY: Float32Array;
  readonly radius: Float32Array;
  readonly energy: Float32Array;
  readonly maxEnergy: Float32Array;
  readonly alive: Uint8Array;
  readonly speciesId: Uint16Array;
  readonly colorRGBA: Uint32Array;
};

export type RenderSnapshotStats = {
  readonly count: number;
  readonly aliveCount: number;
  readonly averageEnergy01: number;
};

export function makeRenderSnapshot(world: WorldState): RenderSnapshot {
  const count = world.count;

  return {
    version: RENDER_SNAPSHOT_VERSION,
    worldWidth: world.worldWidth,
    worldHeight: world.worldHeight,
    count,
    tick: world.tick,
    timeSeconds: world.timeSeconds,
    x: world.x.subarray(0, count),
    y: world.y.subarray(0, count),
    headingX: world.headingX.subarray(0, count),
    headingY: world.headingY.subarray(0, count),
    radius: world.radius.subarray(0, count),
    energy: world.energy.subarray(0, count),
    maxEnergy: world.maxEnergy.subarray(0, count),
    alive: world.alive.subarray(0, count),
    speciesId: world.speciesId.subarray(0, count),
    colorRGBA: world.colorRGBA.subarray(0, count)
  };
}

export function analyzeRenderSnapshot(snapshot: RenderSnapshot): RenderSnapshotStats {
  let aliveCount = 0;
  let energy01Sum = 0;

  for (let index = 0; index < snapshot.count; index += 1) {
    if (snapshot.alive[index] !== 1) {
      continue;
    }

    aliveCount += 1;
    const maxEnergy = Math.max(snapshot.maxEnergy[index], 0.000001);
    energy01Sum += clamp01(snapshot.energy[index] / maxEnergy);
  }

  return {
    count: snapshot.count,
    aliveCount,
    averageEnergy01: aliveCount > 0 ? energy01Sum / aliveCount : 0
  };
}

export function computeRenderSnapshotChecksum(snapshot: RenderSnapshot): number {
  let checksum = 2166136261 >>> 0;

  for (let index = 0; index < snapshot.count; index += 1) {
    checksum = mixChecksum(checksum, Math.round(snapshot.x[index] * 100));
    checksum = mixChecksum(checksum, Math.round(snapshot.y[index] * 100));
    checksum = mixChecksum(checksum, snapshot.alive[index]);
    checksum = mixChecksum(checksum, snapshot.speciesId[index]);
  }

  checksum = mixChecksum(checksum, snapshot.tick);
  return checksum >>> 0;
}

function mixChecksum(checksum: number, value: number): number {
  return Math.imul((checksum ^ (value >>> 0)) >>> 0, 16777619) >>> 0;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}