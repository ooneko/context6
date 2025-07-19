import type { Config, SearchMode } from "../types.js";
import type { ISearchEngine } from "./searchEngine.js";
import { KeywordSearchEngine } from "./keywordSearch.js";
import { SemanticSearchEngine } from "./semanticSearch.js";
import { HybridSearchEngine } from "./hybridSearch.js";

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
      // Check if semantic search is properly configured for hybrid mode
      if (!config.searchOptions.semantic?.enabled) {
        // Hybrid search requires semantic search to be enabled
        throw new Error(
          "Hybrid search mode requires semantic search to be enabled in configuration",
        );
      }
      return new HybridSearchEngine(config);

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
