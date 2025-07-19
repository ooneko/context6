import { LocalEmbeddingProvider } from '../../src/embeddings/localEmbedding.js';
import type { LocalEmbeddingConfig } from '../../src/embeddings/localEmbedding.js';

// Mock transformers.js
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(
    jest.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3]),
      dims: [1, 3],
      type: 'float32',
      size: 3,
    })
  ),
}));

describe('LocalEmbeddingProvider', () => {
  let provider: LocalEmbeddingProvider;
  const config: LocalEmbeddingConfig = {
    model: 'Xenova/all-MiniLM-L6-v2',
    batchSize: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new LocalEmbeddingProvider(config);
  });

  afterEach(async () => {
    await provider.dispose();
  });

  describe('constructor', () => {
    it('should initialize with default model', () => {
      const defaultProvider = new LocalEmbeddingProvider({ model: '' });
      expect(defaultProvider.getDimension()).toBe(768); // Default is now text2vec-base-chinese
    });

    it('should set correct dimensions for known models', () => {
      const configs: Array<[string, number]> = [
        ['Xenova/all-MiniLM-L6-v2', 384],
        ['Xenova/all-mpnet-base-v2', 768],
        ['Xenova/distiluse-base-multilingual-cased-v2', 512],
        ['shibing624/text2vec-base-chinese', 768],
      ];

      for (const [model, expectedDim] of configs) {
        const p = new LocalEmbeddingProvider({ model });
        expect(p.getDimension()).toBe(expectedDim);
      }
    });
  });

  describe('embed', () => {
    it('should generate embeddings for text', async () => {
      const result = await provider.embed('test text');
      
      expect(result.embedding).toHaveLength(3);
      expect(result.tokens).toBeGreaterThan(0);
      
      // Check normalization
      const magnitude = Math.sqrt(
        result.embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1, 10);
    });

    it('should truncate long text', async () => {
      const longText = 'a'.repeat(1000);
      const result = await provider.embed(longText);
      
      expect(result.embedding).toHaveLength(3);
      expect(result.tokens).toBeLessThanOrEqual(512 / 4); // Max tokens for truncated text
    });

    it('should handle initialization errors', async () => {
      const { pipeline } = require('@xenova/transformers');
      pipeline.mockRejectedValueOnce(new Error('Model load failed'));
      
      const badProvider = new LocalEmbeddingProvider(config);
      await expect(badProvider.embed('test')).rejects.toThrow('Failed to load local embedding model');
    });
  });

  describe('embedBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await provider.embedBatch(texts);
      
      expect(result.embeddings).toHaveLength(3);
      expect(result.totalTokens).toBeGreaterThan(0);
      
      for (const embedding of result.embeddings) {
        expect(embedding).toHaveLength(3);
        // Check normalization
        const magnitude = Math.sqrt(
          embedding.reduce((sum, val) => sum + val * val, 0)
        );
        expect(magnitude).toBeCloseTo(1, 10);
      }
    });

    it('should process in batches', async () => {
      const texts = ['text 1', 'text 2', 'text 3', 'text 4', 'text 5'];
      const result = await provider.embedBatch(texts);
      
      expect(result.embeddings).toHaveLength(5);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should handle empty batch', async () => {
      const result = await provider.embedBatch([]);
      
      expect(result.embeddings).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
    });
  });

  describe('getMaxTextLength', () => {
    it('should return maximum text length', () => {
      expect(provider.getMaxTextLength()).toBe(512);
    });
  });

  describe('isReady', () => {
    it('should return true when initialized', async () => {
      await provider.embed('test'); // Force initialization
      const ready = await provider.isReady();
      expect(ready).toBe(true);
    });

    it('should return false when initialization fails', async () => {
      const { pipeline } = require('@xenova/transformers');
      pipeline.mockRejectedValueOnce(new Error('Model load failed'));
      
      const badProvider = new LocalEmbeddingProvider(config);
      const ready = await badProvider.isReady();
      expect(ready).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clear embedder reference', async () => {
      await provider.embed('test'); // Force initialization
      await provider.dispose();
      
      // After disposal, isReady should return true because it can re-initialize
      const ready = await provider.isReady();
      expect(ready).toBe(true); // Will re-initialize if called
    });
  });
});