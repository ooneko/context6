import type { FileInfo, SearchResult, SearchOptions, SearchMode } from '../src/types';

describe('Types', () => {
  it('should have valid SearchMode values', () => {
    const modes: SearchMode[] = ['keyword', 'semantic', 'hybrid'];
    expect(modes).toHaveLength(3);
  });

  it('should create valid FileInfo object', () => {
    const fileInfo: FileInfo = {
      path: '/test/file.md',
      relativePath: 'file.md',
      title: 'Test File',
      size: 1024,
      modified: new Date(),
    };
    
    expect(fileInfo.path).toBe('/test/file.md');
    expect(fileInfo.size).toBe(1024);
  });

  it('should create valid SearchOptions', () => {
    const options: SearchOptions = {
      query: 'test query',
      limit: 10,
      mode: 'keyword',
      fuzzy: true,
    };
    
    expect(options.query).toBe('test query');
    expect(options.limit).toBe(10);
    expect(options.mode).toBe('keyword');
  });

  it('should have valid SearchResult structure', () => {
    const result: SearchResult = {
      file: {
        path: '/test/file.md',
        relativePath: 'file.md',
        title: 'Test',
        size: 100,
        modified: new Date(),
      },
      score: 0.95,
      matches: [{
        line: 1,
        text: 'matched text',
        start: 0,
        end: 7,
      }],
    };
    
    expect(result.score).toBe(0.95);
    expect(result.matches).toHaveLength(1);
  });
});