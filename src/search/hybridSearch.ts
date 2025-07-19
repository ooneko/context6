import { BaseSearchEngine } from "./searchEngine.js";
import type { ISearchEngine } from "./searchEngine.js";
import type {
  FileInfo,
  Config,
  SearchOptions,
  SearchResult,
  MatchContext,
} from "../types.js";
import { KeywordSearchEngine } from "./keywordSearch.js";
import { SemanticSearchEngine } from "./semanticSearch.js";

interface HybridSearchResult {
  file: FileInfo;
  score: number;
  matches: MatchContext[];
  keywordScore?: number;
  semanticScore?: number;
}

export class HybridSearchEngine
  extends BaseSearchEngine
  implements ISearchEngine
{
  private keywordEngine: KeywordSearchEngine;
  private semanticEngine: SemanticSearchEngine;
  private keywordWeight: number;
  private semanticWeight: number;

  constructor(private readonly config: Config) {
    super();

    // Initialize weights from config or use defaults
    const hybridConfig = this.config.searchOptions.hybrid;
    this.keywordWeight = hybridConfig?.keywordWeight ?? 0.7;
    this.semanticWeight = hybridConfig?.semanticWeight ?? 0.3;

    // Validate weights sum to 1
    const weightSum = this.keywordWeight + this.semanticWeight;
    if (Math.abs(weightSum - 1) > 0.001) {
      // Normalize weights to sum to 1.0
      this.keywordWeight = this.keywordWeight / weightSum;
      this.semanticWeight = this.semanticWeight / weightSum;
    }

    // Initialize sub-engines
    this.keywordEngine = new KeywordSearchEngine();
    this.semanticEngine = new SemanticSearchEngine(this.config);
  }

  async index(files: FileInfo[]): Promise<void> {
    // Store files in base class
    this.files.clear();
    for (const file of files) {
      this.files.set(file.path, file);
    }

    // Index in both engines in parallel
    await Promise.all([
      this.keywordEngine.index(files),
      this.semanticEngine.index(files),
    ]);
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, limit = 10 } = options;

    // Return empty results for empty query
    if (!query) {
      return [];
    }

    // Execute both searches in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordEngine.search(options),
      this.semanticEngine.search(options),
    ]);

    // Merge and score results
    const mergedResults = this.mergeResults(
      keywordResults,
      semanticResults,
      limit,
    );

    return mergedResults;
  }

  async update(file: FileInfo): Promise<void> {
    // Update in base class
    this.files.set(file.path, file);

    // Update in both engines
    await Promise.all([
      this.keywordEngine.update(file),
      this.semanticEngine.update(file),
    ]);
  }

  async remove(path: string): Promise<void> {
    // Remove from base class
    this.files.delete(path);

    // Remove from both engines
    await Promise.all([
      this.keywordEngine.remove(path),
      this.semanticEngine.remove(path),
    ]);
  }

  private mergeResults(
    keywordResults: SearchResult[],
    semanticResults: SearchResult[],
    limit: number,
  ): SearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();

    // Process keyword results
    for (const result of keywordResults) {
      const existing = resultMap.get(result.file.path);
      if (existing) {
        // Merge matches
        existing.matches = this.mergeMatches(existing.matches, result.matches);
        existing.keywordScore = result.score;
      } else {
        const hybridResult: HybridSearchResult = {
          file: result.file,
          score: result.score,
          matches: result.matches,
          keywordScore: result.score,
        };
        resultMap.set(result.file.path, hybridResult);
      }
    }

    // Process semantic results
    for (const result of semanticResults) {
      const existing = resultMap.get(result.file.path);
      if (existing) {
        // Merge matches, preferring semantic matches for better context
        existing.matches = this.mergeMatches(result.matches, existing.matches);
        existing.semanticScore = result.score;
      } else {
        const hybridResult: HybridSearchResult = {
          file: result.file,
          score: result.score,
          matches: result.matches,
          semanticScore: result.score,
        };
        resultMap.set(result.file.path, hybridResult);
      }
    }

    // Calculate hybrid scores and convert to array
    const hybridResults: SearchResult[] = Array.from(resultMap.values()).map(
      (result) => {
        const keywordScore = result.keywordScore ?? 0;
        const semanticScore = result.semanticScore ?? 0;

        // Calculate weighted hybrid score
        const hybridScore =
          keywordScore * this.keywordWeight +
          semanticScore * this.semanticWeight;

        const searchResult: SearchResult = {
          file: result.file,
          score: hybridScore,
          matches: result.matches,
        };
        return searchResult;
      },
    );

    // Sort by hybrid score and limit results
    hybridResults.sort((a, b) => b.score - a.score);
    return hybridResults.slice(0, limit);
  }

  private mergeMatches(
    primaryMatches: MatchContext[],
    secondaryMatches: MatchContext[],
  ): MatchContext[] {
    const mergedMatches: MatchContext[] = [...primaryMatches];
    const existingTexts = new Set(primaryMatches.map((m) => m.text));

    // Add unique matches from secondary
    for (const match of secondaryMatches) {
      if (!existingTexts.has(match.text)) {
        mergedMatches.push(match);
      }
    }

    // Limit to reasonable number of matches per file
    return mergedMatches.slice(0, 5);
  }

  async dispose(): Promise<void> {
    // Dispose semantic engine resources
    if (
      "dispose" in this.semanticEngine &&
      typeof this.semanticEngine.dispose === "function"
    ) {
      await this.semanticEngine.dispose();
    }
  }
}
