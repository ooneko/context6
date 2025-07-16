import { BaseEmbeddingProvider } from '../../src/embeddings/embeddingProvider.js';
import type { EmbeddingResult, BatchEmbeddingResult, EmbeddingProviderConfig } from '../../src/embeddings/embeddingProvider.js';

// Mock implementation for testing
class TestEmbeddingProvider extends BaseEmbeddingProvider {
  private dimension = 384;
  private maxLength = 512;
  
  async embed(text: string): Promise<EmbeddingResult> {
    const processedText = this.truncateText(text, this.maxLength);
    const embedding = new Array(this.dimension).fill(0).map(() => Math.random());
    return {
      embedding: this.normalize(embedding),
      tokens: Math.ceil(processedText.length / 4),
    };
  }
  
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const results = await Promise.all(texts.map(text => this.embed(text)));
    return {
      embeddings: results.map(r => r.embedding),
      totalTokens: results.reduce((sum, r) => sum + r.tokens, 0),
    };
  }
  
  getDimension(): number {
    return this.dimension;
  }
  
  getMaxTextLength(): number {
    return this.maxLength;
  }
  
  async isReady(): Promise<boolean> {
    return true;
  }
  
  async dispose(): Promise<void> {
    // No-op for test implementation
  }
}

describe('BaseEmbeddingProvider', () => {
  let provider: TestEmbeddingProvider;
  const config: EmbeddingProviderConfig = {
    model: 'test-model',
    batchSize: 32,
  };
  
  beforeEach(() => {
    provider = new TestEmbeddingProvider(config);
  });
  
  describe('normalize', () => {
    it('should normalize vectors to unit length', () => {
      // Access protected method through test implementation
      const vector = [3, 4]; // 3-4-5 triangle
      const normalized = provider['normalize'](vector);
      const magnitude = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
      expect(magnitude).toBeCloseTo(1, 10);
      expect(normalized[0]).toBeCloseTo(0.6, 10);
      expect(normalized[1]).toBeCloseTo(0.8, 10);
    });
    
    it('should handle zero vectors', () => {
      const vector = [0, 0, 0];
      const normalized = provider['normalize'](vector);
      expect(normalized).toEqual([0, 0, 0]);
    });
  });
  
  describe('truncateText', () => {
    it('should not truncate short text', () => {
      const text = 'Short text';
      const truncated = provider['truncateText'](text, 100);
      expect(truncated).toBe(text);
    });
    
    it('should truncate at word boundary', () => {
      const text = 'This is a very long text that needs to be truncated';
      const truncated = provider['truncateText'](text, 20);
      expect(truncated).toBe('This is a very long');
      expect(truncated.length).toBeLessThanOrEqual(20);
    });
    
    it('should handle text without spaces', () => {
      const text = 'verylongtextwithoutspaces';
      const truncated = provider['truncateText'](text, 10);
      expect(truncated).toBe('verylongte');
      expect(truncated.length).toBe(10);
    });
  });
  
  describe('interface implementation', () => {
    it('should embed single text', async () => {
      const result = await provider.embed('test text');
      expect(result.embedding).toHaveLength(provider.getDimension());
      expect(result.tokens).toBeGreaterThan(0);
      
      // Check normalization
      const magnitude = Math.sqrt(
        result.embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1, 10);
    });
    
    it('should embed batch of texts', async () => {
      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await provider.embedBatch(texts);
      
      expect(result.embeddings).toHaveLength(texts.length);
      expect(result.totalTokens).toBeGreaterThan(0);
      
      result.embeddings.forEach(embedding => {
        expect(embedding).toHaveLength(provider.getDimension());
      });
    });
    
    it('should report dimension', () => {
      expect(provider.getDimension()).toBe(384);
    });
    
    it('should report max text length', () => {
      expect(provider.getMaxTextLength()).toBe(512);
    });
    
    it('should check readiness', async () => {
      const ready = await provider.isReady();
      expect(ready).toBe(true);
    });
    
    it('should dispose without error', async () => {
      await expect(provider.dispose()).resolves.not.toThrow();
    });
  });
});