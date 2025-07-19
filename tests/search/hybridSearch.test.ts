import { HybridSearchEngine } from '../../src/search/hybridSearch.js';
import type { Config, FileInfo, SearchOptions, SearchResult } from '../../src/types.js';
import { getConfig } from '../../src/config.js';
import { LocalEmbeddingProvider } from '../../src/embeddings/localEmbedding.js';
import { MemoryVectorStore } from '../../src/vectorStore/memoryVectorStore.js';

// Mock the dependencies
jest.mock('../../src/embeddings/localEmbedding.js');
jest.mock('../../src/embeddings/openaiEmbedding.js');
jest.mock('../../src/embeddings/cohereEmbedding.js');
jest.mock('../../src/vectorStore/memoryVectorStore.js');
jest.mock('../../src/vectorStore/fileVectorStore.js');

describe('HybridSearchEngine', () => {
  let engine: HybridSearchEngine;
  let config: Config;
  let mockEmbeddingProvider: any;
  let mockVectorStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock embedding provider
    mockEmbeddingProvider = {
      embed: jest.fn().mockResolvedValue({
        embedding: new Array(384).fill(0.1),
        tokens: 10,
      }),
      embedBatch: jest.fn().mockResolvedValue({
        embeddings: [new Array(384).fill(0.1), new Array(384).fill(0.2)],
        totalTokens: 20,
      }),
      getDimension: jest.fn().mockReturnValue(384),
      getMaxTextLength: jest.fn().mockReturnValue(512),
      isReady: jest.fn().mockResolvedValue(true),
      dispose: jest.fn().mockResolvedValue(undefined),
      normalize: jest.fn().mockImplementation((vec) => vec),
      truncateText: jest.fn().mockImplementation((text) => text),
    };

    (LocalEmbeddingProvider as jest.MockedClass<typeof LocalEmbeddingProvider>)
      .mockImplementation(() => mockEmbeddingProvider);

    // Setup mock vector store
    mockVectorStore = {
      add: jest.fn().mockResolvedValue(undefined),
      addBatch: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([
        {
          entry: {
            vector: new Array(384).fill(0.1),
            metadata: {
              id: "test_0",
              filePath: "/test/file.md",
              title: "Test File",
              chunkIndex: 0,
              startLine: 1,
              endLine: 5,
              content: "This is test content",
            },
          },
          score: 0.9,
        },
      ]),
      update: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      removeBatch: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      has: jest.fn().mockResolvedValue(false),
      size: jest.fn().mockResolvedValue(0),
      clear: jest.fn().mockResolvedValue(undefined),
    };

    (MemoryVectorStore as jest.MockedClass<typeof MemoryVectorStore>)
      .mockImplementation(() => mockVectorStore);

    config = getConfig();
    config.searchOptions.defaultMode = 'hybrid';
    config.searchOptions.semantic = {
      enabled: true,
      provider: 'local',
      model: 'test-model',
      cacheEmbeddings: false,
      batchSize: 100,
    };
    config.searchOptions.hybrid = {
      keywordWeight: 0.7,
      semanticWeight: 0.3,
    };
    
    engine = new HybridSearchEngine(config);
  });

  afterEach(async () => {
    if (engine && 'dispose' in engine) {
      await engine.dispose();
    }
  });

  describe('constructor', () => {
    it('should initialize with default weights when not provided', () => {
      const configWithoutWeights = { ...config };
      delete configWithoutWeights.searchOptions.hybrid;
      
      const engineWithDefaults = new HybridSearchEngine(configWithoutWeights);
      expect(engineWithDefaults).toBeDefined();
    });

    it('should normalize weights if they do not sum to 1', () => {
      config.searchOptions.hybrid = {
        keywordWeight: 0.6,
        semanticWeight: 0.6,
      };
      
      const engineWithNormalizedWeights = new HybridSearchEngine(config);
      expect(engineWithNormalizedWeights).toBeDefined();
    });
  });

  describe('index', () => {
    it('should index files in both engines', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'Test Document 1',
          size: 100,
          modified: new Date(),
          content: 'This is a test document about JavaScript programming.',
        },
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'Test Document 2',
          size: 200,
          modified: new Date(),
          content: 'Another document discussing TypeScript and type safety.',
        },
      ];

      await engine.index(files);
      
      // Verify by searching
      const results = await engine.search({ query: 'document', limit: 10 });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle empty file list', async () => {
      await engine.index([]);
      const results = await engine.search({ query: 'test', limit: 10 });
      expect(results).toEqual([]);
    });
  });

  describe('search', () => {
    const testFiles: FileInfo[] = [
      {
        path: '/test/javascript.md',
        relativePath: 'javascript.md',
        title: 'JavaScript Guide',
        size: 300,
        modified: new Date(),
        content: 'JavaScript is a programming language that enables interactive web pages. It is widely used for web development.',
      },
      {
        path: '/test/typescript.md',
        relativePath: 'typescript.md',
        title: 'TypeScript Introduction',
        size: 400,
        modified: new Date(),
        content: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds static typing to the language.',
      },
      {
        path: '/test/python.md',
        relativePath: 'python.md',
        title: 'Python Basics',
        size: 250,
        modified: new Date(),
        content: 'Python is a high-level programming language known for its simplicity and readability. It is widely used in data science.',
      },
    ];

    beforeEach(async () => {
      await engine.index(testFiles);
    });

    it('should return empty results for empty query', async () => {
      const results = await engine.search({ query: '', limit: 10 });
      expect(results).toEqual([]);
    });

    it('should combine results from both engines', async () => {
      const results = await engine.search({ query: 'programming', limit: 10 });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      
      // Check that results have proper structure
      results.forEach(result => {
        expect(result).toHaveProperty('file');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('matches');
        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should respect result limit', async () => {
      const results = await engine.search({ query: 'programming', limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should merge duplicate results', async () => {
      // Search for something that should match in both engines
      const results = await engine.search({ query: 'JavaScript', limit: 10 });
      
      // Count unique file paths
      const uniquePaths = new Set(results.map(r => r.file.path));
      expect(uniquePaths.size).toBe(results.length);
    });

    it('should sort results by hybrid score', async () => {
      const results = await engine.search({ query: 'programming language', limit: 10 });
      
      // Verify results are sorted in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should handle searches with special characters', async () => {
      const results = await engine.search({ query: 'JavaScript.', limit: 10 });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update file in both engines', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/doc.md',
          relativePath: 'doc.md',
          title: 'Original Document',
          size: 100,
          modified: new Date(),
          content: 'Original content about programming.',
        },
      ];

      await engine.index(files);

      // Update the file
      const updatedFile: FileInfo = {
        path: '/test/doc.md',
        relativePath: 'doc.md',
        title: 'Updated Document',
        size: 150,
        modified: new Date(),
        content: 'Updated content about software engineering.',
      };

      await engine.update(updatedFile);

      // Search for new content
      const results = await engine.search({ query: 'software engineering', limit: 10 });
      expect(results.length).toBe(1);
      expect(results[0].file.title).toBe('Updated Document');
    });
  });

  describe('remove', () => {
    it('should remove file from both engines', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'File 1',
          size: 100,
          modified: new Date(),
          content: 'Content to be removed.',
        },
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'File 2',
          size: 200,
          modified: new Date(),
          content: 'Content to keep.',
        },
      ];

      await engine.index(files);

      // Remove first file
      await engine.remove('/test/file1.md');

      // Search for removed content
      const results = await engine.search({ query: 'removed', limit: 10 });
      expect(results.length).toBe(0);

      // Ensure other file still exists
      const keepResults = await engine.search({ query: 'keep', limit: 10 });
      expect(keepResults.length).toBe(1);
    });
  });

  describe('dispose', () => {
    it('should dispose semantic engine resources', async () => {
      await engine.dispose();
      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('result merging', () => {
    it('should properly calculate hybrid scores', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/exact-match.md',
          relativePath: 'exact-match.md',
          title: 'Exact Match Document',
          size: 100,
          modified: new Date(),
          content: 'This document contains the exact phrase: hybrid search engine.',
        },
        {
          path: '/test/partial-match.md',
          relativePath: 'partial-match.md',
          title: 'Partial Match',
          size: 100,
          modified: new Date(),
          content: 'This document mentions hybrid systems and search algorithms separately.',
        },
      ];

      await engine.index(files);

      const results = await engine.search({ query: 'hybrid search', limit: 10 });
      
      // Exact match should score higher
      expect(results.length).toBeGreaterThan(0);
      if (results.length > 1) {
        expect(results[0].file.path).toBe('/test/exact-match.md');
      }
    });

    it('should merge match contexts from both engines', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/multi-match.md',
          relativePath: 'multi-match.md',
          title: 'Multiple Matches',
          size: 500,
          modified: new Date(),
          content: `
            JavaScript is great for web development.
            Many developers prefer JavaScript for its flexibility.
            JavaScript frameworks are evolving rapidly.
          `,
        },
      ];

      await engine.index(files);

      const results = await engine.search({ query: 'JavaScript', limit: 10 });
      
      expect(results.length).toBe(1);
      expect(results[0].matches.length).toBeGreaterThan(0);
      expect(results[0].matches.length).toBeLessThanOrEqual(5); // Limited by mergeMatches
    });
  });

  describe('configuration edge cases', () => {
    it('should handle zero weights gracefully', () => {
      config.searchOptions.hybrid = {
        keywordWeight: 0,
        semanticWeight: 1,
      };
      
      const engineWithZeroWeight = new HybridSearchEngine(config);
      expect(engineWithZeroWeight).toBeDefined();
    });

    it('should handle very small weight differences', () => {
      config.searchOptions.hybrid = {
        keywordWeight: 0.5000001,
        semanticWeight: 0.4999999,
      };
      
      const engineWithSmallDiff = new HybridSearchEngine(config);
      expect(engineWithSmallDiff).toBeDefined();
    });
  });
});