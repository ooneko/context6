import { pipeline, type Pipeline } from "@xenova/transformers";
import {
  BaseEmbeddingProvider,
  type EmbeddingResult,
  type BatchEmbeddingResult,
  type EmbeddingProviderConfig,
} from "./embeddingProvider.js";

// Type definition for transformer output
interface TransformerOutput {
  data: Float32Array;
  dims: number[];
  type: string;
  size: number;
}

export interface LocalEmbeddingConfig extends EmbeddingProviderConfig {
  modelPath?: string;
  cacheDir?: string;
}

export class LocalEmbeddingProvider extends BaseEmbeddingProvider {
  private embedder: Pipeline | null = null;
  private modelName: string;
  private dimension: number;
  private maxLength: number = 512;
  private modelPath?: string;
  private cacheDir?: string;
  private initPromise: Promise<void> | null = null;

  constructor(config: LocalEmbeddingConfig) {
    super(config);
    this.modelName = config.model || "Xenova/all-MiniLM-L6-v2";
    this.modelPath = config.modelPath;
    this.cacheDir = config.cacheDir;

    // Set dimensions based on known models
    this.dimension = this.getModelDimension(this.modelName);
  }

  private getModelDimension(modelName: string): number {
    // Common sentence transformer models and their dimensions
    const knownDimensions: Record<string, number> = {
      "Xenova/all-MiniLM-L6-v2": 384,
      "Xenova/all-MiniLM-L12-v2": 384,
      "Xenova/all-mpnet-base-v2": 768,
      "Xenova/paraphrase-multilingual-MiniLM-L12-v2": 384,
      "Xenova/distiluse-base-multilingual-cased-v2": 512,
    };

    return knownDimensions[modelName] || 384; // Default to 384
  }

  private async initialize(): Promise<void> {
    if (this.embedder) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.doInitialize();
    }

    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Load the feature extraction pipeline
      this.embedder = await pipeline("feature-extraction", this.modelName, {
        cache_dir: this.cacheDir,
        local_files_only: !!this.modelPath,
        revision: "main",
      });
    } catch (error) {
      throw new Error(
        `Failed to load local embedding model ${this.modelName}: ${String(error)}`,
      );
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error("Embedder not initialized");
    }

    const truncated = this.truncateText(text, this.maxLength);

    try {
      // Generate embeddings
      const output = (await this.embedder(truncated, {
        pooling: "mean",
        normalize: true,
      })) as TransformerOutput;

      // Extract the embedding array
      const embedding = Array.from(output.data);

      // Estimate token count (rough approximation)
      const tokens = Math.ceil(truncated.length / 4);

      return {
        embedding: this.normalize(embedding),
        tokens,
      };
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${String(error)}`);
    }
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error("Embedder not initialized");
    }

    const batchSize = this.config.batchSize || 32;
    const embeddings: number[][] = [];
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const truncatedBatch = batch.map((text) =>
        this.truncateText(text, this.maxLength),
      );

      try {
        // Process batch
        const embedderCopy = this.embedder;
        const outputs = await Promise.all(
          truncatedBatch.map(async (text) => {
            const result = (await embedderCopy(text, {
              pooling: "mean",
              normalize: true,
            })) as unknown as TransformerOutput;
            return result;
          }),
        );

        // Extract embeddings
        for (const output of outputs) {
          const embedding = Array.from(output.data);
          embeddings.push(this.normalize(embedding));
        }

        // Estimate tokens
        totalTokens += truncatedBatch.reduce(
          (sum, text) => sum + Math.ceil(text.length / 4),
          0,
        );
      } catch (error) {
        throw new Error(
          `Failed to generate batch embeddings: ${String(error)}`,
        );
      }
    }

    return {
      embeddings,
      totalTokens,
    };
  }

  getDimension(): number {
    return this.dimension;
  }

  getMaxTextLength(): number {
    return this.maxLength;
  }

  async isReady(): Promise<boolean> {
    try {
      await this.initialize();
      return this.embedder !== null;
    } catch {
      return false;
    }
  }

  dispose(): Promise<void> {
    if (this.embedder) {
      // Transformers.js doesn't have explicit disposal, but we can clear the reference
      this.embedder = null;
      this.initPromise = null;
    }
    return Promise.resolve();
  }
}
