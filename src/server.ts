import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FileService } from "./fileService.js";
import { createSearchEngine } from "./search/searchEngineFactory.js";
import type { ISearchEngine } from "./search/searchEngine.js";
import type { Config, FileInfo, SearchOptions } from "./types.js";
import { getConfig } from "./config.js";
import * as path from "path";

export class LocalKnowledgeServer {
  private server: Server;
  private fileService: FileService;
  private searchEngine: ISearchEngine;
  private config: Config;
  private files: Map<string, FileInfo> = new Map();

  constructor(config?: Partial<Config>) {
    this.config = getConfig(config);
    this.fileService = new FileService(
      this.config.knowledgePaths,
      this.config.ignorePatterns,
      this.config.indexOptions.maxFileSizeMb,
    );
    this.searchEngine = createSearchEngine(this.config);

    // Initialize server with proper typing
    const server = new Server(
      {
        name: "local-knowledge-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    this.server = server;

    this.setupTools();
  }

  private setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: "search",
          description: "Search for content in local markdown files",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
              limit: {
                type: "number",
                description: "Maximum number of results",
                default: 10,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "read_file",
          description: "Read the content of a markdown file",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the markdown file",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "list_files",
          description: "List available markdown files",
          inputSchema: {
            type: "object",
            properties: {
              directory: {
                type: "string",
                description: "Directory to list files from (optional)",
              },
            },
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: unknown) => {
        const req = request as { params: { name: string; arguments: unknown } };
        const { name, arguments: args } = req.params;

        switch (name) {
          case "search":
            return await this.handleSearch(
              args as { query: string; limit?: number },
            );

          case "read_file":
            return this.handleReadFile(args as { path: string });

          case "list_files":
            return this.handleListFiles(args as { directory?: string });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      },
    );
  }

  private async handleSearch(args: { query: string; limit?: number }): Promise<{
    content: Array<{ type: string; text: string }>;
  }> {
    const searchOptions: SearchOptions = {
      query: args.query,
      limit: args.limit || 10,
      mode: this.config.searchOptions.defaultMode,
    };

    const results = await this.searchEngine.search(searchOptions);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No results found for your query.",
          },
        ],
      };
    }

    const content = results.map((result) => {
      const matchesText = result.matches
        .slice(0, 3)
        .map((match) => `Line ${match.line}: ${match.text}`)
        .join("\n");

      return {
        type: "text",
        text: `## ${result.file.title}\n**Path:** ${result.file.relativePath}\n**Score:** ${result.score.toFixed(3)}\n\n**Matches:**\n${matchesText}\n`,
      };
    });

    return { content };
  }

  private handleReadFile(args: { path: string }): {
    content: Array<{ type: string; text: string }>;
  } {
    const resolvedPath = path.resolve(args.path);
    const file = this.files.get(resolvedPath);

    if (!file) {
      return {
        content: [
          {
            type: "text",
            text: `File not found: ${args.path}`,
          },
        ],
      };
    }

    if (!file.content) {
      return {
        content: [
          {
            type: "text",
            text: `File content not available: ${args.path}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `# ${file.title}\n\n${file.content}`,
        },
      ],
    };
  }

  private handleListFiles(args: { directory?: string }): {
    content: Array<{ type: string; text: string }>;
  } {
    let files = Array.from(this.files.values());

    if (args.directory) {
      const normalizedDir = path.normalize(args.directory);
      files = files.filter((file) =>
        file.relativePath.startsWith(normalizedDir),
      );
    }

    if (files.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: args.directory
              ? `No markdown files found in directory: ${args.directory}`
              : "No markdown files found.",
          },
        ],
      };
    }

    const fileList = files
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      .map((file) => `- ${file.relativePath} (${file.title})`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${files.length} markdown files:\n\n${fileList}`,
        },
      ],
    };
  }

  async initialize(): Promise<void> {
    console.error("Initializing Local Knowledge MCP Server...");

    // Scan for files
    console.error("Scanning for markdown files...");
    const files = await this.fileService.scanFiles();

    // Store files in map
    for (const file of files) {
      this.files.set(file.path, file);
    }

    console.error(`Found ${files.length} markdown files`);

    // Index files for search
    console.error("Indexing files for search...");
    await this.searchEngine.index(files);

    console.error("Initialization complete");
  }

  async run(): Promise<void> {
    await this.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("Local Knowledge MCP Server running on stdio");
  }
}
