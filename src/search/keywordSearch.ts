import type {
  FileInfo,
  SearchOptions,
  SearchResult,
  MatchContext,
} from "../types.js";
import { BaseSearchEngine } from "./searchEngine.js";

export class KeywordSearchEngine extends BaseSearchEngine {
  async index(files: FileInfo[]): Promise<void> {
    await Promise.resolve();
    this.files.clear();

    for (const file of files) {
      this.files.set(file.path, file);
    }
  }

  async search(options: SearchOptions): Promise<SearchResult[]> {
    await Promise.resolve();
    const { query, limit = 10 } = options;

    // Return empty results for empty query
    if (!query) {
      return [];
    }

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    const allFiles = this.getAllFiles();
    for (const file of allFiles) {
      if (!file.content) {
        continue;
      }

      const lowerContent = file.content.toLowerCase();
      const lowerTitle = file.title.toLowerCase();

      // Check if query matches title or content
      if (
        !lowerTitle.includes(lowerQuery) &&
        !lowerContent.includes(lowerQuery)
      ) {
        continue;
      }

      const matches = this.findMatches(file.content, query);
      const score = this.calculateScore(
        matches.length,
        query.length,
        file.content.length,
      );

      results.push({
        file,
        score,
        matches,
      });
    }

    // Sort by score and limit results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async update(file: FileInfo): Promise<void> {
    await Promise.resolve();
    this.files.set(file.path, file);
  }

  async remove(path: string): Promise<void> {
    await Promise.resolve();
    this.files.delete(path);
  }

  private findMatches(content: string, query: string): MatchContext[] {
    const matches: MatchContext[] = [];

    // Return empty matches for empty query
    if (!query) {
      return matches;
    }

    const lines = content.split("\n");
    const lowerQuery = query.toLowerCase();

    lines.forEach((line, lineIndex) => {
      const lowerLine = line.toLowerCase();
      let position = 0;

      while ((position = lowerLine.indexOf(lowerQuery, position)) !== -1) {
        const contextStart = Math.max(0, position - 50);
        const contextEnd = Math.min(line.length, position + query.length + 50);

        matches.push({
          line: lineIndex + 1,
          text: line.substring(contextStart, contextEnd),
          start: position - contextStart,
          end: position - contextStart + query.length,
        });

        position += query.length || 1; // Ensure we always advance at least 1 character
      }
    });

    return matches.slice(0, 5); // Limit to 5 matches per file
  }

  private calculateScore(
    matchCount: number,
    queryLength: number,
    contentLength: number,
  ): number {
    // Simple scoring algorithm
    const frequencyScore = Math.min(matchCount / 10, 1);
    const densityScore = (matchCount * queryLength) / contentLength;

    return frequencyScore * 0.7 + densityScore * 0.3;
  }
}
