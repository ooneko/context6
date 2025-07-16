import { OpenAIEmbeddingProvider } from '../../src/embeddings/openaiEmbedding.js';
import type { OpenAIEmbeddingConfig } from '../../src/embeddings/openaiEmbedding.js';

// Mock OpenAI
const mockCreate = jest.fn();
const mockRetrieve = jest.fn();

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: mockCreate,
    },
    models: {
      retrieve: mockRetrieve,
    },
  })),
}));

describe('OpenAIEmbeddingProvider', () => {
  let provider: OpenAIEmbeddingProvider;
  const config: OpenAIEmbeddingConfig = {
    apiKey: 'test-api-key',
    model: 'text-embedding-3-small',
    batchSize: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockCreate.mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2, 0.3, 0.4, 0.5] },
      ],
      usage: { total_tokens: 10 },
    });
    
    mockRetrieve.mockResolvedValue({ id: 'text-embedding-3-small' });
    
    provider = new OpenAIEmbeddingProvider(config);
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new OpenAIEmbeddingProvider({ apiKey: '', model: 'text-embedding-3-small' }))
        .toThrow('OpenAI API key is required');
    });

    it('should initialize with correct dimensions for models', () => {
      const models: Array<[string, number]> = [
        ['text-embedding-3-small', 1536],
        ['text-embedding-3-large', 3072],
        ['text-embedding-ada-002', 1536],
      ];

      for (const [model, expectedDim] of models) {
        const p = new OpenAIEmbeddingProvider({ apiKey: 'test', model });
        expect(p.getDimension()).toBe(expectedDim);
      }
    });

    it('should use default model if not specified', () => {
      const p = new OpenAIEmbeddingProvider({ apiKey: 'test' });
      expect(p.getDimension()).toBe(1536); // text-embedding-3-small
    });
  });

  describe('embed', () => {
    it('should generate embeddings for text', async () => {
      const result = await provider.embed('test text');
      
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text',
        encoding_format: 'float',
      });
      
      expect(result.embedding).toHaveLength(5);
      expect(result.tokens).toBe(10);
      
      // Check normalization
      const magnitude = Math.sqrt(
        result.embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1, 10);
    });

    it('should handle API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));
      
      await expect(provider.embed('test')).rejects.toThrow('OpenAI embedding failed: API rate limit exceeded');
    });

    it('should handle non-Error exceptions', async () => {
      mockCreate.mockRejectedValueOnce('Unknown error');
      
      await expect(provider.embed('test')).rejects.toThrow('OpenAI embedding failed: Unknown error');
    });
  });

  describe('embedBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      // Since batchSize is 2, it will be called twice
      mockCreate.mockResolvedValueOnce({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
        usage: { total_tokens: 20 },
      }).mockResolvedValueOnce({
        data: [
          { embedding: [0.7, 0.8, 0.9] },
        ],
        usage: { total_tokens: 10 },
      });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await provider.embedBatch(texts);
      
      // Should be called twice due to batch size of 2
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate).toHaveBeenNthCalledWith(1, {
        model: 'text-embedding-3-small',
        input: ['text 1', 'text 2'],
        encoding_format: 'float',
      });
      expect(mockCreate).toHaveBeenNthCalledWith(2, {
        model: 'text-embedding-3-small',
        input: ['text 3'],
        encoding_format: 'float',
      });
      
      expect(result.embeddings).toHaveLength(3);
      expect(result.totalTokens).toBe(30);
      
      for (const embedding of result.embeddings) {
        // Check normalization
        const magnitude = Math.sqrt(
          embedding.reduce((sum, val) => sum + val * val, 0)
        );
        expect(magnitude).toBeCloseTo(1, 10);
      }
    });

    it('should process in batches', async () => {
      // First batch
      mockCreate.mockResolvedValueOnce({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
        usage: { total_tokens: 20 },
      });
      
      // Second batch
      mockCreate.mockResolvedValueOnce({
        data: [
          { embedding: [0.7, 0.8, 0.9] },
        ],
        usage: { total_tokens: 10 },
      });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await provider.embedBatch(texts);
      
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.embeddings).toHaveLength(3);
      expect(result.totalTokens).toBe(30);
    });

    it('should handle empty batch', async () => {
      const result = await provider.embedBatch([]);
      
      expect(mockCreate).not.toHaveBeenCalled();
      expect(result.embeddings).toHaveLength(0);
      expect(result.totalTokens).toBe(0);
    });

    it('should handle batch API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Batch too large'));
      
      await expect(provider.embedBatch(['text1', 'text2']))
        .rejects.toThrow('OpenAI batch embedding failed: Batch too large');
    });
  });

  describe('getMaxTextLength', () => {
    it('should return OpenAI token limit', () => {
      expect(provider.getMaxTextLength()).toBe(8191);
    });
  });

  describe('isReady', () => {
    it('should return true when API key is valid', async () => {
      const ready = await provider.isReady();
      
      expect(mockRetrieve).toHaveBeenCalledWith('text-embedding-3-small');
      expect(ready).toBe(true);
    });

    it('should return false when API key is invalid', async () => {
      mockRetrieve.mockRejectedValueOnce(new Error('Invalid API key'));
      
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