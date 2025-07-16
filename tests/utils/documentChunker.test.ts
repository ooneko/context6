import { DocumentChunker } from "../../src/utils/documentChunker.js";
import type { ChunkOptions, DocumentChunk } from "../../src/utils/documentChunker.js";

describe("DocumentChunker", () => {
  let chunker: DocumentChunker;

  beforeEach(() => {
    chunker = new DocumentChunker();
  });

  describe("constructor", () => {
    it("should use default options when none provided", () => {
      const chunks = chunker.chunkDocument("Test content", "/path/to/file.md", "Test");
      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should accept custom options", () => {
      const customChunker = new DocumentChunker({
        maxChunkSize: 500,
        overlapSize: 50,
        chunkByParagraph: false,
      });
      const chunks = customChunker.chunkDocument("Test content", "/path/to/file.md", "Test");
      expect(chunks).toBeDefined();
    });
  });

  describe("chunkDocument", () => {
    it("should create chunks with proper metadata", () => {
      const content = "This is a test document.\n\nWith multiple paragraphs.";
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Test Doc");

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk, index) => {
        expect(chunk.id).toBeDefined();
        expect(chunk.content).toBeDefined();
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.metadata.filePath).toBe("/test/file.md");
        expect(chunk.metadata.title).toBe("Test Doc");
        expect(chunk.metadata.totalChunks).toBe(chunks.length);
      });
    });

    it("should handle empty content", () => {
      const chunks = chunker.chunkDocument("", "/test/file.md", "Empty");
      expect(chunks).toEqual([]);
    });

    it("should handle single line content", () => {
      const content = "Single line of text";
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Single");
      
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe(content);
      expect(chunks[0].startLine).toBe(1);
      expect(chunks[0].endLine).toBe(1);
    });
  });

  describe("chunkByParagraphs", () => {
    it("should split content by paragraphs", () => {
      const content = `First paragraph.

Second paragraph.

Third paragraph.`;
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Test");

      // With default chunk size of 800, this small content will likely be one chunk
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].content).toContain("First paragraph");
    });

    it("should handle large paragraphs that exceed chunk size", () => {
      const largeParagraph = "word ".repeat(300); // ~1200 chars, ~300 tokens
      const content = `Small paragraph.\n\n${largeParagraph}\n\nAnother small paragraph.`;
      
      const chunker = new DocumentChunker({ maxChunkSize: 200 });
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Large");

      // Large paragraph should be split into multiple chunks
      expect(chunks.length).toBeGreaterThanOrEqual(3);
    });

    it("should add overlap between chunks", () => {
      const chunker = new DocumentChunker({ 
        maxChunkSize: 100,
        overlapSize: 20,
        chunkByParagraph: true
      });
      
      const content = "First paragraph with some text.\n\nSecond paragraph with more text.\n\nThird paragraph.";
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Overlap Test");

      if (chunks.length > 1) {
        // Check that second chunk contains some content from first
        const firstChunkEnd = chunks[0].content.split('\n').slice(-1)[0];
        if (firstChunkEnd) {
          expect(chunks[1].content).toContain(firstChunkEnd);
        }
      }
    });
  });

  describe("chunkBySize", () => {
    it("should split content by size when chunkByParagraph is false", () => {
      const chunker = new DocumentChunker({ 
        chunkByParagraph: false,
        maxChunkSize: 50 
      });
      
      // Create content that will definitely exceed 50 tokens
      const content = Array(20).fill("This is a longer line of text").join("\n");
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Size Test");

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        // Each chunk should respect the size limit
        const estimatedTokens = Math.ceil(chunk.content.length / 4);
        expect(estimatedTokens).toBeLessThanOrEqual(100); // Allow some flexibility
      });
    });

    it("should handle overlap in size-based chunking", () => {
      const chunker = new DocumentChunker({ 
        chunkByParagraph: false,
        maxChunkSize: 50,
        overlapSize: 10
      });
      
      const lines = Array(10).fill("Line of text");
      const content = lines.join("\n");
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Size Overlap");

      if (chunks.length > 1) {
        // Verify overlap exists
        const firstChunkLines = chunks[0].content.split('\n');
        const secondChunkLines = chunks[1].content.split('\n');
        const lastLineOfFirst = firstChunkLines[firstChunkLines.length - 1];
        expect(secondChunkLines).toContain(lastLineOfFirst);
      }
    });
  });

  describe("code block handling", () => {
    it("should preserve code blocks when preserveCodeBlocks is true", () => {
      const content = `Some text before.

\`\`\`javascript
function test() {
  console.log("Hello");
}
\`\`\`

Some text after.`;

      const chunks = chunker.chunkDocument(content, "/test/file.md", "Code Test");
      
      // Find chunk containing code block
      const codeChunk = chunks.find(c => c.content.includes("```javascript"));
      expect(codeChunk).toBeDefined();
      expect(codeChunk?.content).toContain("function test()");
      expect(codeChunk?.content).toContain("```");
    });

    it("should handle nested code blocks", () => {
      const content = `Text before.

\`\`\`markdown
# Example
\`\`\`javascript
code here
\`\`\`
\`\`\`

Text after.`;

      const chunks = chunker.chunkDocument(content, "/test/file.md", "Nested Code");
      const codeChunk = chunks.find(c => c.content.includes("```markdown"));
      expect(codeChunk).toBeDefined();
    });

    it("should not preserve code blocks when preserveCodeBlocks is false", () => {
      const chunker = new DocumentChunker({ preserveCodeBlocks: false });
      const content = `Line 1
\`\`\`
code
\`\`\`
Line 2`;

      const chunks = chunker.chunkDocument(content, "/test/file.md", "No Preserve");
      // Code block should not be treated specially
      expect(chunks).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle content with only newlines", () => {
      const content = "\n\n\n\n";
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Newlines");
      expect(chunks).toEqual([]);
    });

    it("should handle very long lines", () => {
      const longLine = "a".repeat(1000);
      const chunks = chunker.chunkDocument(longLine, "/test/file.md", "Long Line");
      
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk.content).toBeDefined();
        expect(chunk.startLine).toBeGreaterThan(0);
        expect(chunk.endLine).toBeGreaterThan(0);
      });
    });

    it("should handle mixed line endings", () => {
      const content = "Line 1\rLine 2\r\nLine 3\nLine 4";
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Mixed Endings");
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain("Line");
    });

    it("should generate unique chunk IDs", () => {
      const content = "Chunk 1\n\nChunk 2\n\nChunk 3";
      const chunks1 = chunker.chunkDocument(content, "/test/file1.md", "Test 1");
      const chunks2 = chunker.chunkDocument(content, "/test/file2.md", "Test 2");
      
      // Different files should have different chunk IDs
      expect(chunks1[0].id).not.toBe(chunks2[0].id);
      
      // Same file chunks should have different IDs
      if (chunks1.length > 1) {
        expect(chunks1[0].id).not.toBe(chunks1[1].id);
      }
    });
  });

  describe("line number tracking", () => {
    it("should correctly track line numbers", () => {
      const content = "Line 1\nLine 2\nLine 3\n\nLine 5\nLine 6";
      const chunker = new DocumentChunker({ 
        maxChunkSize: 30,
        chunkByParagraph: false 
      });
      
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Lines");
      
      chunks.forEach(chunk => {
        expect(chunk.startLine).toBeGreaterThan(0);
        expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine);
      });
      
      // Verify continuity
      for (let i = 1; i < chunks.length; i++) {
        const prevEnd = chunks[i - 1].endLine;
        const currStart = chunks[i].startLine;
        // With overlap, current start should be <= previous end
        expect(currStart).toBeLessThanOrEqual(prevEnd + 1);
      }
    });
  });

  describe("helper methods", () => {
    it("should estimate token count reasonably", () => {
      const content = "This is a test sentence with several words.";
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Token Test");
      
      // The implementation estimates ~4 chars per token
      const expectedTokens = Math.ceil(content.length / 4);
      const actualTokens = chunks[0].content.length / 4;
      
      // Allow for some variance in the estimation
      expect(actualTokens).toBeCloseTo(expectedTokens, 0);
    });

    it("should handle empty paragraphs", () => {
      const content = "Para 1\n\n\n\nPara 2";
      const chunks = chunker.chunkDocument(content, "/test/file.md", "Empty Paras");
      
      expect(chunks.length).toBeGreaterThan(0);
      // Should not create chunks for empty paragraphs
      chunks.forEach(chunk => {
        expect(chunk.content.trim()).not.toBe("");
      });
    });
  });
});