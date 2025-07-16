import { promises as fs } from 'fs';
import * as path from 'path';
import { FileVectorStore } from '../../src/vectorStore/fileVectorStore.js';
import type { VectorEntry } from '../../src/vectorStore/vectorStore.js';

describe('FileVectorStore', () => {
  const testDir = path.join(process.cwd(), 'test-vector-store');
  const testFile = path.join(testDir, 'test-store.json');
  let store: FileVectorStore;
  
  const createEntry = (id: string, vector: number[]): VectorEntry => ({
    vector,
    metadata: {
      id,
      path: `/path/${id}`,
      hash: `hash-${id}`,
      modified: Date.now(),
    },
  });

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
    
    store = new FileVectorStore(testFile);
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  });

  describe('basic operations with auto-save', () => {
    it('should persist entries automatically', async () => {
      const entry = createEntry('1', [1, 0, 0]);
      await store.add(entry);
      
      // Load a new store instance
      const newStore = new FileVectorStore(testFile);
      await newStore.load();
      
      expect(await newStore.get('1')).toEqual(entry);
    });

    it('should persist batch operations', async () => {
      const entries = [
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
      ];
      
      await store.addBatch(entries);
      
      const newStore = new FileVectorStore(testFile);
      await newStore.load();
      
      expect(await newStore.size()).toBe(2);
    });

    it('should persist updates', async () => {
      const entry = createEntry('1', [1, 0, 0]);
      await store.add(entry);
      
      const updated = createEntry('1', [0, 1, 0]);
      await store.update('1', updated);
      
      const newStore = new FileVectorStore(testFile);
      await newStore.load();
      
      expect(await newStore.get('1')).toEqual(updated);
    });

    it('should persist removals', async () => {
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
      ]);
      
      await store.remove('1');
      
      const newStore = new FileVectorStore(testFile);
      await newStore.load();
      
      expect(await newStore.size()).toBe(1);
      expect(await newStore.has('1')).toBe(false);
    });

    it('should persist clear operation', async () => {
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
      ]);
      
      await store.clear();
      
      const newStore = new FileVectorStore(testFile);
      await newStore.load();
      
      expect(await newStore.size()).toBe(0);
    });
  });

  describe('manual save mode', () => {
    beforeEach(() => {
      store = new FileVectorStore(testFile, false); // Disable auto-save
    });

    it('should not auto-save when disabled', async () => {
      await store.add(createEntry('1', [1, 0, 0]));
      
      // File should not exist yet
      await expect(fs.access(testFile)).rejects.toThrow();
      
      // Manually persist
      await store.persist();
      
      // Now file should exist
      await expect(fs.access(testFile)).resolves.not.toThrow();
    });
  });

  describe('persist and load', () => {
    it('should create directory if it does not exist', async () => {
      const deepPath = path.join(testDir, 'deep', 'nested', 'store.json');
      const deepStore = new FileVectorStore(deepPath);
      
      await deepStore.add(createEntry('1', [1, 0, 0]));
      await deepStore.persist();
      
      await expect(fs.access(deepPath)).resolves.not.toThrow();
    });

    it('should handle empty store', async () => {
      await store.persist();
      
      const newStore = new FileVectorStore(testFile);
      await newStore.load();
      
      expect(await newStore.size()).toBe(0);
    });

    it('should handle missing file on load', async () => {
      const newStore = new FileVectorStore(testFile);
      
      // Should not throw
      await expect(newStore.load()).resolves.not.toThrow();
      expect(await newStore.size()).toBe(0);
    });

    it('should handle corrupted file', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, 'invalid json');
      
      const newStore = new FileVectorStore(testFile);
      await expect(newStore.load()).rejects.toThrow();
    });

    it('should handle version mismatch gracefully', async () => {
      const data = {
        version: '0.9.0',
        entries: [createEntry('1', [1, 0, 0])],
        lastUpdated: Date.now(),
      };
      
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(data));
      
      const newStore = new FileVectorStore(testFile);
      await newStore.load();
      
      // Should still load the entries
      expect(await newStore.size()).toBe(1);
    });
  });

  describe('getFileStats', () => {
    it('should return file stats when file exists', async () => {
      await store.add(createEntry('1', [1, 0, 0]));
      
      const stats = await store.getFileStats();
      expect(stats).not.toBeNull();
      expect(stats?.size).toBeGreaterThan(0);
      expect(stats?.modified).toBeDefined();
      // Check that modified is a valid date
      expect(stats?.modified.getTime()).toBeGreaterThan(0);
    });

    it('should return null when file does not exist', async () => {
      const stats = await store.getFileStats();
      expect(stats).toBeNull();
    });
  });

  describe('backup and restore', () => {
    it('should create backup', async () => {
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
      ]);
      
      const backupPath = await store.backup();
      expect(backupPath).toContain('.backup.');
      
      await expect(fs.access(backupPath)).resolves.not.toThrow();
      
      // Clean up backup
      await fs.unlink(backupPath);
    });

    it('should create backup with custom path', async () => {
      await store.add(createEntry('1', [1, 0, 0]));
      
      const customBackup = path.join(testDir, 'custom.backup');
      const backupPath = await store.backup(customBackup);
      
      expect(backupPath).toBe(customBackup);
      await expect(fs.access(customBackup)).resolves.not.toThrow();
    });

    it('should throw error when backing up non-existent store', async () => {
      await expect(store.backup()).rejects.toThrow('No store file to backup');
    });

    it('should restore from backup', async () => {
      // Create original store
      await store.addBatch([
        createEntry('1', [1, 0, 0]),
        createEntry('2', [0, 1, 0]),
      ]);
      
      // Create backup
      const backupPath = await store.backup();
      
      // Modify store
      await store.clear();
      await store.add(createEntry('3', [0, 0, 1]));
      
      // Restore from backup
      await store.restore(backupPath);
      
      // Should have original entries
      expect(await store.size()).toBe(2);
      expect(await store.has('1')).toBe(true);
      expect(await store.has('2')).toBe(true);
      expect(await store.has('3')).toBe(false);
      
      // Clean up
      await fs.unlink(backupPath);
    });
  });

  describe('error handling', () => {
    it('should propagate parent class errors', async () => {
      await expect(store.update('non-existent', createEntry('1', [1, 0, 0])))
        .rejects.toThrow('Vector with id non-existent not found');
    });

    it('should handle file system errors', async () => {
      // Create a directory with the same name as the store file
      await fs.mkdir(testDir, { recursive: true });
      await fs.mkdir(testFile, { recursive: true });
      
      // Should throw when trying to write
      await expect(store.add(createEntry('1', [1, 0, 0]))).rejects.toThrow('EISDIR');
      
      // Clean up
      await fs.rmdir(testFile);
    });
  });
});