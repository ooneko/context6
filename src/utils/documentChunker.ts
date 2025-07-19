export interface ChunkOptions {
  maxChunkSize: number;
  overlapSize: number;
  chunkByParagraph: boolean;
  preserveCodeBlocks: boolean;
}

export interface DocumentChunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  metadata: {
    filePath: string;
    title: string;
    totalChunks: number;
  };
}

export class DocumentChunker {
  private readonly defaultOptions: ChunkOptions = {
    maxChunkSize: 800,
    overlapSize: 100,
    chunkByParagraph: true,
    preserveCodeBlocks: true,
  };

  constructor(private options: Partial<ChunkOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  chunkDocument(
    content: string,
    filePath: string,
    title: string,
  ): DocumentChunk[] {
    const opts = this.options as ChunkOptions;
    const lines = content.split("\n");

    if (opts.chunkByParagraph) {
      return this.chunkByParagraphs(lines, filePath, title, opts);
    } else {
      return this.chunkBySize(lines, filePath, title, opts);
    }
  }

  private chunkByParagraphs(
    lines: string[],
    filePath: string,
    title: string,
    options: ChunkOptions,
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const paragraphs = this.extractParagraphs(
      lines,
      options.preserveCodeBlocks,
    );

    let currentChunk: string[] = [];
    let currentSize = 0;
    let startLine = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphSize = this.estimateTokenCount(
        paragraph.content.join("\n"),
      );

      if (paragraphSize > options.maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(
            this.createChunk(
              currentChunk,
              filePath,
              title,
              startLine,
              startLine + currentChunk.length - 1,
              chunkIndex++,
            ),
          );
          currentChunk = [];
          currentSize = 0;
        }

        const subChunks = this.splitLargeParagraph(
          paragraph,
          options.maxChunkSize,
        );
        for (const subChunk of subChunks) {
          chunks.push(
            this.createChunk(
              subChunk.lines,
              filePath,
              title,
              subChunk.startLine,
              subChunk.endLine,
              chunkIndex++,
            ),
          );
        }
        startLine = paragraph.endLine + 1;
      } else if (currentSize + paragraphSize > options.maxChunkSize) {
        chunks.push(
          this.createChunk(
            currentChunk,
            filePath,
            title,
            startLine,
            startLine + currentChunk.length - 1,
            chunkIndex++,
          ),
        );

        const overlap = this.getOverlap(currentChunk, options.overlapSize);
        currentChunk = [...overlap, ...paragraph.content];
        currentSize = this.estimateTokenCount(currentChunk.join("\n"));
        startLine = paragraph.startLine - overlap.length;
      } else {
        currentChunk.push(...paragraph.content);
        currentSize += paragraphSize;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(
        this.createChunk(
          currentChunk,
          filePath,
          title,
          startLine,
          startLine + currentChunk.length - 1,
          chunkIndex++,
        ),
      );
    }

    return chunks.map((chunk) => ({
      ...chunk,
      metadata: { ...chunk.metadata, totalChunks: chunks.length },
    }));
  }

  private chunkBySize(
    lines: string[],
    filePath: string,
    title: string,
    options: ChunkOptions,
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let startLine = 0;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) {
        continue;
      }
      const lineSize = this.estimateTokenCount(line);

      if (
        currentSize + lineSize > options.maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(
          this.createChunk(
            currentChunk,
            filePath,
            title,
            startLine,
            i - 1,
            chunkIndex++,
          ),
        );

        const overlap = this.getOverlap(currentChunk, options.overlapSize);
        currentChunk = overlap;
        currentSize = this.estimateTokenCount(currentChunk.join("\n"));
        startLine = i - overlap.length;
      }

      currentChunk.push(line);
      currentSize += lineSize;
    }

    if (currentChunk.length > 0) {
      chunks.push(
        this.createChunk(
          currentChunk,
          filePath,
          title,
          startLine,
          lines.length - 1,
          chunkIndex++,
        ),
      );
    }

    return chunks.map((chunk) => ({
      ...chunk,
      metadata: { ...chunk.metadata, totalChunks: chunks.length },
    }));
  }

  private extractParagraphs(
    lines: string[],
    preserveCodeBlocks: boolean,
  ): Array<{ content: string[]; startLine: number; endLine: number }> {
    const paragraphs: Array<{
      content: string[];
      startLine: number;
      endLine: number;
    }> = [];
    let currentParagraph: string[] = [];
    let startLine = 0;
    let inCodeBlock = false;
    let codeBlockDelimiter = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) {
        continue;
      }
      const trimmedLine = line.trim();

      if (preserveCodeBlocks && trimmedLine.startsWith("```")) {
        if (!inCodeBlock) {
          if (currentParagraph.length > 0) {
            paragraphs.push({
              content: currentParagraph,
              startLine,
              endLine: i - 1,
            });
            currentParagraph = [];
          }
          inCodeBlock = true;
          codeBlockDelimiter = trimmedLine;
          startLine = i;
          currentParagraph.push(line);
        } else if (
          trimmedLine === codeBlockDelimiter ||
          trimmedLine === "```"
        ) {
          currentParagraph.push(line);
          paragraphs.push({
            content: currentParagraph,
            startLine,
            endLine: i,
          });
          currentParagraph = [];
          inCodeBlock = false;
          codeBlockDelimiter = "";
        } else {
          currentParagraph.push(line);
        }
      } else if (!inCodeBlock && trimmedLine === "") {
        if (currentParagraph.length > 0) {
          paragraphs.push({
            content: currentParagraph,
            startLine,
            endLine: i - 1,
          });
          currentParagraph = [];
        }
      } else {
        if (currentParagraph.length === 0) {
          startLine = i;
        }
        currentParagraph.push(line);
      }
    }

    if (currentParagraph.length > 0) {
      paragraphs.push({
        content: currentParagraph,
        startLine,
        endLine: lines.length - 1,
      });
    }

    return paragraphs;
  }

  private splitLargeParagraph(
    paragraph: { content: string[]; startLine: number; endLine: number },
    maxSize: number,
  ): Array<{ lines: string[]; startLine: number; endLine: number }> {
    const chunks: Array<{
      lines: string[];
      startLine: number;
      endLine: number;
    }> = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let chunkStartLine = paragraph.startLine;

    for (let i = 0; i < paragraph.content.length; i++) {
      const line = paragraph.content[i];
      if (line === undefined) {
        continue;
      }
      const lineSize = this.estimateTokenCount(line);

      if (currentSize + lineSize > maxSize && currentChunk.length > 0) {
        chunks.push({
          lines: currentChunk,
          startLine: chunkStartLine,
          endLine: paragraph.startLine + i - 1,
        });
        currentChunk = [];
        currentSize = 0;
        chunkStartLine = paragraph.startLine + i;
      }

      currentChunk.push(line);
      currentSize += lineSize;
    }

    if (currentChunk.length > 0) {
      chunks.push({
        lines: currentChunk,
        startLine: chunkStartLine,
        endLine: paragraph.endLine,
      });
    }

    return chunks;
  }

  private getOverlap(chunk: string[], overlapSize: number): string[] {
    if (overlapSize <= 0) {
      return [];
    }

    let size = 0;
    let startIndex = chunk.length - 1;

    for (let i = chunk.length - 1; i >= 0; i--) {
      const chunkLine = chunk[i];
      if (chunkLine === undefined) {
        continue;
      }
      size += this.estimateTokenCount(chunkLine);
      if (size >= overlapSize) {
        startIndex = i;
        break;
      }
    }

    return chunk.slice(startIndex);
  }

  private createChunk(
    lines: string[],
    filePath: string,
    title: string,
    startLine: number,
    endLine: number,
    chunkIndex: number,
  ): DocumentChunk {
    const content = lines.join("\n");
    const id = `${this.hashString(filePath)}_${chunkIndex}`;

    return {
      id,
      content,
      startLine: startLine + 1,
      endLine: endLine + 1,
      chunkIndex,
      metadata: {
        filePath,
        title,
        totalChunks: 0,
      },
    };
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
