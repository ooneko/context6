import { OpenAI } from "openai";
import {
  BaseEmbeddingProvider,
  type EmbeddingResult,
  type BatchEmbeddingResult,
  type EmbeddingProviderConfig,
} from "./embeddingProvider.js";

export interface OpenAIEmbeddingConfig extends EmbeddingProviderConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

type OpenAIEmbeddingModel =
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "text-embedding-ada-002";

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI;
  private modelName: OpenAIEmbeddingModel;
  private dimension: number;
  private maxLength: number = 8191; // OpenAI's token limit

  constructor(config: OpenAIEmbeddingConfig) {
    super(config);

    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
    });

    this.modelName = (config.model ||
      "text-embedding-3-small") as OpenAIEmbeddingModel;
    this.dimension = this.getModelDimension(this.modelName);
  }

  private getModelDimension(model: OpenAIEmbeddingModel): number {
    const dimensions: Record<OpenAIEmbeddingModel, number> = {
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "text-embedding-ada-002": 1536,
    };
    return dimensions[model];
  }

  async embed(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.embeddings.create({
        model: this.modelName,
        input: text,
        encoding_format: "float",
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error("No embedding returned from OpenAI API");
      }
      const tokens = response.usage?.total_tokens || 0;

      return {
        embedding: this.normalize(embedding),
        tokens,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI embedding failed: ${error.message}`);
      }
      throw new Error(`OpenAI embedding failed: ${String(error)}`);
    }
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], totalTokens: 0 };
    }

    const batchSize = this.config.batchSize || 100; // OpenAI supports up to 2048 inputs
    const embeddings: number[][] = [];
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.client.embeddings.create({
          model: this.modelName,
          input: batch,
          encoding_format: "float",
        });

        for (const data of response.data) {
          embeddings.push(this.normalize(data.embedding));
        }

        totalTokens += response.usage?.total_tokens || 0;
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`OpenAI batch embedding failed: ${error.message}`);
        }
        throw new Error(`OpenAI batch embedding failed: ${String(error)}`);
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
      await this.client.models.retrieve(this.modelName);
      return true;
    } catch {
      return false;
    }
  }

  dispose(): Promise<void> {
    // OpenAI client doesn't need explicit cleanup
    return Promise.resolve();
  }
}
