# Test Organization

This document describes the testing strategy and organization for the Local Knowledge MCP Server project.

## Test Structure

```
tests/
├── unit tests/                    # Unit tests (mirror src/ structure)
│   ├── config.test.ts            # Configuration management tests
│   ├── fileService.test.ts       # File service tests
│   ├── server.test.ts            # MCP server tests
│   ├── types.test.ts             # Type definitions tests
│   ├── embeddings/               # Embedding provider tests
│   ├── search/                   # Search engine tests
│   ├── utils/                    # Utility function tests
│   └── vectorStore/              # Vector storage tests
│
├── integration/                   # Integration tests
│   └── docsLoading.test.ts       # Document loading integration
│
├── manual/                       # Manual test scripts
│   ├── test-server.js            # Basic server functionality test
│   ├── test-semantic-*.ts        # Semantic search testing
│   ├── test-hybrid-search.ts     # Hybrid search testing
│   └── run-all-tests.js          # Manual test runner
│
└── fixtures/                     # Test data
    ├── configs/                  # Test configuration files
    └── test-knowledge-base/      # Test Markdown documents
```

## Running Tests

### Automated Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- config.test.ts

# Run only unit tests
npm test -- --selectProjects=unit

# Run only integration tests
npm test -- --selectProjects=integration
```

### Manual Tests

Manual tests are used for development-time validation and debugging:

```bash
# Build and run all manual tests
npm run test:manual

# Run individual manual test (after building)
npm run build
node tests/manual/test-server.js
```

## Test Categories

### Unit Tests
- Test individual modules in isolation
- Mock external dependencies
- Fast execution
- Located alongside source structure

### Integration Tests
- Test multiple modules working together
- Use real file system and configurations
- Located in `tests/integration/`

### Manual Tests
- Interactive testing during development
- Debugging complex scenarios
- Performance validation
- Located in `tests/manual/`

## Writing Tests

### Naming Conventions
- Test files: `*.test.ts`
- Manual tests: `test-*.ts` or `test-*.js`
- Test data: Place in `fixtures/`

### Test Structure Example
```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('functionName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test error handling
    });
  });
});
```

### Coverage Requirements
- Global minimum: 80% (branches, functions, lines, statements)
- Excluded from coverage:
  - `src/index.ts` (CLI entry point)
  - Type definition files (`*.d.ts`)

## Test Data

### Fixtures Organization
- `configs/`: Various test configurations
  - `test-config.json`: Basic configuration
  - `semantic-config-*.json`: Provider-specific configs
- `test-knowledge-base/`: Sample Markdown documents
  - Contains various topics for search testing
  - Includes frontmatter and different heading structures

### Creating Test Data
1. Place Markdown files in `fixtures/test-knowledge-base/`
2. Use meaningful filenames and content
3. Include various formats (frontmatter, headings, code blocks)
4. Keep files small but representative

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe what is being tested
3. **Speed**: Keep unit tests fast (mock heavy operations)
4. **Reliability**: Tests should not be flaky
5. **Maintenance**: Update tests when changing functionality

## Debugging Tests

### VSCode Integration
1. Install Jest extension
2. Use breakpoints in test files
3. Run individual tests from the editor

### Manual Debugging
```bash
# Run with Node debugging
node --inspect-brk node_modules/.bin/jest --runInBand config.test.ts

# Verbose output
npm test -- --verbose

# Show individual test results
npm test -- --verbose --no-coverage
```

## Future Improvements

- [ ] Add performance benchmarks
- [ ] Implement snapshot testing for complex outputs
- [ ] Add visual regression tests for CLI output
- [ ] Create end-to-end MCP client integration tests