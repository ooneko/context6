export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  totalTokens: number;
}

export interface EmbeddingProviderConfig {
  model: string;
  apiKey?: string;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface IEmbeddingProvider {
  /**
   * Generate embedding for a single text
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts in batch
   */
  embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Get the dimensionality of the embeddings
   */
  getDimension(): number;

  /**
   * Get the maximum text length supported
   */
  getMaxTextLength(): number;

  /**
   * Check if the provider is ready (e.g., model loaded, API key valid)
   */
  isReady(): Promise<boolean>;

  /**
   * Clean up resources (e.g., unload models)
   */
  dispose(): Promise<void>;
}

export abstract class BaseEmbeddingProvider implements IEmbeddingProvider {
  protected config: EmbeddingProviderConfig;

  constructor(config: EmbeddingProviderConfig) {
    this.config = config;
  }

  abstract embed(text: string): Promise<EmbeddingResult>;
  abstract embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;
  abstract getDimension(): number;
  abstract getMaxTextLength(): number;
  abstract isReady(): Promise<boolean>;
  abstract dispose(): Promise<void>;

  /**
   * Normalize a vector to unit length
   */
  protected normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
  }

  /**
   * Truncate text to maximum length
   */
  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    // Truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
  }
}
