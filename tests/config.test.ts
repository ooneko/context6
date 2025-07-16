import { DEFAULT_CONFIG, mergeConfig } from '../src/config';
import { homedir } from 'os';
import { resolve } from 'path';

describe('Config', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_CONFIG.knowledgePaths).toHaveLength(2);
      expect(DEFAULT_CONFIG.ignorePatterns).toContain('node_modules/**');
      expect(DEFAULT_CONFIG.indexOptions.maxFileSizeMb).toBe(10);
      expect(DEFAULT_CONFIG.searchOptions.defaultMode).toBe('keyword');
    });

    it('should have semantic search disabled by default', () => {
      expect(DEFAULT_CONFIG.searchOptions.semantic?.enabled).toBe(false);
    });
  });

  describe('mergeConfig', () => {
    it('should merge partial config with defaults', () => {
      const partial = {
        knowledgePaths: ['/custom/path'],
        searchOptions: {
          maxResults: 50,
        },
      };

      const merged = mergeConfig(partial);
      
      expect(merged.knowledgePaths).toHaveLength(1);
      expect(merged.knowledgePaths[0]).toBe('/custom/path');
      expect(merged.searchOptions.maxResults).toBe(50);
      expect(merged.searchOptions.defaultMode).toBe('keyword'); // preserved from default
    });

    it('should expand tilde paths to home directory', () => {
      const partial = {
        knowledgePaths: ['~/Documents/notes'],
      };

      const merged = mergeConfig(partial);
      
      expect(merged.knowledgePaths[0]).toBe(resolve(homedir(), 'Documents/notes'));
    });

    it('should merge nested semantic options', () => {
      const partial = {
        searchOptions: {
          semantic: {
            enabled: true,
            provider: 'openai' as const,
          },
        },
      };

      const merged = mergeConfig(partial);
      
      expect(merged.searchOptions.semantic?.enabled).toBe(true);
      expect(merged.searchOptions.semantic?.provider).toBe('openai');
      expect(merged.searchOptions.semantic?.model).toBe('all-MiniLM-L6-v2'); // preserved
    });

    it('should merge hybrid search options', () => {
      const partial = {
        searchOptions: {
          hybrid: {
            keywordWeight: 0.5,
            semanticWeight: 0.5,
          },
        },
      };

      const merged = mergeConfig(partial);
      
      expect(merged.searchOptions.hybrid?.keywordWeight).toBe(0.5);
      expect(merged.searchOptions.hybrid?.semanticWeight).toBe(0.5);
    });

    it('should preserve unmodified config sections', () => {
      const partial = {
        ignorePatterns: ['custom/**'],
      };

      const merged = mergeConfig(partial);
      
      expect(merged.ignorePatterns).toEqual(['custom/**']);
      expect(merged.indexOptions).toEqual(DEFAULT_CONFIG.indexOptions);
      expect(merged.searchOptions).toEqual(DEFAULT_CONFIG.searchOptions);
    });
  });
});