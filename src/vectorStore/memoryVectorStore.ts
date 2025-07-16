import {
  BaseVectorStore,
  type VectorEntry,
  type SearchResult,
  type SearchOptions,
} from "./vectorStore.js";

export class MemoryVectorStore extends BaseVectorStore {
  private store = new Map<string, VectorEntry>();

  add(entry: VectorEntry): Promise<void> {
    if (!entry.metadata.id) {
      return Promise.reject(new Error("Vector entry must have an id"));
    }
    this.store.set(entry.metadata.id, entry);
    return Promise.resolve();
  }

  async addBatch(entries: VectorEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.add(entry);
    }
  }

  search(
    queryVector: number[],
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const entry of this.store.values()) {
      const score = this.cosineSimilarity(queryVector, entry.vector);
      results.push({ entry, score });
    }

    return Promise.resolve(this.applyOptions(results, options));
  }

  update(id: string, entry: VectorEntry): Promise<void> {
    if (this.store.has(id)) {
      this.store.set(id, entry);
      return Promise.resolve();
    } else {
      return Promise.reject(new Error(`Vector with id ${id} not found`));
    }
  }

  remove(id: string): Promise<void> {
    if (!this.store.delete(id)) {
      return Promise.reject(new Error(`Vector with id ${id} not found`));
    }
    return Promise.resolve();
  }

  async removeBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.remove(id);
    }
  }

  get(id: string): Promise<VectorEntry | null> {
    return Promise.resolve(this.store.get(id) || null);
  }

  has(id: string): Promise<boolean> {
    return Promise.resolve(this.store.has(id));
  }

  size(): Promise<number> {
    return Promise.resolve(this.store.size);
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }

  /**
   * Get all entries (useful for debugging or export)
   */
  getAllEntries(): Promise<VectorEntry[]> {
    return Promise.resolve(Array.from(this.store.values()));
  }

  /**
   * Get all ids (useful for listing)
   */
  getAllIds(): Promise<string[]> {
    return Promise.resolve(Array.from(this.store.keys()));
  }
}
