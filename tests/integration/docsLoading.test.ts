import { FileService } from '../../src/fileService.js';
import { KeywordSearchEngine } from '../../src/search/keywordSearch.js';
import type { Config, FileInfo } from '../../src/types.js';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';

// Mock dependencies
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

// Mock console.error to reduce test output noise
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Docs Directory Loading and Search Integration', () => {
  const mockConfig: Partial<Config> = {
    knowledgePaths: ['./docs'],
    ignorePatterns: ['**/drafts/**', '**/*.tmp.md', '**/node_modules/**'],
    indexOptions: {
      maxFileSizeMb: 10,
      cacheEnabled: true,
      updateIntervalMs: 5000,
    },
    searchOptions: {
      maxResults: 20,
      contextLength: 200,
      defaultMode: 'keyword',
    },
  };

  // Mock documents that simulate a real docs directory
  const mockDocuments = {
    '/project/docs/api-reference.md': {
      content: `---
title: API Reference
tags: [api, reference, documentation]
---

# API Reference

## Authentication

All API requests require authentication using Bearer tokens.

### POST /auth/login
Authenticates a user and returns an access token.

**Request Body:**
\`\`\`json
{
  "username": "user@example.com",
  "password": "secure_password"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
\`\`\`

## Users

### GET /users
Returns a list of all users.

### GET /users/:id
Returns a specific user by ID.
`,
      stats: { size: 1024, mtime: new Date('2024-01-15') },
    },
    '/project/docs/user-guide.md': {
      content: `---
title: User Guide
tags: [guide, tutorial]
---

# User Guide

Welcome to our application user guide. This document will help you get started.

## Getting Started

1. First, create an account
2. Log in with your credentials
3. Navigate to the dashboard

## Features

### Dashboard
The dashboard provides an overview of your activities.

### Settings
Customize your experience in the settings panel.

### Search Functionality
Use the search bar to find content quickly. The search supports:
- Keyword search
- Fuzzy matching
- Filter by tags
`,
      stats: { size: 856, mtime: new Date('2024-01-10') },
    },
    '/project/docs/technical-specs.md': {
      content: `# Technical Specifications

## System Requirements

- Node.js 18.0 or higher
- 4GB RAM minimum
- 10GB disk space

## Architecture

The system uses a microservices architecture with the following components:

1. **API Gateway**: Routes requests to appropriate services
2. **Auth Service**: Handles authentication and authorization
3. **Data Service**: Manages data persistence
4. **Search Service**: Provides search functionality

## Performance Metrics

- Response time: < 100ms (p95)
- Throughput: 10,000 requests/second
- Uptime: 99.9% SLA
`,
      stats: { size: 623, mtime: new Date('2024-01-20') },
    },
    '/project/docs/deployment.md': {
      content: `---
title: Deployment Guide
---

# Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Docker installed
- Kubernetes cluster access
- Environment variables configured

## Deployment Steps

1. Build the Docker image
2. Push to container registry
3. Apply Kubernetes manifests
4. Verify deployment status

## Monitoring

Monitor your deployment using:
- Prometheus for metrics
- Grafana for visualization
- ELK stack for logs
`,
      stats: { size: 445, mtime: new Date('2024-01-18') },
    },
    '/project/docs/drafts/wip-feature.md': {
      content: `# Work in Progress Feature

This document is not ready for publication.
`,
      stats: { size: 89, mtime: new Date('2024-01-25') },
    },
    '/project/docs/README.md': {
      content: `# Documentation

This directory contains all project documentation.

## Structure

- \`api-reference.md\`: API documentation
- \`user-guide.md\`: End-user documentation
- \`technical-specs.md\`: Technical specifications
- \`deployment.md\`: Deployment instructions
`,
      stats: { size: 234, mtime: new Date('2024-01-05') },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock glob to return markdown files (excluding drafts)
    (glob as unknown as jest.Mock).mockImplementation(async (pattern: string, options: any) => {
      const basePath = options?.cwd || '';
      if (basePath.includes('docs') || pattern.includes('docs')) {
        // Return absolute paths as expected by FileService
        const baseDir = basePath || './docs';
        return [
          path.resolve(baseDir, 'api-reference.md'),
          path.resolve(baseDir, 'user-guide.md'), 
          path.resolve(baseDir, 'technical-specs.md'),
          path.resolve(baseDir, 'deployment.md'),
          path.resolve(baseDir, 'README.md'),
          path.resolve(baseDir, 'drafts/wip-feature.md'), // Will be filtered by ignore patterns
        ];
      }
      return [];
    });

    // Mock fs.stat
    (fs.stat as jest.Mock).mockImplementation(async (filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      
      // Check if it's a directory
      if (normalizedPath.endsWith('docs') || (normalizedPath.includes('docs') && !normalizedPath.includes('.md'))) {
        return {
          isDirectory: () => true,
          size: 0,
          mtime: new Date(),
        };
      }
      
      for (const [mockPath, mockData] of Object.entries(mockDocuments)) {
        if (normalizedPath.endsWith(path.normalize(mockPath).replace('/project', ''))) {
          return {
            ...mockData.stats,
            isDirectory: () => false,
          };
        }
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // Mock fs.readFile
    (fs.readFile as jest.Mock).mockImplementation(async (filePath: string) => {
      const normalizedPath = path.normalize(filePath);
      for (const [mockPath, mockData] of Object.entries(mockDocuments)) {
        if (normalizedPath.endsWith(path.normalize(mockPath).replace('/project', ''))) {
          return mockData.content;
        }
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // Mock fs.access for directory checks
    (fs.access as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Document Loading', () => {
    it('should load all markdown files from docs directory', async () => {
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );

      const files = await fileService.scanFiles();

      // Should load 5 files (excluding drafts/wip-feature.md due to ignore pattern)
      expect(files).toHaveLength(5);
      
      // Verify file titles are extracted correctly
      const titles = files.map(f => f.title).sort();
      expect(titles).toEqual([
        'API Reference',
        'Deployment Guide',
        'Documentation',
        'Technical Specifications',
        'User Guide',
      ]);
    });

    it('should extract titles from frontmatter when available', async () => {
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );

      const files = await fileService.scanFiles();
      
      const apiDoc = files.find(f => f.relativePath.includes('api-reference'));
      expect(apiDoc?.title).toBe('API Reference');
      
      const techSpec = files.find(f => f.relativePath.includes('technical-specs'));
      expect(techSpec?.title).toBe('Technical Specifications'); // From first # heading
    });

    it('should respect ignore patterns', async () => {
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );

      const files = await fileService.scanFiles();
      
      // Verify drafts are excluded
      const draftFiles = files.filter(f => f.relativePath.includes('drafts'));
      expect(draftFiles).toHaveLength(0);
    });
  });

  describe('Search Functionality', () => {
    let searchEngine: KeywordSearchEngine;
    let files: FileInfo[];

    beforeEach(async () => {
      // Initialize search engine with test data
      searchEngine = new KeywordSearchEngine();
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );
      files = await fileService.scanFiles();
      await searchEngine.index(files);
    });

    it('should search documents by content keywords', async () => {
      const results = await searchEngine.search({
        query: 'authentication',
        limit: 10,
        mode: 'keyword',
      });

      expect(results.length).toBeGreaterThan(0);
      const topResult = results[0];
      expect(topResult.file.title).toBe('API Reference');
      expect(topResult.matches.length).toBeGreaterThan(0);
      expect(topResult.matches[0].text.toLowerCase()).toContain('authentication');
    });

    it('should search across multiple documents', async () => {
      const results = await searchEngine.search({
        query: 'deployment',
        limit: 10,
        mode: 'keyword',
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      
      // Should find matches in both deployment.md and README.md
      const titles = results.map(r => r.file.title);
      expect(titles).toContain('Deployment Guide');
      expect(titles).toContain('Documentation');
    });

    it('should perform case-insensitive search', async () => {
      const resultsLower = await searchEngine.search({
        query: 'api',
        limit: 10,
        mode: 'keyword',
      });

      const resultsUpper = await searchEngine.search({
        query: 'API',
        limit: 10,
        mode: 'keyword',
      });

      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsLower[0].file.title).toBe(resultsUpper[0].file.title);
    });

    it('should rank results by relevance', async () => {
      const results = await searchEngine.search({
        query: 'search',
        limit: 10,
        mode: 'keyword',
      });

      expect(results.length).toBeGreaterThan(0);
      
      // User Guide should rank high as it has multiple mentions of "search"
      const userGuideResult = results.find(r => r.file.title === 'User Guide');
      expect(userGuideResult).toBeDefined();
      expect(userGuideResult!.score).toBeGreaterThan(0);
      
      // Verify scores are in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should limit search results', async () => {
      const results = await searchEngine.search({
        query: 'the', // Common word that appears in many documents
        limit: 2,
        mode: 'keyword',
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should extract search context correctly', async () => {
      const results = await searchEngine.search({
        query: 'Bearer tokens',
        limit: 5,
        mode: 'keyword',
      });

      expect(results.length).toBeGreaterThan(0);
      const match = results[0].matches[0];
      expect(match.text).toContain('Bearer tokens');
      expect(match.line).toBeGreaterThan(0);
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should complete the full workflow: scan → index → search', async () => {
      // Step 1: Scan files
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );
      const files = await fileService.scanFiles();
      expect(files).toHaveLength(5);

      // Step 2: Index files
      const searchEngine = new KeywordSearchEngine();
      await searchEngine.index(files);

      // Step 3: Search indexed content
      const searchResults = await searchEngine.search({
        query: 'kubernetes',
        limit: 5,
        mode: 'keyword',
      });

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].file.title).toBe('Deployment Guide');
      expect(searchResults[0].matches[0].text).toContain('Kubernetes');
    });

    it('should maintain file metadata through the workflow', async () => {
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );
      const files = await fileService.scanFiles();
      
      // Verify metadata is preserved
      const apiDoc = files.find(f => f.relativePath.includes('api-reference'));
      expect(apiDoc).toBeDefined();
      expect(apiDoc!.title).toBe('API Reference');
      expect(apiDoc!.size).toBe(1024);
      expect(apiDoc!.content).toContain('Authentication');
      
      // Index and verify searchability
      const searchEngine = new KeywordSearchEngine();
      await searchEngine.index(files);
      
      const results = await searchEngine.search({
        query: 'Bearer tokens',
        limit: 10,
        mode: 'keyword',
      });
      
      expect(results[0].file.path).toBe(apiDoc!.path);
    });

    it('should handle multiple search queries on the same indexed data', async () => {
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );
      const files = await fileService.scanFiles();
      
      const searchEngine = new KeywordSearchEngine();
      await searchEngine.index(files);
      
      // Multiple searches on same index
      const authResults = await searchEngine.search({
        query: 'authentication',
        limit: 10,
        mode: 'keyword',
      });
      
      const deployResults = await searchEngine.search({
        query: 'deployment',
        limit: 10,
        mode: 'keyword',
      });
      
      const searchResults = await searchEngine.search({
        query: 'search',
        limit: 10,
        mode: 'keyword',
      });
      
      expect(authResults.length).toBeGreaterThan(0);
      expect(deployResults.length).toBeGreaterThan(0);
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Different queries should return different top results
      expect(authResults[0].file.title).not.toBe(deployResults[0].file.title);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results gracefully', async () => {
      const searchEngine = new KeywordSearchEngine();
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );
      const files = await fileService.scanFiles();
      await searchEngine.index(files);

      const results = await searchEngine.search({
        query: 'nonexistentterm12345',
        limit: 10,
        mode: 'keyword',
      });

      expect(results).toHaveLength(0);
    });

    it('should handle empty docs directory', async () => {
      (glob as unknown as jest.Mock).mockResolvedValue([]);
      
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );

      const files = await fileService.scanFiles();
      expect(files).toHaveLength(0);
    });

    it('should handle special characters in search queries', async () => {
      const searchEngine = new KeywordSearchEngine();
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );
      const files = await fileService.scanFiles();
      await searchEngine.index(files);

      // Search for JSON code block markers
      const results = await searchEngine.search({
        query: '```json',
        limit: 10,
        mode: 'keyword',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].file.title).toBe('API Reference');
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
      
      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );

      const files = await fileService.scanFiles();
      // Should continue processing other files
      expect(files.length).toBeGreaterThan(0);
    });

    it('should skip files exceeding size limit', async () => {
      (fs.stat as jest.Mock).mockImplementation(async (filePath: string) => {
        if (filePath.includes('api-reference')) {
          return { size: 11 * 1024 * 1024, mtime: new Date() }; // 11MB
        }
        return { size: 1024, mtime: new Date() };
      });

      const fileService = new FileService(
        mockConfig.knowledgePaths!,
        mockConfig.ignorePatterns!,
        mockConfig.indexOptions!.maxFileSizeMb
      );

      const files = await fileService.scanFiles();
      const apiDoc = files.find(f => f.relativePath.includes('api-reference'));
      expect(apiDoc).toBeUndefined();
    });
  });
});