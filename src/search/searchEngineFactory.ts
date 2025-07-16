import type { Config, SearchMode } from "../types.js";
import type { ISearchEngine } from "./searchEngine.js";
import { KeywordSearchEngine } from "./keywordSearch.js";
import { SemanticSearchEngine } from "./semanticSearch.js";

export function createSearchEngine(config: Config): ISearchEngine {
  const mode = config.searchOptions.defaultMode;

  switch (mode) {
    case "keyword":
      return new KeywordSearchEngine();

    case "semantic":
      // Check if semantic search is properly configured
      if (!config.searchOptions.semantic?.enabled) {
        // Semantic search mode requested but not enabled, falling back to keyword search
        return new KeywordSearchEngine();
      }
      return new SemanticSearchEngine(config);

    case "hybrid":
      // TODO: Implement HybridSearchEngine
      // Fallback to keyword search until hybrid is implemented
      return new KeywordSearchEngine();

    default:
      // This ensures exhaustive type checking
      return ((): never => {
        throw new Error(`Unknown search mode: ${String(mode)}`);
      })();
  }
}

export function createSearchEngineForMode(
  mode: SearchMode,
  config: Config,
): ISearchEngine {
  const originalMode = config.searchOptions.defaultMode;
  const tempConfig = {
    ...config,
    searchOptions: {
      ...config.searchOptions,
      defaultMode: mode,
    },
  };

  const engine = createSearchEngine(tempConfig);

  // Restore original mode
  config.searchOptions.defaultMode = originalMode;

  return engine;
}
