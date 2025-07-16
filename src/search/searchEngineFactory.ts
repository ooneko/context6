import type { Config, SearchMode } from "../types.js";
import type { ISearchEngine } from "./searchEngine.js";
import { KeywordSearchEngine } from "./keywordSearch.js";

export function createSearchEngine(config: Config): ISearchEngine {
  const mode = config.searchOptions.defaultMode;

  switch (mode) {
    case "keyword":
      return new KeywordSearchEngine();

    case "semantic":
      // TODO: Implement SemanticSearchEngine
      // Fallback to keyword search until semantic is implemented
      return new KeywordSearchEngine();

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
