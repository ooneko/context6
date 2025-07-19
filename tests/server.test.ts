import type { Config } from '../src/types.js';

// Mock all MCP SDK modules
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: {},
  ListToolsRequestSchema: {},
}));

// Mock file service and search engine factory
jest.mock('../src/fileService.js', () => ({
  FileService: jest.fn().mockImplementation(() => ({
    loadFiles: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../src/search/searchEngineFactory.js', () => ({
  createSearchEngine: jest.fn().mockReturnValue({
    index: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
  }),
}));

// Import after mocking
import { Context6Server } from '../src/server.js';

describe('Context6Server', () => {
  let server: Context6Server;
  const mockConfig: Partial<Config> = {
    knowledgePaths: ['/test/path'],
    searchOptions: {
      maxResults: 10,
      contextLength: 100,
      fuzzyThreshold: 0.6,
      defaultMode: 'keyword'
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    server = new Context6Server(mockConfig);
  });
  
  describe('constructor', () => {
    it('should create server instance', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(Context6Server);
    });
    
    it('should initialize with default config when no config provided', () => {
      const defaultServer = new Context6Server();
      expect(defaultServer).toBeDefined();
    });
    
    it('should use factory to create search engine', () => {
      // The server should use the factory pattern to create the search engine
      // based on the config.searchOptions.defaultMode
      expect(server['searchEngine']).toBeDefined();
    });
  });
  
  describe('run', () => {
    it('should have run method', () => {
      expect(typeof server.run).toBe('function');
    });
  });
});