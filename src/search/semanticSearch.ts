import { BaseSearchEngine } from "./searchEngine.js";
import type { ISearchEngine } from "./searchEngine.js";
import type {
  FileInfo,
  Config,
  SearchOptions,
  SearchResult,
  MatchContext,
} from "../types.js";
import { DocumentChunker } from "../utils/documentChunker.js";
import type { DocumentChunk } from "../utils/documentChunker.js";
import type { IEmbeddingProvider } from "../embeddings/embeddingProvider.js";
import type { IVectorStore, VectorEntry } from "../vectorStore/vectorStore.js";
import { LocalEmbeddingProvider } from "../embeddings/localEmbedding.js";
import { OpenAIEmbeddingProvider } from "../embeddings/openaiEmbedding.js";
import { CohereEmbeddingProvider } from "../embeddings/cohereEmbedding.js";
import { MemoryVectorStore } from "../vectorStore/memoryVectorStore.js";
import { FileVectorStore } from "../vectorStore/fileVectorStore.js";
import * as path from "path";

interface IndexedDocument {
  filePath: string;
  chunks: DocumentChunk[];
  lastModified: Date;
}

export class SemanticSearchEngine
  extends BaseSearchEngine
  implements ISearchEngine
{
  private embeddingProvider: IEmbeddingProvider;
  private vectorStore: IVectorStore;
  private documentChunker: DocumentChunker;
  private indexedDocuments = new Map<string, IndexedDocument>();
  private isInitialized = false;

  constructor(private readonly config: Config) {
    super();

    // Initialize document chunker with proper type checking
    const semanticConfig = this.config.searchOptions.semantic;
    const chunkSize =
      semanticConfig && typeof semanticConfig.batchSize === "number"
        ? semanticConfig.batchSize
        : 800;

    this.documentChunker = new DocumentChunker({
      maxChunkSize: chunkSize,
      overlapSize: 100,
      chunkByParagraph: true,
      preserveCodeBlocks: true,
    });

    // Initialize embedding provider
    this.embeddingProvider = this.createEmbeddingProvider(this.config);

    // Initialize vector store
    this.vectorStore = this.createVectorStore(this.config);
  }

  private createEmbeddingProvider(config: Config): IEmbeddingProvider {
    const semanticConfig = config.searchOptions.semantic;
    if (!semanticConfig || !semanticConfig.enabled) {
      throw new Error("Semantic search is not enabled in configuration");
    }

    const provider = semanticConfig.provider;
    const model = semanticConfig.model;

    switch (provider) {
      case "local":
        return new LocalEmbeddingProvider({
          model: model || "Xenova/all-MiniLM-L6-v2",
          batchSize: semanticConfig.batchSize,
        });

      case "openai":
        if (!semanticConfig.apiKey) {
          throw new Error("OpenAI API key is required for semantic search");
        }
        return new OpenAIEmbeddingProvider({
          apiKey: semanticConfig.apiKey,
          model: model || "text-embedding-3-small",
          batchSize: semanticConfig.batchSize,
        });

      case "cohere":
        if (!semanticConfig.apiKey) {
          throw new Error("Cohere API key is required for semantic search");
        }
        return new CohereEmbeddingProvider({
          apiKey: semanticConfig.apiKey,
          model: model || "embed-english-v3.0",
          batchSize: semanticConfig.batchSize,
        });

      default:
        throw new Error(`Unknown embedding provider: ${String(provider)}`);
    }
  }

  private createVectorStore(config: Config): IVectorStore {
    const semanticConfig = config.searchOptions.semantic;
    if (!semanticConfig) {
      throw new Error("Semantic configuration is missing");
    }

    // Use file-based vector store if caching is enabled
    if (semanticConfig.cacheEmbeddings) {
      const cacheDir = path.join(process.cwd(), ".mcp-cache");
      const cachePath = path.join(cacheDir, "vectors.json");
      return new FileVectorStore(cachePath);
    }

    return new MemoryVectorStore();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Load cached vectors if using file store
    if (this.vectorStore instanceof FileVectorStore) {
      await this.vectorStore.load();
    }

    // Ensure embedding provider is ready
    const ready = await this.embeddingProvider.isReady();
    if (!ready) {
      throw new Error("Embedding provider failed to initialize");
    }

    this.isInitialized = true;
  }

  async index(files: FileInfo[]): Promise<void> {
    await this.initialize();

    for (const file of files) {
      await this.indexFile(file);
    }
  }

  private async indexFile(file: FileInfo): Promise<void> {
    if (!file.content) {
      console.error(`No content available for file: ${file.path}`);
      return;
    }

    // Check if file needs re-indexing
    const existingDoc = this.indexedDocuments.get(file.path);
    if (existingDoc && existingDoc.lastModified >= file.modified) {
      return; // File hasn't changed
    }

    try {
      // Chunk the document
      const chunks = this.documentChunker.chunkDocument(
        file.content,
        file.path,
        file.title,
      );

      // Generate embeddings for each chunk
      const chunkTexts = chunks.map((chunk) => chunk.content);
      const embeddingResult =
        await this.embeddingProvider.embedBatch(chunkTexts);

      // Store vectors
      const vectorEntries: VectorEntry[] = [];
      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        const vector = embeddingResult.embeddings[index];
        if (!vector || !chunk) {
          console.error(
            `Missing embedding or chunk at index ${index} in file ${file.path}`,
          );
          continue;
        }
        vectorEntries.push({
          vector,
          metadata: {
            id: chunk.id,
            path: file.path,
            title: file.title,
            modified: file.modified.getTime(),
            hash: chunk.id,
            chunkIndex: chunk.chunkIndex,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            content: chunk.content,
          },
        });
      }

      // Remove old vectors for this file
      await this.removeFileVectors(file.path);

      // Add new vectors
      await this.vectorStore.addBatch(vectorEntries);

      // Update indexed documents
      this.indexedDocuments.set(file.path, {
        filePath: file.path,
        chunks,
        lastModified: file.modified,
      });

      // Store file info
      this.files.set(file.path, file);
    } catch (error) {
      console.error(`Failed to index file ${file.path}:`, error);
    }
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    await this.initialize();

    const { query, limit = 10 } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingProvider.embed(query);

      // Search vector store
      const searchResults = await this.vectorStore.search(
        queryEmbedding.embedding,
        {
          topK: limit * 2, // Get more results for filtering
        },
      );

      // Group results by file and create search results
      const fileResults = new Map<string, SearchResult>();

      for (const result of searchResults) {
        const metadata = result.entry.metadata;
        const filePath = metadata.path;  // Changed from filePath to path
        const file = this.files.get(filePath);

        if (!file) {
          continue;
        }

        let fileResult = fileResults.get(filePath);
        if (!fileResult) {
          fileResult = {
            file,
            score: result.score,
            matches: [],
          };
          fileResults.set(filePath, fileResult);
        }

        // Update score to use the highest score for this file
        if (result.score > fileResult.score) {
          fileResult.score = result.score;
        }

        // Add match context
        const content = metadata.content as string;
        const matchText = this.extractMatchText(content, query);
        const matchContext: MatchContext = {
          line: metadata.startLine as number,
          text: matchText,
          start: 0,
          end: matchText.length,
        };

        fileResult.matches.push(matchContext);
      }

      // Convert to array and sort by score
      const results = Array.from(fileResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      return results;
    } catch (error) {
      console.error("Semantic search failed:", error);
      return [];
    }
  }

  private extractMatchText(content: string, query: string): string {
    // Find the most relevant sentence or phrase
    const sentences = content.split(/[.!?]+/);

    // Simple heuristic: find sentence with most query words
    let bestSentence = "";
    let maxMatches = 0;

    const queryWords = query.toLowerCase().split(/\s+/);

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const matchCount = queryWords.filter((word) =>
        sentenceLower.includes(word),
      ).length;

      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestSentence = sentence.trim();
      }
    }

    return bestSentence || sentences[0]?.trim() || "";
  }

  // Removed unused createSnippet method

  async update(file: FileInfo): Promise<void> {
    await this.initialize();
    await this.indexFile(file);
  }

  async remove(filePath: string): Promise<void> {
    await this.initialize();

    // Remove from vector store
    await this.removeFileVectors(filePath);

    // Remove from indexed documents
    this.indexedDocuments.delete(filePath);

    // Remove from files
    this.files.delete(filePath);
  }

  private async removeFileVectors(filePath: string): Promise<void> {
    const indexedDoc = this.indexedDocuments.get(filePath);
    if (indexedDoc) {
      const chunkIds = indexedDoc.chunks.map((chunk) => chunk.id);
      await this.vectorStore.removeBatch(chunkIds);
    }
  }

  async dispose(): Promise<void> {
    // Save vector store if using file store
    if (this.vectorStore instanceof FileVectorStore) {
      await this.vectorStore.persist();
    }

    // Dispose embedding provider
    await this.embeddingProvider.dispose();
  }
}
