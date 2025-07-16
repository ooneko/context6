import { CohereEmbeddingProvider } from '../../src/embeddings/cohereEmbedding.js';
import type { CohereEmbeddingConfig } from '../../src/embeddings/cohereEmbedding.js';

// Mock Cohere
const mockEmbed = jest.fn();

jest.mock('cohere-ai', () => ({
  CohereClient: jest.fn().mockImplementation(() => ({
    embed: mockEmbed,
  })),
}));

describe('CohereEmbeddingProvider', () => {
  let provider: CohereEmbeddingProvider;
  const config: CohereEmbeddingConfig = {
    apiKey: 'test-api-key',
    model: 'embed-english-v3.0',
    batchSize: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockEmbed.mockResolvedValue({
      embeddings: {
        float: [[0.1, 0.2, 0.3, 0.4, 0.5]],
      },
    });
    
    provider = new CohereEmbeddingProvider(config);
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new CohereEmbeddingProvider({ apiKey: '', model: 'embed-english-v3.0' }))
        .toThrow('Cohere API key is required');
    });

    it('should initialize with correct dimensions for models', () => {
      const models: Array<[string, number]> = [
        ['embed-english-v3.0', 1024],
        ['embed-multilingual-v3.0', 1024],
        ['embed-english-light-v3.0', 384],
        ['embed-multilingual-light-v3.0', 384],
      ];

      for (const [model, expectedDim] of models) {
        const p = new CohereEmbeddingProvider({ apiKey: 'test', model });
        expect(p.getDimension()).toBe(expectedDim);
      }
    });

    it('should use default model if not specified', () => {
      const p = new CohereEmbeddingProvider({ apiKey: 'test' });
      expect(p.getDimension()).toBe(1024); // embed-english-v3.0
    });
  });

  describe('setInputType', () => {
    it('should allow setting input type', () => {
      provider.setInputType('search_query');
      // No direct way to test this, but it should be used in embed calls
      expect(() => provider.setInputType('search_query')).not.toThrow();
    });
  });

  describe('embed', () => {
    it('should generate embeddings for text', async () => {
      const result = await provider.embed('test text');
      
      expect(mockEmbed).toHaveBeenCalledWith({
        texts: ['test text'],
        model: 'embed-english-v3.0',
        inputType: 'search_document',
        embeddingTypes: ['float'],
      });
      
      expect(result.embedding).toHaveLength(5);
      expect(result.tokens).toBe(3); // Estimated
      
      // Check normalization
      const magnitude = Math.sqrt(
        result.embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1, 10);
    });

    it('should use custom input type', async () => {
      provider.setInputType('search_query');
      await provider.embed('test text');
      
      expect(mockEmbed).toHaveBeenCalledWith({
        texts: ['test text'],
        model: 'embed-english-v3.0',
        inputType: 'search_query',
        embeddingTypes: ['float'],
      });
    });

    it('should handle API errors', async () => {
      mockEmbed.mockRejectedValueOnce(new Error('API rate limit exceeded'));
      
      await expect(provider.embed('test')).rejects.toThrow('Cohere embedding failed: API rate limit exceeded');
    });

    it('should handle non-Error exceptions', async () => {
      mockEmbed.mockRejectedValueOnce('Unknown error');
      
      await expect(provider.embed('test')).rejects.toThrow('Cohere embedding failed: Unknown error');
    });
  });

  describe('embedBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      // Since batchSize is 2, it will be called twice
      mockEmbed.mockResolvedValueOnce({
        embeddings: {
          float: [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
          ],
        },
      }).mockResolvedValueOnce({
        embeddings: {
          float: [
            [0.7, 0.8, 0.9],
          ],
        },
      });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await provider.embedBatch(texts);
      
      // Should be called twice due to batch size of 2
      expect(mockEmbed).toHaveBeenCalledTimes(2);
      expect(mockEmbed).toHaveBeenNthCalledWith(1, {
        texts: ['text 1', 'text 2'],
        model: 'embed-english-v3.0',
        inputType: 'search_document',
        embeddingTypes: ['float'],
      });
      expect(mockEmbed).toHaveBeenNthCalledWith(2, {
        texts: ['text 3'],
        model: 'embed-english-v3.0',
        inputType: 'search_document',
        embeddingTypes: ['float'],
      });
      
      expect(result.embeddings).toHaveLength(3);
      // Token estimation: ceil(6/4) + ceil(6/4) + ceil(6/4) = 2 + 2 + 2 = 6
      expect(result.totalTokens).toBe(6); // Estimated
      
      for (const embedding of result.embeddings) {
        // Check normalization
        const magnitude = Math.sqrt(
          embedding.reduce((sum, val) => sum + val * val, 0)
        );
        expect(magnitude).toBeCloseTo(1, 10);
      }
    });

    it('should handle empty batch', async () => {
      const result = await provider.embedBatch([]);
      
      expect(mockEmbed).not.toHaveBeenCalled();
      expect(result.embeddings).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should handle batch API errors', async () => {
      mockEmbed.mockRejectedValueOnce(new Error('Batch too large'));
      
      await expect(provider.embedBatch(['text1', 'text2']))
        .rejects.toThrow('Cohere batch embedding failed: Batch too large');
    });
  });

  describe('getMaxTextLength', () => {
    it('should return recommended max length', () => {
      expect(provider.getMaxTextLength()).toBe(512);
    });
  });

  describe('isReady', () => {
    it('should return true when API key is valid', async () => {
      mockEmbed.mockResolvedValueOnce({
        embeddings: {
          float: [[0.1, 0.2, 0.3]],
        },
      });
      
      const ready = await provider.isReady();
      
      expect(mockEmbed).toHaveBeenCalledWith({
        texts: ['test'],
        model: 'embed-english-v3.0',
        inputType: 'search_document',
        embeddingTypes: ['float'],
      });
      expect(ready).toBe(true);
    });

    it('should return false when API key is invalid', async () => {
      mockEmbed.mockRejectedValueOnce(new Error('Invalid API key'));
      
      const ready = await provider.isReady();
      expect(ready).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should resolve without error', async () => {
      await expect(provider.dispose()).resolves.not.toThrow();
    });
  });
});