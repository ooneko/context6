export interface FileInfo {
  path: string;
  relativePath: string;
  title: string;
  size: number;
  modified: Date;
  content?: string;
}

export interface SearchResult {
  file: FileInfo;
  score: number;
  matches: MatchContext[];
}

export interface MatchContext {
  line: number;
  text: string;
  start: number;
  end: number;
}

export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface SearchOptions {
  query: string;
  limit?: number;
  mode?: SearchMode;
  fuzzy?: boolean;
}

export interface Config {
  knowledgePaths: string[];
  ignorePatterns: string[];
  indexOptions: {
    maxFileSizeMb: number;
    cacheEnabled: boolean;
    updateIntervalMs: number;
  };
  searchOptions: {
    maxResults: number;
    contextLength: number;
    fuzzyThreshold: number;
    defaultMode: SearchMode;
    semantic?: {
      enabled: boolean;
      provider: "local" | "openai" | "cohere";
      model: string;
      apiKey?: string;
      cacheEmbeddings: boolean;
      batchSize: number;
    };
    hybrid?: {
      keywordWeight: number;
      semanticWeight: number;
    };
  };
}

export interface SearchEngine {
  index(files: FileInfo[]): Promise<void>;
  search(options: SearchOptions): Promise<SearchResult[]>;
  update(file: FileInfo): Promise<void>;
  remove(path: string): Promise<void>;
}
