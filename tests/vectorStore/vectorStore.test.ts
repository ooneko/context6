import { BaseVectorStore } from '../../src/vectorStore/vectorStore.js';
import type { VectorEntry, SearchResult, SearchOptions } from '../../src/vectorStore/vectorStore.js';

// Mock implementation for testing
class TestVectorStore extends BaseVectorStore {
  private store = new Map<string, VectorEntry>();
  
  async add(entry: VectorEntry): Promise<void> {
    this.store.set(entry.metadata.id, entry);
  }
  
  async addBatch(entries: VectorEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.add(entry);
    }
  }
  
  async search(queryVector: number[], options: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const entry of this.store.values()) {
      const score = this.cosineSimilarity(queryVector, entry.vector);
      results.push({ entry, score });
    }
    
    return this.applyOptions(results, options);
  }
  
  async update(id: string, entry: VectorEntry): Promise<void> {
    if (this.store.has(id)) {
      this.store.set(id, entry);
    }
  }
  
  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }
  
  async removeBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.remove(id);
    }
  }
  
  async get(id: string): Promise<VectorEntry | null> {
    return this.store.get(id) || null;
  }
  
  async has(id: string): Promise<boolean> {
    return this.store.has(id);
  }
  
  async size(): Promise<number> {
    return this.store.size;
  }
  
  async clear(): Promise<void> {
    this.store.clear();
  }
}

describe('BaseVectorStore', () => {
  let store: TestVectorStore;
  
  beforeEach(() => {
    store = new TestVectorStore();
  });
  
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = [1, 0];
      const b = [1, 0];
      expect(store['cosineSimilarity'](a, b)).toBeCloseTo(1, 10);
      
      const c = [1, 0];
      const d = [0, 1];
      expect(store['cosineSimilarity'](c, d)).toBeCloseTo(0, 10);
      
      const e = [1, 0];
      const f = [-1, 0];
      expect(store['cosineSimilarity'](e, f)).toBeCloseTo(-1, 10);
    });
    
    it('should handle zero vectors', () => {
      const a = [0, 0];
      const b = [1, 1];
      expect(store['cosineSimilarity'](a, b)).toBe(0);
    });
    
    it('should throw error for different dimensions', () => {
      const a = [1, 2];
      const b = [1, 2, 3];
      expect(() => store['cosineSimilarity'](a, b)).toThrow('Vectors must have the same dimension');
    });
  });
  
  describe('sortResults', () => {
    it('should sort results by score in descending order', () => {
      const results: SearchResult[] = [
        { entry: { vector: [], metadata: { id: '1', path: '', hash: '', modified: 0 } }, score: 0.5 },
        { entry: { vector: [], metadata: { id: '2', path: '', hash: '', modified: 0 } }, score: 0.8 },
        { entry: { vector: [], metadata: { id: '3', path: '', hash: '', modified: 0 } }, score: 0.3 },
      ];
      
      const sorted = store['sortResults'](results);
      expect(sorted[0].score).toBe(0.8);
      expect(sorted[1].score).toBe(0.5);
      expect(sorted[2].score).toBe(0.3);
    });
  });
  
  describe('applyOptions', () => {
    const createResult = (id: string, score: number): SearchResult => ({
      entry: {
        vector: [],
        metadata: { id, path: `/path/${id}`, hash: '', modified: Date.now() }
      },
      score
    });
    
    it('should limit results by topK', () => {
      const results = [
        createResult('1', 0.9),
        createResult('2', 0.8),
        createResult('3', 0.7),
        createResult('4', 0.6),
      ];
      
      const filtered = store['applyOptions'](results, { topK: 2 });
      expect(filtered).toHaveLength(2);
      expect(filtered[0].score).toBe(0.9);
      expect(filtered[1].score).toBe(0.8);
    });
    
    it('should filter by minimum score', () => {
      const results = [
        createResult('1', 0.9),
        createResult('2', 0.5),
        createResult('3', 0.3),
      ];
      
      const filtered = store['applyOptions'](results, { topK: 10, minScore: 0.6 });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].score).toBe(0.9);
    });
    
    it('should apply custom filter', () => {
      const results = [
        createResult('1', 0.9),
        createResult('2', 0.8),
        createResult('3', 0.7),
      ];
      
      const filtered = store['applyOptions'](results, {
        topK: 10,
        filter: (metadata) => metadata.id !== '2'
      });
      expect(filtered).toHaveLength(2);
      expect(filtered.find(r => r.entry.metadata.id === '2')).toBeUndefined();
    });
  });
  
  describe('store operations', () => {
    const createEntry = (id: string): VectorEntry => ({
      vector: [1, 0, 0],
      metadata: { id, path: `/path/${id}`, hash: 'hash', modified: Date.now() }
    });
    
    it('should add and retrieve entries', async () => {
      const entry = createEntry('1');
      await store.add(entry);
      
      expect(await store.has('1')).toBe(true);
      expect(await store.get('1')).toEqual(entry);
      expect(await store.size()).toBe(1);
    });
    
    it('should add batch of entries', async () => {
      const entries = [createEntry('1'), createEntry('2'), createEntry('3')];
      await store.addBatch(entries);
      
      expect(await store.size()).toBe(3);
      expect(await store.has('2')).toBe(true);
    });
    
    it('should search for similar vectors', async () => {
      await store.addBatch([
        { vector: [1, 0, 0], metadata: { id: '1', path: '', hash: '', modified: 0 } },
        { vector: [0, 1, 0], metadata: { id: '2', path: '', hash: '', modified: 0 } },
        { vector: [0.7, 0.7, 0], metadata: { id: '3', path: '', hash: '', modified: 0 } },
      ]);
      
      const results = await store.search([1, 0, 0], { topK: 2 });
      expect(results).toHaveLength(2);
      expect(results[0].entry.metadata.id).toBe('1');
      expect(results[0].score).toBeCloseTo(1, 10);
    });
    
    it('should update entries', async () => {
      const entry = createEntry('1');
      await store.add(entry);
      
      const updated = { ...entry, vector: [0, 1, 0] };
      await store.update('1', updated);
      
      expect(await store.get('1')).toEqual(updated);
    });
    
    it('should remove entries', async () => {
      await store.add(createEntry('1'));
      expect(await store.has('1')).toBe(true);
      
      await store.remove('1');
      expect(await store.has('1')).toBe(false);
    });
    
    it('should remove batch of entries', async () => {
      await store.addBatch([createEntry('1'), createEntry('2'), createEntry('3')]);
      await store.removeBatch(['1', '3']);
      
      expect(await store.size()).toBe(1);
      expect(await store.has('2')).toBe(true);
    });
    
    it('should clear all entries', async () => {
      await store.addBatch([createEntry('1'), createEntry('2')]);
      expect(await store.size()).toBe(2);
      
      await store.clear();
      expect(await store.size()).toBe(0);
    });
  });
});