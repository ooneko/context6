import { SemanticSearchEngine } from "../../src/search/semanticSearch.js";
import type { Config, FileInfo } from "../../src/types.js";
import { LocalEmbeddingProvider } from "../../src/embeddings/localEmbedding.js";
import { MemoryVectorStore } from "../../src/vectorStore/memoryVectorStore.js";
import { FileVectorStore } from "../../src/vectorStore/fileVectorStore.js";
import * as fs from "fs/promises";
import * as path from "path";

// Mock the embedding providers and vector stores
jest.mock("../../src/embeddings/localEmbedding.js");
jest.mock("../../src/embeddings/openaiEmbedding.js");
jest.mock("../../src/embeddings/cohereEmbedding.js");
jest.mock("../../src/vectorStore/memoryVectorStore.js");
jest.mock("../../src/vectorStore/fileVectorStore.js");

describe("SemanticSearchEngine", () => {
  let engine: SemanticSearchEngine;
  let mockConfig: Config;
  let mockEmbeddingProvider: jest.Mocked<LocalEmbeddingProvider>;
  let mockVectorStore: jest.Mocked<MemoryVectorStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      knowledgePaths: ["/test/path"],
      ignorePatterns: [],
      indexOptions: {
        maxFileSizeMb: 10,
        cacheEnabled: true,
        updateIntervalMs: 5000,
      },
      searchOptions: {
        maxResults: 10,
        contextLength: 200,
        fuzzyThreshold: 0.6,
        defaultMode: "semantic",
        semantic: {
          enabled: true,
          provider: "local",
          model: "test-model",
          cacheEmbeddings: false,
          batchSize: 100,
        },
        hybrid: {
          keywordWeight: 0.7,
          semanticWeight: 0.3,
        },
      },
    };

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
    } as any;

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
    } as any;

    (MemoryVectorStore as jest.MockedClass<typeof MemoryVectorStore>)
      .mockImplementation(() => mockVectorStore);

    engine = new SemanticSearchEngine(mockConfig);
  });

  describe("constructor", () => {
    it("should initialize with local embedding provider", () => {
      expect(LocalEmbeddingProvider).toHaveBeenCalledWith({
        model: "test-model",
        batchSize: 100,
      });
    });

    it("should throw error if semantic search is not enabled", () => {
      mockConfig.searchOptions.semantic = undefined;
      expect(() => new SemanticSearchEngine(mockConfig)).toThrow(
        "Semantic search is not enabled in configuration"
      );
    });

    it("should create file vector store when caching is enabled", () => {
      mockConfig.searchOptions.semantic!.cacheEmbeddings = true;
      new SemanticSearchEngine(mockConfig);
      expect(FileVectorStore).toHaveBeenCalled();
    });

    it("should create memory vector store when caching is disabled", () => {
      mockConfig.searchOptions.semantic!.cacheEmbeddings = false;
      new SemanticSearchEngine(mockConfig);
      expect(MemoryVectorStore).toHaveBeenCalled();
    });
  });

  describe("index", () => {
    const mockFiles: FileInfo[] = [
      {
        path: "/test/file1.md",
        relativePath: "file1.md",
        title: "File 1",
        size: 100,
        modified: new Date(),
        content: "This is the content of file 1",
      },
      {
        path: "/test/file2.md",
        relativePath: "file2.md",
        title: "File 2",
        size: 200,
        modified: new Date(),
        content: "This is the content of file 2",
      },
    ];

    it("should index files successfully", async () => {
      await engine.index(mockFiles);

      expect(mockEmbeddingProvider.embedBatch).toHaveBeenCalled();
      expect(mockVectorStore.addBatch).toHaveBeenCalled();
    });

    it("should skip files without content", async () => {
      const filesWithoutContent = [
        { ...mockFiles[0], content: undefined },
        mockFiles[1],
      ];

      await engine.index(filesWithoutContent);

      // Should only process the second file
      expect(mockEmbeddingProvider.embedBatch).toHaveBeenCalledTimes(1);
    });

    it("should handle indexing errors gracefully", async () => {
      mockEmbeddingProvider.embedBatch.mockRejectedValueOnce(
        new Error("Embedding failed")
      );

      // Should not throw
      await expect(engine.index(mockFiles)).resolves.not.toThrow();
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      // Initialize the engine
      const mockFiles: FileInfo[] = [
        {
          path: "/test/file.md",
          relativePath: "file.md",
          title: "Test File",
          size: 100,
          modified: new Date(),
          content: "This is test content",
        },
      ];
      await engine.index(mockFiles);
    });

    it("should perform semantic search", async () => {
      const results = await engine.search({
        query: "test query",
        limit: 5,
      });

      expect(mockEmbeddingProvider.embed).toHaveBeenCalledWith("test query");
      expect(mockVectorStore.search).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.9);
      expect(results[0].file.path).toBe("/test/file.md");
    });

    it("should limit results", async () => {
      // First, we need to index files for them to be searchable
      const mockFiles: FileInfo[] = [
        {
          path: "/test/file1.md",
          relativePath: "file1.md",
          title: "File 1",
          size: 100,
          modified: new Date(),
          content: "Content 1",
        },
        {
          path: "/test/file2.md",
          relativePath: "file2.md",
          title: "File 2",
          size: 100,
          modified: new Date(),
          content: "Content 2",
        },
      ];
      await engine.index(mockFiles);

      mockVectorStore.search.mockResolvedValueOnce([
        {
          entry: {
            vector: new Array(384).fill(0.1),
            metadata: {
              id: "test_0",
              filePath: "/test/file1.md",
              title: "File 1",
              chunkIndex: 0,
              startLine: 1,
              endLine: 5,
              content: "Content 1",
            },
          },
          score: 0.9,
        },
        {
          entry: {
            vector: new Array(384).fill(0.2),
            metadata: {
              id: "test_1",
              filePath: "/test/file2.md",
              title: "File 2",
              chunkIndex: 0,
              startLine: 1,
              endLine: 5,
              content: "Content 2",
            },
          },
          score: 0.8,
        },
      ]);

      const results = await engine.search({
        query: "test",
        limit: 1,
      });

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.9);
    });

    it("should handle search errors gracefully", async () => {
      mockEmbeddingProvider.embed.mockRejectedValueOnce(
        new Error("Embedding failed")
      );

      const results = await engine.search({
        query: "test",
        limit: 5,
      });

      expect(results).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update file index", async () => {
      const file: FileInfo = {
        path: "/test/file.md",
        relativePath: "file.md",
        title: "Updated File",
        size: 150,
        modified: new Date(),
        content: "Updated content",
      };

      await engine.update(file);

      expect(mockEmbeddingProvider.embedBatch).toHaveBeenCalled();
      expect(mockVectorStore.addBatch).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should remove file from index", async () => {
      // First index a file
      const file: FileInfo = {
        path: "/test/file.md",
        relativePath: "file.md",
        title: "Test File",
        size: 100,
        modified: new Date(),
        content: "Test content",
      };
      await engine.index([file]);

      // Then remove it
      await engine.remove("/test/file.md");

      expect(mockVectorStore.removeBatch).toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("should dispose resources", async () => {
      await engine.dispose();

      expect(mockEmbeddingProvider.dispose).toHaveBeenCalled();
    });

    it("should create file vector store when caching is enabled for dispose", async () => {
      // Create a fresh config with caching enabled
      const configWithCache = {
        ...mockConfig,
        searchOptions: {
          ...mockConfig.searchOptions,
          semantic: {
            ...mockConfig.searchOptions.semantic!,
            cacheEmbeddings: true,
          },
        },
      };
      
      // Clear previous mocks
      jest.clearAllMocks();
      
      // Create engine with file store caching enabled
      new SemanticSearchEngine(configWithCache);

      // Verify FileVectorStore was created (not MemoryVectorStore)
      expect(FileVectorStore).toHaveBeenCalled();
      expect(MemoryVectorStore).not.toHaveBeenCalled();
    });
  });

  describe("OpenAI provider", () => {
    beforeEach(() => {
      mockConfig.searchOptions.semantic!.provider = "openai";
      mockConfig.searchOptions.semantic!.apiKey = "test-key";
    });

    it("should initialize with OpenAI provider", () => {
      const { OpenAIEmbeddingProvider } = jest.requireMock(
        "../../src/embeddings/openaiEmbedding.js"
      );
      new SemanticSearchEngine(mockConfig);
      expect(OpenAIEmbeddingProvider).toHaveBeenCalled();
    });

    it("should throw error if API key is missing", () => {
      mockConfig.searchOptions.semantic!.apiKey = undefined;
      expect(() => new SemanticSearchEngine(mockConfig)).toThrow(
        "OpenAI API key is required"
      );
    });
  });

  describe("Cohere provider", () => {
    beforeEach(() => {
      mockConfig.searchOptions.semantic!.provider = "cohere";
      mockConfig.searchOptions.semantic!.apiKey = "test-key";
    });

    it("should initialize with Cohere provider", () => {
      const { CohereEmbeddingProvider } = jest.requireMock(
        "../../src/embeddings/cohereEmbedding.js"
      );
      new SemanticSearchEngine(mockConfig);
      expect(CohereEmbeddingProvider).toHaveBeenCalled();
    });

    it("should throw error if API key is missing", () => {
      mockConfig.searchOptions.semantic!.apiKey = undefined;
      expect(() => new SemanticSearchEngine(mockConfig)).toThrow(
        "Cohere API key is required"
      );
    });
  });
});