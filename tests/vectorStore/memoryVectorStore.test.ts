import { MemoryVectorStore } from '../../src/vectorStore/memoryVectorStore.js';
import type { VectorEntry } from '../../src/vectorStore/vectorStore.js';

describe('MemoryVectorStore', () => {
  let store: MemoryVectorStore;
  
  const createEntry = (id: string, vector: number[]): VectorEntry => ({
    vector,
    metadata: {
      id,
      path: `/path/${id}`,
      hash: `hash-${id}`,
      modified: Date.now(),
    },
  });

  beforeEach(() => {
    store = new MemoryVectorStore();
  });

  describe('add', () => {
    it('should add a vector entry', async () => {
      const entry = createEntry('1', [1, 0, 0]);
      await store.add(entry);
      
      expect(await store.has('1')).toBe(true);
      expect(await store.get('1')).toEqual(entry);
    });

    it('should throw error if entry has no id', async () => {
      const entry = {
        vector: [1, 0, 0],
        metadata: {
          path: '/path/test',
          hash: 'hash',
          modified: Date.now(),
        },
      } as VectorEntry;
      
      await expect(store.add(entry)).rejects.toThrow('Vector entry must have an id');
    });

    it('should overwrite existing entry with same id', async () => {
      const entry1 = createEntry('1', [1, 0, 0]);
      const entry2 = createEntry('1', [0, 1, 0]);
      
      await store.add(entry1);
      await store.add(entry2);
      
      const retrieved = await store.get('1');
      expect(retrieved).toEqual(entry2);
    });
  });

  describe('addBatch', () => {
    it('should add multiple entries', async () => {
      const entries = [
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
        createEntry('3', [0, 0, 1]),
      ];
      
      await store.addBatch(entries);
      
      expect(await store.size()).toBe(3);
      for (const entry of entries) {
        expect(await store.has(entry.metadata.id)).toBe(true);
      }
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
        createEntry('3', [0, 0, 1]),
        createEntry('4', [0.7, 0.7, 0]),
      ]);
    });

    it('should find similar vectors', async () => {
      const results = await store.search([1, 0, 0], { topK: 2 });
      
      expect(results).toHaveLength(2);
      expect(results[0].entry.metadata.id).toBe('1');
      expect(results[0].score).toBeCloseTo(1, 10);
      expect(results[1].entry.metadata.id).toBe('4');
    });

    it('should respect topK limit', async () => {
      const results = await store.search([1, 1, 1], { topK: 2 });
      expect(results).toHaveLength(2);
    });

    it('should filter by minimum score', async () => {
      const results = await store.search([1, 0, 0], { topK: 10, minScore: 0.5 });
      
      // Only entries 1 and 4 should have score >= 0.5
      expect(results.length).toBeLessThanOrEqual(2);
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should apply custom filter', async () => {
      const results = await store.search([1, 0, 0], {
        topK: 10,
        filter: (metadata) => metadata.id !== '1',
      });
      
      // Should exclude entry 1
      expect(results.find(r => r.entry.metadata.id === '1')).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update existing entry', async () => {
      const entry = createEntry('1', [1, 0, 0]);
      await store.add(entry);
      
      const updated = createEntry('1', [0, 1, 0]);
      await store.update('1', updated);
      
      expect(await store.get('1')).toEqual(updated);
    });

    it('should throw error if entry does not exist', async () => {
      const entry = createEntry('1', [1, 0, 0]);
      await expect(store.update('1', entry)).rejects.toThrow('Vector with id 1 not found');
    });
  });

  describe('remove', () => {
    it('should remove existing entry', async () => {
      const entry = createEntry('1', [1, 0, 0]);
      await store.add(entry);
      
      await store.remove('1');
      
      expect(await store.has('1')).toBe(false);
      expect(await store.get('1')).toBeNull();
    });

    it('should throw error if entry does not exist', async () => {
      await expect(store.remove('1')).rejects.toThrow('Vector with id 1 not found');
    });
  });

  describe('removeBatch', () => {
    it('should remove multiple entries', async () => {
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
        createEntry('3', [0, 0, 1]),
      ]);
      
      await store.removeBatch(['1', '3']);
      
      expect(await store.size()).toBe(1);
      expect(await store.has('2')).toBe(true);
    });

    it('should throw error if any entry does not exist', async () => {
      await store.add(createEntry('1', [1, 0, 0]));
      
      await expect(store.removeBatch(['1', '2'])).rejects.toThrow('Vector with id 2 not found');
      // Entry 1 should be removed before error
      expect(await store.has('1')).toBe(false);
    });
  });

  describe('get', () => {
    it('should retrieve existing entry', async () => {
      const entry = createEntry('1', [1, 0, 0]);
      await store.add(entry);
      
      const retrieved = await store.get('1');
      expect(retrieved).toEqual(entry);
    });

    it('should return null for non-existent entry', async () => {
      const retrieved = await store.get('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing entry', async () => {
      await store.add(createEntry('1', [1, 0, 0]));
      expect(await store.has('1')).toBe(true);
    });

    it('should return false for non-existent entry', async () => {
      expect(await store.has('non-existent')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return the number of entries', async () => {
      expect(await store.size()).toBe(0);
      
      await store.add(createEntry('1', [1, 0, 0]));
      expect(await store.size()).toBe(1);
      
      await store.add(createEntry('2', [0, 1, 0]));
      expect(await store.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
      ]);
      
      await store.clear();
      
      expect(await store.size()).toBe(0);
      expect(await store.has('1')).toBe(false);
      expect(await store.has('2')).toBe(false);
    });
  });

  describe('getAllEntries', () => {
    it('should return all entries', async () => {
      const entries = [
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
      ];
      
      await store.addBatch(entries);
      const allEntries = await store.getAllEntries();
      
      expect(allEntries).toHaveLength(2);
      expect(allEntries).toEqual(expect.arrayContaining(entries));
    });

    it('should return empty array when store is empty', async () => {
      const allEntries = await store.getAllEntries();
      expect(allEntries).toEqual([]);
    });
  });

  describe('getAllIds', () => {
    it('should return all ids', async () => {
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
        createEntry('3', [0, 0, 1]),
      ]);
      
      const ids = await store.getAllIds();
      
      expect(ids).toHaveLength(3);
      expect(ids).toEqual(expect.arrayContaining(['1', '2', '3']));
    });

    it('should return empty array when store is empty', async () => {
      const ids = await store.getAllIds();
      expect(ids).toEqual([]);
    });
  });
});