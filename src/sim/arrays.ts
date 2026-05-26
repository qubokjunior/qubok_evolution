export type NumericTypedArray =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array;

export type RuntimeArraySet = readonly NumericTypedArray[];

export function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${value}`);
  }
}

export function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer. Received: ${value}`);
  }
}

export function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number. Received: ${value}`);
  }
}

export function assertIndexInRange(index: number, capacity: number, name = "index"): void {
  assertNonNegativeInteger(index, name);

  if (index >= capacity) {
    throw new Error(`${name} out of range: ${index} >= ${capacity}`);
  }
}

export function createFloat32Array(length: number, name: string): Float32Array {
  assertNonNegativeInteger(length, name);
  return new Float32Array(length);
}

export function createUint8Array(length: number, name: string): Uint8Array {
  assertNonNegativeInteger(length, name);
  return new Uint8Array(length);
}

export function createUint16Array(length: number, name: string): Uint16Array {
  assertNonNegativeInteger(length, name);
  return new Uint16Array(length);
}

export function createUint32Array(length: number, name: string): Uint32Array {
  assertNonNegativeInteger(length, name);
  return new Uint32Array(length);
}

export function clearArrays(arrays: RuntimeArraySet): void {
  for (const array of arrays) {
    array.fill(0);
  }
}

export function getArraysByteLength(arrays: RuntimeArraySet): number {
  let bytes = 0;

  for (const array of arrays) {
    bytes += array.byteLength;
  }

  return bytes;
}
export function createInt32Array(length: number, name: string): Int32Array {
  assertNonNegativeInteger(length, name);
  return new Int32Array(length);
}
