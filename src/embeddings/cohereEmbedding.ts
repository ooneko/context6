import { CohereClient } from "cohere-ai";
import {
  BaseEmbeddingProvider,
  type EmbeddingResult,
  type BatchEmbeddingResult,
  type EmbeddingProviderConfig,
} from "./embeddingProvider.js";

export interface CohereEmbeddingConfig extends EmbeddingProviderConfig {
  apiKey: string;
}

type CohereEmbeddingModel =
  | "embed-english-v3.0"
  | "embed-multilingual-v3.0"
  | "embed-english-light-v3.0"
  | "embed-multilingual-light-v3.0";
type CohereInputType =
  | "search_document"
  | "search_query"
  | "classification"
  | "clustering";

export class CohereEmbeddingProvider extends BaseEmbeddingProvider {
  private client: CohereClient;
  private modelName: CohereEmbeddingModel;
  private dimension: number;
  private maxLength: number = 512; // Cohere's recommended max for best performance
  private inputType: CohereInputType = "search_document";

  constructor(config: CohereEmbeddingConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error("Cohere API key is required");
    }

    this.client = new CohereClient({
      token: config.apiKey,
    });

    this.modelName = (config.model ||
      "embed-english-v3.0") as CohereEmbeddingModel;
    this.dimension = this.getModelDimension(this.modelName);
  }

  private getModelDimension(model: CohereEmbeddingModel): number {
    const dimensions: Record<CohereEmbeddingModel, number> = {
      "embed-english-v3.0": 1024,
      "embed-multilingual-v3.0": 1024,
      "embed-english-light-v3.0": 384,
      "embed-multilingual-light-v3.0": 384,
    };
    return dimensions[model];
  }

  setInputType(type: CohereInputType): void {
    this.inputType = type;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.embed({
        texts: [text],
        model: this.modelName,
        inputType: this.inputType,
        embeddingTypes: ["float"],
      });

      // Type assertion for Cohere response
      const embeddings = response.embeddings as { float: number[][] };
      const embedding = embeddings.float[0];

      if (!embedding) {
        throw new Error("No embedding returned from Cohere API");
      }

      // Cohere doesn't provide token count in response, estimate it
      const tokens = Math.ceil(text.length / 4);

      return {
        embedding: this.normalize(embedding),
        tokens,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Cohere embedding failed: ${error.message}`);
      }
      throw new Error(`Cohere embedding failed: ${String(error)}`);
    }
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], totalTokens: 0 };
    }

    const batchSize = this.config.batchSize || 96; // Cohere's max batch size
    const embeddings: number[][] = [];
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.client.embed({
          texts: batch,
          model: this.modelName,
          inputType: this.inputType,
          embeddingTypes: ["float"],
        });

        // Type assertion for Cohere response
        const responseEmbeddings = response.embeddings as { float: number[][] };
        for (const embedding of responseEmbeddings.float) {
          embeddings.push(this.normalize(embedding));
        }

        // Estimate tokens
        totalTokens += batch.reduce(
          (sum, text) => sum + Math.ceil(text.length / 4),
          0,
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Cohere batch embedding failed: ${error.message}`);
        }
        throw new Error(`Cohere batch embedding failed: ${String(error)}`);
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
      // Test the API key by making a minimal request
      await this.client.embed({
        texts: ["test"],
        model: this.modelName,
        inputType: this.inputType,
        embeddingTypes: ["float"],
      });
      return true;
    } catch {
      return false;
    }
  }

  dispose(): Promise<void> {
    // Cohere client doesn't need explicit cleanup
    return Promise.resolve();
  }
}
