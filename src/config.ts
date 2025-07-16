import type { Config } from "./types.js";
import { homedir } from "os";
import { resolve } from "path";

export const DEFAULT_CONFIG: Config = {
  knowledgePaths: [
    resolve(homedir(), "Documents", "notes"),
    resolve(homedir(), "Projects", "docs"),
  ],
  ignorePatterns: [
    "node_modules/**",
    "*.tmp.md",
    ".obsidian/**",
    ".git/**",
    "**/.DS_Store",
  ],
  indexOptions: {
    maxFileSizeMb: 10,
    cacheEnabled: true,
    updateIntervalMs: 5000,
  },
  searchOptions: {
    maxResults: 20,
    contextLength: 200,
    fuzzyThreshold: 0.6,
    defaultMode: "keyword",
    semantic: {
      enabled: false,
      provider: "local",
      model: "all-MiniLM-L6-v2",
      cacheEmbeddings: true,
      batchSize: 100,
    },
    hybrid: {
      keywordWeight: 0.7,
      semanticWeight: 0.3,
    },
  },
};

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function mergeConfig(partial: DeepPartial<Config>): Config {
  const config: Config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Config;

  if (partial.knowledgePaths && Array.isArray(partial.knowledgePaths)) {
    config.knowledgePaths = partial.knowledgePaths
      .filter((p): p is string => typeof p === "string")
      .map((p) =>
        p.startsWith("~") ? resolve(homedir(), p.slice(2)) : resolve(p),
      );
  }

  if (partial.ignorePatterns && Array.isArray(partial.ignorePatterns)) {
    config.ignorePatterns = partial.ignorePatterns.filter(
      (p): p is string => typeof p === "string",
    );
  }

  if (partial.indexOptions) {
    Object.assign(config.indexOptions, partial.indexOptions);
  }

  if (partial.searchOptions) {
    if (partial.searchOptions.maxResults !== undefined) {
      config.searchOptions.maxResults = partial.searchOptions.maxResults;
    }
    if (partial.searchOptions.contextLength !== undefined) {
      config.searchOptions.contextLength = partial.searchOptions.contextLength;
    }
    if (partial.searchOptions.fuzzyThreshold !== undefined) {
      config.searchOptions.fuzzyThreshold =
        partial.searchOptions.fuzzyThreshold;
    }
    if (partial.searchOptions.defaultMode !== undefined) {
      config.searchOptions.defaultMode = partial.searchOptions.defaultMode;
    }

    if (partial.searchOptions.semantic && config.searchOptions.semantic) {
      Object.assign(
        config.searchOptions.semantic,
        partial.searchOptions.semantic,
      );
    }

    if (partial.searchOptions.hybrid && config.searchOptions.hybrid) {
      Object.assign(config.searchOptions.hybrid, partial.searchOptions.hybrid);
    }
  }

  return config;
}

export function getConfig(partial?: DeepPartial<Config>): Config {
  if (!partial) {
    return DEFAULT_CONFIG;
  }
  return mergeConfig(partial);
}
