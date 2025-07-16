import { BaseSearchEngine } from '../../src/search/searchEngine.js';
import type { FileInfo, SearchOptions, SearchResult } from '../../src/types.js';

class TestSearchEngine extends BaseSearchEngine {
  async index(files: FileInfo[]): Promise<void> {
    this.files.clear();
    files.forEach(file => this.files.set(file.path, file));
  }

  async search(_options: SearchOptions): Promise<SearchResult[]> {
    return [];
  }

  async update(file: FileInfo): Promise<void> {
    this.files.set(file.path, file);
  }

  async remove(path: string): Promise<void> {
    this.files.delete(path);
  }

  // Expose protected methods for testing
  public testGetFile(path: string): FileInfo | undefined {
    return this.getFile(path);
  }

  public testGetAllFiles(): FileInfo[] {
    return this.getAllFiles();
  }
}

describe('BaseSearchEngine', () => {
  let engine: TestSearchEngine;

  beforeEach(() => {
    engine = new TestSearchEngine();
  });

  describe('index', () => {
    it('should store files in the map', async () => {
      const mockFile: FileInfo = {
        path: '/test/file.md',
        relativePath: 'file.md',
        title: 'Test File',
        size: 100,
        modified: new Date(),
        content: 'Test content',
      };

      await engine.index([mockFile]);
      
      const file = engine.testGetFile('/test/file.md');
      expect(file).toEqual(mockFile);
    });

    it('should clear existing files before indexing', async () => {
      const file1: FileInfo = {
        path: '/test/file1.md',
        relativePath: 'file1.md',
        title: 'File 1',
        size: 100,
        modified: new Date(),
      };

      const file2: FileInfo = {
        path: '/test/file2.md',
        relativePath: 'file2.md',
        title: 'File 2',
        size: 200,
        modified: new Date(),
      };

      await engine.index([file1]);
      expect(engine.testGetAllFiles()).toHaveLength(1);

      await engine.index([file2]);
      expect(engine.testGetAllFiles()).toHaveLength(1);
      expect(engine.testGetFile('/test/file1.md')).toBeUndefined();
      expect(engine.testGetFile('/test/file2.md')).toBeDefined();
    });
  });

  describe('getFile', () => {
    it('should return undefined for non-existent file', () => {
      const file = engine.testGetFile('/non/existent.md');
      expect(file).toBeUndefined();
    });

    it('should return the correct file', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'File 1',
          size: 100,
          modified: new Date(),
        },
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'File 2',
          size: 200,
          modified: new Date(),
        },
      ];

      await engine.index(files);
      
      const file1 = engine.testGetFile('/test/file1.md');
      expect(file1?.title).toBe('File 1');
      
      const file2 = engine.testGetFile('/test/file2.md');
      expect(file2?.title).toBe('File 2');
    });
  });

  describe('getAllFiles', () => {
    it('should return empty array when no files', () => {
      const files = engine.testGetAllFiles();
      expect(files).toEqual([]);
    });

    it('should return all indexed files', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'File 1',
          size: 100,
          modified: new Date(),
        },
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'File 2',
          size: 200,
          modified: new Date(),
        },
      ];

      await engine.index(files);
      
      const allFiles = engine.testGetAllFiles();
      expect(allFiles).toHaveLength(2);
      expect(allFiles).toEqual(expect.arrayContaining(files));
    });
  });

  describe('update', () => {
    it('should update existing file', async () => {
      const originalFile: FileInfo = {
        path: '/test/file.md',
        relativePath: 'file.md',
        title: 'Original',
        size: 100,
        modified: new Date('2024-01-01'),
        content: 'Original content',
      };

      const updatedFile: FileInfo = {
        ...originalFile,
        title: 'Updated',
        content: 'Updated content',
        modified: new Date('2024-02-01'),
      };

      await engine.index([originalFile]);
      await engine.update(updatedFile);
      
      const file = engine.testGetFile('/test/file.md');
      expect(file?.title).toBe('Updated');
      expect(file?.content).toBe('Updated content');
      expect(file?.modified).toEqual(new Date('2024-02-01'));
    });

    it('should add new file if not exists', async () => {
      const newFile: FileInfo = {
        path: '/test/new.md',
        relativePath: 'new.md',
        title: 'New File',
        size: 100,
        modified: new Date(),
      };

      await engine.update(newFile);
      
      const file = engine.testGetFile('/test/new.md');
      expect(file).toEqual(newFile);
    });
  });

  describe('remove', () => {
    it('should remove existing file', async () => {
      const mockFile: FileInfo = {
        path: '/test/file.md',
        relativePath: 'file.md',
        title: 'Test',
        size: 100,
        modified: new Date(),
      };

      await engine.index([mockFile]);
      expect(engine.testGetFile('/test/file.md')).toBeDefined();
      
      await engine.remove('/test/file.md');
      expect(engine.testGetFile('/test/file.md')).toBeUndefined();
    });

    it('should not throw when removing non-existent file', async () => {
      await expect(engine.remove('/non/existent.md')).resolves.not.toThrow();
    });
  });

  describe('abstract methods', () => {
    it('should implement all abstract methods', () => {
      expect(engine.index).toBeDefined();
      expect(engine.search).toBeDefined();
      expect(engine.update).toBeDefined();
      expect(engine.remove).toBeDefined();
    });
  });
});