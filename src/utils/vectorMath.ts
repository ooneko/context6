/**
 * Vector mathematics utilities for semantic search
 */

/**
 * Calculate the dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i];
    const bVal = b[i];
    if (aVal === undefined || bVal === undefined) {
      throw new Error("Vectors contain undefined values");
    }
    sum += aVal * bVal;
  }
  return sum;
}

/**
 * Calculate the magnitude (L2 norm) of a vector
 */
export function magnitude(vector: number[]): number {
  let sum = 0;
  for (const val of vector) {
    sum += val * val;
  }
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 */
export function normalize(vector: number[]): number[] {
  const mag = magnitude(vector);
  if (mag === 0) {
    return vector.slice(); // Return copy of zero vector
  }
  return vector.map((val) => val / mag);
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (magA * magB);
}

/**
 * Calculate euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i];
    const bVal = b[i];
    if (aVal === undefined || bVal === undefined) {
      throw new Error("Vectors contain undefined values");
    }
    const diff = aVal - bVal;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Add two vectors
 */
export function add(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  return a.map((val, i) => {
    const bVal = b[i];
    if (bVal === undefined) {
      throw new Error("Vector b contains undefined values");
    }
    return val + bVal;
  });
}

/**
 * Subtract vector b from vector a
 */
export function subtract(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  return a.map((val, i) => {
    const bVal = b[i];
    if (bVal === undefined) {
      throw new Error("Vector b contains undefined values");
    }
    return val - bVal;
  });
}

/**
 * Scale a vector by a scalar value
 */
export function scale(vector: number[], scalar: number): number[] {
  return vector.map((val) => val * scalar);
}

/**
 * Calculate the average of multiple vectors
 */
export function average(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot average empty array of vectors");
  }

  const firstVector = vectors[0];
  if (!firstVector) {
    throw new Error("Cannot average empty array of vectors");
  }
  const dimension = firstVector.length;
  const result: number[] = new Array(dimension).fill(0) as number[];

  for (const vector of vectors) {
    if (vector.length !== dimension) {
      throw new Error("All vectors must have the same dimension");
    }
    for (let i = 0; i < dimension; i++) {
      const vecVal = vector[i];
      const resVal = result[i];
      if (vecVal === undefined || resVal === undefined) {
        throw new Error("Vector contains undefined values");
      }
      result[i] = resVal + vecVal;
    }
  }

  return scale(result, 1 / vectors.length);
}

/**
 * Find the k nearest neighbors from a set of vectors
 */
export interface NearestNeighbor {
  index: number;
  distance: number;
}

export function findNearestNeighbors(
  query: number[],
  vectors: number[][],
  k: number,
  metric: "cosine" | "euclidean" = "cosine",
): NearestNeighbor[] {
  const distances: NearestNeighbor[] = vectors.map((vector, index) => {
    const distance =
      metric === "cosine"
        ? 1 - cosineSimilarity(query, vector) // Convert similarity to distance
        : euclideanDistance(query, vector);
    return { index, distance };
  });

  // Sort by distance (ascending) and return top k
  return distances.sort((a, b) => a.distance - b.distance).slice(0, k);
}
