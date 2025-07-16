import { promises as fs } from "fs";
import { join, relative, resolve } from "path";
import { glob } from "glob";
import matter from "gray-matter";
import { minimatch } from "minimatch";
import type { FileInfo } from "./types.js";

export class FileService {
  private knowledgePaths: string[];
  private ignorePatterns: string[];
  private maxFileSizeMb: number;

  constructor(
    knowledgePaths: string[],
    ignorePatterns: string[],
    maxFileSizeMb: number,
  ) {
    this.knowledgePaths = knowledgePaths;
    this.ignorePatterns = ignorePatterns;
    this.maxFileSizeMb = maxFileSizeMb;
  }

  async scanFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    for (const basePath of this.knowledgePaths) {
      try {
        const stats = await fs.stat(basePath);
        if (!stats.isDirectory()) {
          continue;
        }

        const pattern = join(basePath, "**/*.md");
        const matches = await glob(pattern, {
          ignore: this.ignorePatterns,
          absolute: true,
          nodir: true,
        });

        for (const filePath of matches) {
          if (this.shouldIgnore(filePath)) {
            continue;
          }

          const fileInfo = await this.getFileInfo(filePath, basePath);
          if (fileInfo) {
            files.push(fileInfo);
          }
        }
      } catch (error) {
        console.error(`Error scanning path ${basePath}:`, error);
      }
    }

    return files;
  }

  async getFileInfo(
    filePath: string,
    basePath?: string,
  ): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const sizeMb = stats.size / (1024 * 1024);

      if (sizeMb > this.maxFileSizeMb) {
        return null;
      }

      const content = await fs.readFile(filePath, "utf-8");
      const parsed = matter(content);
      const markdownContent = parsed.content;
      const frontmatter = parsed.data as Record<string, unknown>;

      const title =
        (typeof frontmatter.title === "string" ? frontmatter.title : null) ||
        this.extractTitleFromContent(markdownContent) ||
        this.getFileNameWithoutExt(filePath);

      const resolvedBasePath = basePath || this.findBasePath(filePath);
      const relativePath = relative(resolvedBasePath, filePath);

      return {
        path: filePath,
        relativePath,
        title,
        size: stats.size,
        modified: stats.mtime,
        content: markdownContent,
      };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  async readFile(relativePath: string): Promise<FileInfo | null> {
    for (const basePath of this.knowledgePaths) {
      const fullPath = resolve(basePath, relativePath);

      try {
        await fs.access(fullPath);
        return this.getFileInfo(fullPath, basePath);
      } catch {
        continue;
      }
    }

    return null;
  }

  private shouldIgnore(filePath: string): boolean {
    return this.ignorePatterns.some((pattern) =>
      minimatch(filePath, pattern, { matchBase: true }),
    );
  }

  private extractTitleFromContent(content: string): string | null {
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return trimmed.slice(2).trim();
      }
    }

    return null;
  }

  private getFileNameWithoutExt(filePath: string): string {
    const parts = filePath.split("/");
    const fileName = parts[parts.length - 1] || "";
    return fileName.replace(/\.md$/i, "");
  }

  private findBasePath(filePath: string): string {
    for (const basePath of this.knowledgePaths) {
      if (filePath.startsWith(basePath)) {
        return basePath;
      }
    }

    return this.knowledgePaths[0] || "";
  }
}
