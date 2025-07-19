# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Local Knowledge MCP Server** - a TypeScript-based MCP (Model Context Protocol) server that enables AI assistants to search and access local Markdown knowledge bases.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Development workflow
npm run watch      # Watch mode for development (auto-recompile)
npm run build      # Build the project to dist/
npm run inspector  # Debug the server using MCP Inspector

# Code quality
npm run format     # Format code with Prettier
npm run lint       # Lint with ESLint (strict TypeScript rules)

# Testing - see tests/README.md for complete guide
npm run test       # Run all tests
npm run test:watch # Watch mode for development
npm run test:coverage # Generate coverage report
```

### Development Workflow
1. Always run `npm run format && npm run lint` before committing
2. Ensure all tests pass with `npm run test`
3. Use `npm run watch` during development for auto-compilation
4. Debug with `npm run inspector` when testing MCP communication

### Testing
For comprehensive testing documentation, see [tests/README.md](tests/README.md)

## Architecture Overview

### Core Components

1. **Entry Points**
   - `src/index.ts`: CLI entry point, handles config loading and server startup
   - `src/server.ts`: MCP server implementation using StdioTransport

2. **Key Services**
   - `src/config.ts`: Configuration management with deep merge support
   - `src/fileService.ts`: File system operations for Markdown files
   - `src/search/`: Search engine abstraction and keyword search implementation

3. **MCP Tools Exposed**
   - `search`: Search across Markdown files
   - `read_file`: Read a specific Markdown file
   - `list_files`: List available Markdown files

### Data Flow
```
Claude Desktop → StdioTransport → LocalKnowledgeServer → Tool Handlers
                                                              ↓
                                            FileService ← SearchEngine
```

### Important Patterns

1. **Configuration Loading Priority**
   - Command line `--config` flag
   - Environment variable `LOCAL_KNOWLEDGE_CONFIG`
   - Default config from `src/config.ts`

2. **Search Architecture**
   - Abstract `SearchEngine` class for extensibility
   - Current implementation: `KeywordSearchEngine` (simple string matching)
   - Prepared for future semantic search (config structure exists)

3. **File Processing**
   - Uses `glob` for file discovery
   - `gray-matter` for Markdown frontmatter parsing
   - Title extraction: frontmatter > first # heading > filename
   - Respects `.gitignore`-style patterns

## Testing

See [tests/README.md](tests/README.md) for complete testing documentation including:
- Test organization and structure
- Running different types of tests
- Writing new tests
- Coverage requirements

## TypeScript Configuration

- Strict mode enabled
- ES2022 target with ES modules
- All code must pass type checking
- No implicit any allowed

## Key Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `flexsearch`: Fast text search (installed but not yet used)
- `chokidar`: File watching (installed for future use)
- `gray-matter`: Markdown frontmatter parsing
- `glob` & `minimatch`: File pattern matching

## Future Extensions

The codebase is prepared for:
- Semantic search using embeddings (config structure exists)
- Real-time file monitoring with chokidar
- Multiple search modes (keyword/semantic/hybrid)
- Embedding providers (local/openai/cohere)

## Common Tasks

### Adding a New MCP Tool
1. Define the tool in `server.ts` constructor
2. Add handler in `handleToolCall` method
3. Update types in `src/types.ts` if needed
4. Add tests in `tests/`

### Modifying Search Logic
1. Extend `SearchEngine` abstract class
2. Implement in `src/search/` directory
3. Update `server.ts` to use new engine
4. Maintain backward compatibility with config

### Debugging MCP Communication
1. Run `npm run build` first
2. Use `npm run inspector` to launch MCP Inspector
3. Check stdio communication in the inspector UI