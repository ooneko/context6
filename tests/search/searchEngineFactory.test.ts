import { createSearchEngine, createSearchEngineForMode } from '../../src/search/searchEngineFactory.js';
import { KeywordSearchEngine } from '../../src/search/keywordSearch.js';
import { SemanticSearchEngine } from '../../src/search/semanticSearch.js';
import type { Config } from '../../src/types.js';
import { getConfig } from '../../src/config.js';

// Mock the semantic search dependencies
jest.mock('../../src/embeddings/localEmbedding.js');
jest.mock('../../src/embeddings/openaiEmbedding.js');
jest.mock('../../src/embeddings/cohereEmbedding.js');
jest.mock('../../src/vectorStore/memoryVectorStore.js');
jest.mock('../../src/vectorStore/fileVectorStore.js');

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

    it('should create SemanticSearchEngine when semantic is enabled', () => {
      config.searchOptions.defaultMode = 'semantic';
      config.searchOptions.semantic = {
        enabled: true,
        provider: 'local',
        model: 'test-model',
        cacheEmbeddings: false,
        batchSize: 100,
      };
      const engine = createSearchEngine(config);
      expect(engine).toBeInstanceOf(SemanticSearchEngine);
    });

    it('should fallback to KeywordSearchEngine when semantic is disabled', () => {
      config.searchOptions.defaultMode = 'semantic';
      config.searchOptions.semantic = {
        enabled: false,
        provider: 'local',
        model: 'test-model',
        cacheEmbeddings: false,
        batchSize: 100,
      };
      const engine = createSearchEngine(config);
      expect(engine).toBeInstanceOf(KeywordSearchEngine);
    });

    it('should fallback to KeywordSearchEngine when semantic config is missing', () => {
      config.searchOptions.defaultMode = 'semantic';
      config.searchOptions.semantic = undefined;
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