export interface VectorMetadata {
  id: string;
  title?: string;
  path: string;
  modified: number;
  hash: string;
  [key: string]: unknown;
}

export interface VectorEntry {
  vector: number[];
  metadata: VectorMetadata;
}

export interface SearchOptions {
  topK: number;
  minScore?: number;
  filter?: (metadata: VectorMetadata) => boolean;
}

export interface SearchResult {
  entry: VectorEntry;
  score: number;
}

export interface IVectorStore {
  /**
   * Add a single vector to the store
   */
  add(entry: VectorEntry): Promise<void>;

  /**
   * Add multiple vectors in batch
   */
  addBatch(entries: VectorEntry[]): Promise<void>;

  /**
   * Search for similar vectors
   */
  search(
    queryVector: number[],
    options: SearchOptions,
  ): Promise<SearchResult[]>;

  /**
   * Update an existing vector
   */
  update(id: string, entry: VectorEntry): Promise<void>;

  /**
   * Remove a vector by ID
   */
  remove(id: string): Promise<void>;

  /**
   * Remove multiple vectors by IDs
   */
  removeBatch(ids: string[]): Promise<void>;

  /**
   * Get a vector by ID
   */
  get(id: string): Promise<VectorEntry | null>;

  /**
   * Check if a vector exists
   */
  has(id: string): Promise<boolean>;

  /**
   * Get the number of vectors in the store
   */
  size(): Promise<number>;

  /**
   * Clear all vectors
   */
  clear(): Promise<void>;

  /**
   * Persist the store to disk (if applicable)
   */
  persist?(): Promise<void>;

  /**
   * Load the store from disk (if applicable)
   */
  load?(): Promise<void>;
}

export abstract class BaseVectorStore implements IVectorStore {
  abstract add(entry: VectorEntry): Promise<void>;
  abstract addBatch(entries: VectorEntry[]): Promise<void>;
  abstract search(
    queryVector: number[],
    options: SearchOptions,
  ): Promise<SearchResult[]>;
  abstract update(id: string, entry: VectorEntry): Promise<void>;
  abstract remove(id: string): Promise<void>;
  abstract removeBatch(ids: string[]): Promise<void>;
  abstract get(id: string): Promise<VectorEntry | null>;
  abstract has(id: string): Promise<boolean>;
  abstract size(): Promise<number>;
  abstract clear(): Promise<void>;

  /**
   * Calculate cosine similarity between two vectors
   */
  protected cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Sort results by score in descending order
   */
  protected sortResults(results: SearchResult[]): SearchResult[] {
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Apply search options to results
   */
  protected applyOptions(
    results: SearchResult[],
    options: SearchOptions,
  ): SearchResult[] {
    let filtered = results;

    // Apply filter if provided
    if (options.filter) {
      const filterFn = options.filter;
      filtered = filtered.filter((result) => filterFn(result.entry.metadata));
    }

    // Apply minimum score threshold
    if (options.minScore !== undefined) {
      const minScore = options.minScore;
      filtered = filtered.filter((result) => result.score >= minScore);
    }

    // Sort and limit results
    return this.sortResults(filtered).slice(0, options.topK);
  }
}
