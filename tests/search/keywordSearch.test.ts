import { KeywordSearchEngine } from '../../src/search/keywordSearch.js';
import type { FileInfo, SearchOptions, SearchResult } from '../../src/types.js';

describe('KeywordSearchEngine', () => {
  let engine: KeywordSearchEngine;

  beforeEach(() => {
    engine = new KeywordSearchEngine();
  });

  describe('index', () => {
    it('should index files with content', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'File 1',
          size: 100,
          modified: new Date(),
          content: 'Test content 1',
        },
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'File 2',
          size: 200,
          modified: new Date(),
          content: 'Test content 2',
        },
      ];

      await engine.index(files);

      // Check that files are indexed
      const results = await engine.search({ query: 'Test', limit: 10 });
      expect(results).toHaveLength(2);
    });

    it('should clear previous files when re-indexing', async () => {
      const files1: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'File 1',
          size: 100,
          modified: new Date(),
          content: 'First batch',
        },
      ];

      const files2: FileInfo[] = [
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'File 2',
          size: 200,
          modified: new Date(),
          content: 'Second batch',
        },
      ];

      await engine.index(files1);
      await engine.index(files2);

      // Should only find the second batch
      const results1 = await engine.search({ query: 'First', limit: 10 });
      expect(results1).toHaveLength(0);

      const results2 = await engine.search({ query: 'Second', limit: 10 });
      expect(results2).toHaveLength(1);
    });

    it('should handle files without content', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'File 1',
          size: 100,
          modified: new Date(),
          // No content
        },
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'File 2',
          size: 200,
          modified: new Date(),
          content: 'Has content',
        },
      ];

      await engine.index(files);

      const results = await engine.search({ query: 'content', limit: 10 });
      expect(results).toHaveLength(1);
      expect(results[0].file.path).toBe('/test/file2.md');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file1.md',
          relativePath: 'file1.md',
          title: 'Test Document',
          size: 100,
          modified: new Date(),
          content: 'This is a test document\nwith multiple lines\ncontaining the word test',
        },
        {
          path: '/test/file2.md',
          relativePath: 'file2.md',
          title: 'Another File',
          size: 200,
          modified: new Date(),
          content: 'This file has different content\nwithout the search term',
        },
        {
          path: '/test/file3.md',
          relativePath: 'file3.md',
          title: 'Test in Title',
          size: 150,
          modified: new Date(),
          content: 'Content without search term',
        },
      ];
      
      await engine.index(files);
    });

    it('should return empty results when nothing matches', async () => {
      const results = await engine.search({
        query: 'nonexistent',
        limit: 10,
      });

      expect(results).toHaveLength(0);
    });

    it('should find matches in content', async () => {
      const results = await engine.search({
        query: 'test',
        limit: 10,
      });

      expect(results).toHaveLength(2); // file1 and file3
      expect(results[0].matches.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should find matches in title', async () => {
      const results = await engine.search({
        query: 'Test in Title',
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].file.path).toBe('/test/file3.md');
    });

    it('should be case insensitive', async () => {
      const results1 = await engine.search({ query: 'TEST', limit: 10 });
      const results2 = await engine.search({ query: 'test', limit: 10 });
      const results3 = await engine.search({ query: 'TeSt', limit: 10 });

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
      expect(results3).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      // Add more files
      const moreFiles: FileInfo[] = [];
      for (let i = 0; i < 20; i++) {
        moreFiles.push({
          path: `/test/extra${i}.md`,
          relativePath: `extra${i}.md`,
          title: `Test File ${i}`,
          size: 100,
          modified: new Date(),
          content: 'This test file contains the search term test',
        });
      }

      await engine.index(moreFiles);

      const results = await engine.search({
        query: 'test',
        limit: 5,
      });

      expect(results).toHaveLength(5);
    });

    it('should sort results by score', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/many-matches.md',
          relativePath: 'many-matches.md',
          title: 'Many Matches',
          size: 100,
          modified: new Date(),
          content: 'test test test test test test test test test test',
        },
        {
          path: '/test/few-matches.md',
          relativePath: 'few-matches.md',
          title: 'Few Matches',
          size: 100,
          modified: new Date(),
          content: 'test and some other content here',
        },
      ];

      await engine.index(files);

      const results = await engine.search({ query: 'test', limit: 10 });
      expect(results[0].file.path).toBe('/test/many-matches.md');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });

  describe('update', () => {
    it('should update existing file', async () => {
      const originalFile: FileInfo = {
        path: '/test/file.md',
        relativePath: 'file.md',
        title: 'Original',
        size: 100,
        modified: new Date(),
        content: 'Original content',
      };

      const updatedFile: FileInfo = {
        ...originalFile,
        title: 'Updated',
        content: 'Updated content with new search term',
      };

      await engine.index([originalFile]);
      await engine.update(updatedFile);

      // Verify old content is not found
      const oldResults = await engine.search({ query: 'Original', limit: 10 });
      expect(oldResults).toHaveLength(0);

      // Verify new content is found
      const newResults = await engine.search({ query: 'Updated', limit: 10 });
      expect(newResults).toHaveLength(1);
      expect(newResults[0].file.title).toBe('Updated');
    });

    it('should add new file if not exists', async () => {
      const newFile: FileInfo = {
        path: '/test/new.md',
        relativePath: 'new.md',
        title: 'New File',
        size: 100,
        modified: new Date(),
        content: 'New content',
      };

      await engine.update(newFile);

      const results = await engine.search({ query: 'New', limit: 10 });
      expect(results).toHaveLength(1);
      expect(results[0].file.path).toBe('/test/new.md');
    });
  });

  describe('remove', () => {
    it('should remove file from index', async () => {
      const file: FileInfo = {
        path: '/test/file.md',
        relativePath: 'file.md',
        title: 'Test',
        size: 100,
        modified: new Date(),
        content: 'Test content to be removed',
      };

      await engine.index([file]);
      
      // Verify file is indexed
      const beforeRemove = await engine.search({ query: 'removed', limit: 10 });
      expect(beforeRemove).toHaveLength(1);

      await engine.remove('/test/file.md');

      // Verify file is removed
      const afterRemove = await engine.search({ query: 'removed', limit: 10 });
      expect(afterRemove).toHaveLength(0);
    });

    it('should not throw when removing non-existent file', async () => {
      await expect(engine.remove('/non/existent.md')).resolves.not.toThrow();
    });
  });

  describe('findMatches', () => {
    it('should find all matches in content', () => {
      const content = 'This is a test.\nAnother test line.\nNo match here.\nFinal test.';
      const matches = (engine as any).findMatches(content, 'test');

      expect(matches).toHaveLength(3);
      expect(matches[0].line).toBe(1);
      expect(matches[1].line).toBe(2);
      expect(matches[2].line).toBe(4);
    });

    it('should provide match context', () => {
      const content = 'This is a very long line with the word test somewhere in the middle of it.';
      const matches = (engine as any).findMatches(content, 'test');

      expect(matches).toHaveLength(1);
      expect(matches[0].text).toContain('test');
      expect(matches[0].start).toBeGreaterThanOrEqual(0);
      expect(matches[0].end).toBeGreaterThan(matches[0].start);
    });

    it('should find multiple matches on same line', () => {
      const content = 'test test test on same line';
      const matches = (engine as any).findMatches(content, 'test');

      expect(matches).toHaveLength(3);
      expect(matches.every(m => m.line === 1)).toBe(true);
    });

    it('should limit matches to 5 per file', () => {
      const content = Array.from({ length: 10 }, () => 'test line').join('\n');
      const matches = (engine as any).findMatches(content, 'test');

      expect(matches).toHaveLength(5);
    });

    it('should handle context at start and end of line', () => {
      const content = 'test at start\nend with test\ntest';
      const matches = (engine as any).findMatches(content, 'test');

      expect(matches).toHaveLength(3);
      expect(matches[0].start).toBe(0);
      expect(matches[2].text).toBe('test');
    });
  });

  describe('calculateScore', () => {
    it('should calculate score between 0 and 1', () => {
      const score = (engine as any).calculateScore(5, 4, 1000);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should give higher score for more matches', () => {
      const score1 = (engine as any).calculateScore(5, 4, 1000);
      const score2 = (engine as any).calculateScore(10, 4, 1000);
      expect(score2).toBeGreaterThan(score1);
    });

    it('should give higher score for higher density', () => {
      const score1 = (engine as any).calculateScore(5, 4, 1000);
      const score2 = (engine as any).calculateScore(5, 4, 500);
      expect(score2).toBeGreaterThan(score1);
    });

    it('should handle edge cases', () => {
      const score1 = (engine as any).calculateScore(0, 4, 1000);
      expect(score1).toBe(0);

      const score2 = (engine as any).calculateScore(100, 4, 1000);
      expect(score2).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file.md',
          relativePath: 'file.md',
          title: 'Test',
          size: 100,
          modified: new Date(),
          content: 'Test content',
        },
      ];

      await engine.index(files);
      const results = await engine.search({ query: '', limit: 10 });
      expect(results).toHaveLength(0);
    });

    it('should handle very long content', async () => {
      const longContent = Array.from({ length: 100 }, (_, i) => 
        `Line ${i}: Some content with occasional test word`
      ).join('\n');

      const files: FileInfo[] = [
        {
          path: '/test/long.md',
          relativePath: 'long.md',
          title: 'Long File',
          size: longContent.length,
          modified: new Date(),
          content: longContent,
        },
      ];

      await engine.index(files);
      const results = await engine.search({ query: 'test', limit: 10 });
      expect(results).toHaveLength(1);
      expect(results[0].matches).toHaveLength(5); // Limited to 5
    });

    it('should handle special characters in query', async () => {
      const files: FileInfo[] = [
        {
          path: '/test/file.md',
          relativePath: 'file.md',
          title: 'Test',
          size: 100,
          modified: new Date(),
          content: 'Content with $special.chars and (parentheses)',
        },
      ];

      await engine.index(files);
      
      const results1 = await engine.search({ query: '$special.chars', limit: 10 });
      expect(results1).toHaveLength(1);

      const results2 = await engine.search({ query: '(parentheses)', limit: 10 });
      expect(results2).toHaveLength(1);
    });
  });
});