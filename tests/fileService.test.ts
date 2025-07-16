import { FileService } from '../src/fileService';
import { promises as fs } from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
  },
}));

jest.mock('glob', () => ({
  glob: jest.fn(),
}));

describe('FileService', () => {
  const mockKnowledgePaths = ['/test/docs'];
  const mockIgnorePatterns = ['node_modules/**', '*.tmp.md'];
  const mockMaxFileSizeMb = 10;
  
  let fileService: FileService;
  
  beforeEach(() => {
    fileService = new FileService(mockKnowledgePaths, mockIgnorePatterns, mockMaxFileSizeMb);
    jest.clearAllMocks();
  });

  describe('getFileInfo', () => {
    it('should return file info for valid markdown file', async () => {
      const mockFilePath = '/test/docs/example.md';
      const mockContent = '# Test Title\n\nTest content';
      const mockStats = {
        size: 1024,
        mtime: new Date('2024-01-01'),
        isDirectory: () => false,
      };

      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await fileService.getFileInfo(mockFilePath, '/test/docs');

      expect(result).toEqual({
        path: mockFilePath,
        relativePath: 'example.md',
        title: 'Test Title',
        size: 1024,
        modified: new Date('2024-01-01'),
        content: mockContent,
      });
    });

    it('should return null for files exceeding size limit', async () => {
      const mockFilePath = '/test/docs/large.md';
      const mockStats = {
        size: 11 * 1024 * 1024, // 11MB
        mtime: new Date(),
        isDirectory: () => false,
      };

      (fs.stat as jest.Mock).mockResolvedValue(mockStats);

      const result = await fileService.getFileInfo(mockFilePath);

      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('should extract title from frontmatter', async () => {
      const mockFilePath = '/test/docs/frontmatter.md';
      const mockContent = '---\ntitle: Frontmatter Title\n---\n\n# Different Title\n\nContent';
      const mockStats = {
        size: 100,
        mtime: new Date(),
        isDirectory: () => false,
      };

      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await fileService.getFileInfo(mockFilePath, '/test/docs');

      expect(result?.title).toBe('Frontmatter Title');
    });

    it('should use filename as title when no title found', async () => {
      const mockFilePath = '/test/docs/no-title.md';
      const mockContent = 'Just some content without a title';
      const mockStats = {
        size: 50,
        mtime: new Date(),
        isDirectory: () => false,
      };

      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await fileService.getFileInfo(mockFilePath, '/test/docs');

      expect(result?.title).toBe('no-title');
    });

    it('should handle file read errors gracefully', async () => {
      const mockFilePath = '/test/docs/error.md';
      
      (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await fileService.getFileInfo(mockFilePath);

      expect(result).toBeNull();
    });
  });

  describe('readFile', () => {
    it('should read file by relative path', async () => {
      const relativePath = 'subfolder/doc.md';
      const fullPath = path.resolve('/test/docs', relativePath);
      const mockContent = '# Document';
      const mockStats = {
        size: 100,
        mtime: new Date(),
        isDirectory: () => false,
      };

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      const result = await fileService.readFile(relativePath);

      expect(result).toBeTruthy();
      expect(result?.relativePath).toBe(relativePath);
      expect(fs.access).toHaveBeenCalledWith(fullPath);
    });

    it('should return null for non-existent file', async () => {
      const relativePath = 'missing.md';

      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await fileService.readFile(relativePath);

      expect(result).toBeNull();
    });
  });

  describe('scanFiles', () => {
    it('should scan markdown files in knowledge paths', async () => {
      const { glob } = require('glob');
      const mockFiles = [
        '/test/docs/file1.md',
        '/test/docs/subfolder/file2.md',
      ];

      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => true }) // for base path
        .mockResolvedValue({ 
          size: 100, 
          mtime: new Date(),
          isDirectory: () => false,
        }); // for files

      (glob as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue('# Test\n\nContent');

      const results = await fileService.scanFiles();

      expect(results).toHaveLength(2);
      expect(glob).toHaveBeenCalledWith(
        '/test/docs/**/*.md',
        expect.objectContaining({
          ignore: mockIgnorePatterns,
          absolute: true,
          nodir: true,
        })
      );
    });

    it('should skip non-directory paths', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false });

      const results = await fileService.scanFiles();

      expect(results).toHaveLength(0);
    });

    it('should handle scan errors gracefully', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const results = await fileService.scanFiles();

      expect(results).toHaveLength(0);
    });
  });
});