#!/usr/bin/env node

import { LocalKnowledgeServer } from "./server.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Config } from "./types.js";

async function main(): Promise<void> {
  let config: Partial<Config> = {};

  // 检查命令行参数中的配置文件路径
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");

  if (configIndex !== -1 && configIndex + 1 < args.length) {
    const configFile = args[configIndex + 1];
    if (!configFile) {
      console.error("Config file path not provided");
      process.exit(1);
    }
    const configPath = resolve(configFile);
    try {
      const configContent = readFileSync(configPath, "utf-8");
      config = JSON.parse(configContent) as Partial<Config>;
      console.error(`Loaded config from: ${configPath}`);
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
      process.exit(1);
    }
  }

  // 也支持环境变量
  if (process.env.LOCAL_KNOWLEDGE_CONFIG) {
    try {
      const envConfig = JSON.parse(
        process.env.LOCAL_KNOWLEDGE_CONFIG,
      ) as Partial<Config>;
      config = { ...config, ...envConfig };
      console.error("Loaded config from environment variable");
    } catch (error) {
      console.error("Failed to parse LOCAL_KNOWLEDGE_CONFIG:", error);
    }
  }

  const server = new LocalKnowledgeServer(config);

  process.on("SIGINT", () => {
    console.error("Shutting down...");
    process.exit(0);
  });

  try {
    await server.run();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
