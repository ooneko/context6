import type { FileInfo, SearchOptions, SearchResult } from "../types.js";

export interface ISearchEngine {
  index(files: FileInfo[]): Promise<void>;
  search(options: SearchOptions): Promise<SearchResult[]>;
  update(file: FileInfo): Promise<void>;
  remove(path: string): Promise<void>;
}

export abstract class BaseSearchEngine implements ISearchEngine {
  protected files: Map<string, FileInfo> = new Map();

  abstract index(files: FileInfo[]): Promise<void>;
  abstract search(options: SearchOptions): Promise<SearchResult[]>;
  abstract update(file: FileInfo): Promise<void>;
  abstract remove(path: string): Promise<void>;

  protected getFile(path: string): FileInfo | undefined {
    return this.files.get(path);
  }

  protected getAllFiles(): FileInfo[] {
    return Array.from(this.files.values());
  }
}
