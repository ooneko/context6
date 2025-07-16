import { createSearchEngine, createSearchEngineForMode } from '../../src/search/searchEngineFactory.js';
import { KeywordSearchEngine } from '../../src/search/keywordSearch.js';
import type { Config } from '../../src/types.js';
import { getConfig } from '../../src/config.js';

describe('searchEngineFactory', () => {
  let config: Config;

  beforeEach(() => {
    config = getConfig();
  });

  describe('createSearchEngine', () => {
    it('should create KeywordSearchEngine for keyword mode', () => {
      config.searchOptions.defaultMode = 'keyword';
      const engine = createSearchEngine(config);
      expect(engine).toBeInstanceOf(KeywordSearchEngine);
    });

    it('should fallback to KeywordSearchEngine for semantic mode', () => {
      config.searchOptions.defaultMode = 'semantic';
      const engine = createSearchEngine(config);
      expect(engine).toBeInstanceOf(KeywordSearchEngine);
    });

    it('should fallback to KeywordSearchEngine for hybrid mode', () => {
      config.searchOptions.defaultMode = 'hybrid';
      const engine = createSearchEngine(config);
      expect(engine).toBeInstanceOf(KeywordSearchEngine);
    });

    it('should throw error for unknown search mode', () => {
      // @ts-expect-error Testing invalid mode
      config.searchOptions.defaultMode = 'invalid';
      expect(() => createSearchEngine(config)).toThrow('Unknown search mode: invalid');
    });
  });

  describe('createSearchEngineForMode', () => {
    it('should create engine for specified mode', () => {
      config.searchOptions.defaultMode = 'hybrid';
      const engine = createSearchEngineForMode('keyword', config);
      expect(engine).toBeInstanceOf(KeywordSearchEngine);
    });

    it('should preserve original config mode', () => {
      config.searchOptions.defaultMode = 'hybrid';
      createSearchEngineForMode('keyword', config);
      expect(config.searchOptions.defaultMode).toBe('hybrid');
    });

    it('should create engine for semantic mode with fallback', () => {
      const engine = createSearchEngineForMode('semantic', config);
      expect(engine).toBeInstanceOf(KeywordSearchEngine);
    });

    it('should throw error for invalid mode', () => {
      // @ts-expect-error Testing invalid mode
      expect(() => createSearchEngineForMode('invalid', config)).toThrow('Unknown search mode: invalid');
    });
  });
});