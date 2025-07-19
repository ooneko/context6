#!/usr/bin/env node

import { Context6Server } from "./server.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Config } from "./types.js";

async function main(): Promise<void> {
  let config: Partial<Config> = {};

  // 优先检查环境变量（可以是文件路径或 JSON 内容）
  if (process.env.CONTEXT6_CONFIG) {
    const envValue = process.env.CONTEXT6_CONFIG;

    // 判断是文件路径还是 JSON 内容
    if (
      envValue.endsWith(".json") ||
      envValue.includes("/") ||
      envValue.includes("\\")
    ) {
      // 看起来像文件路径
      const configPath = resolve(envValue);
      try {
        const configContent = readFileSync(configPath, "utf-8");
        config = JSON.parse(configContent) as Partial<Config>;
        console.error(
          `Loaded config from environment variable file: ${configPath}`,
        );
      } catch (error) {
        console.error(`Failed to load config from ${configPath}:`, error);
        process.exit(1);
      }
    } else {
      // 尝试作为 JSON 内容解析
      try {
        const envConfig = JSON.parse(envValue) as Partial<Config>;
        config = envConfig;
        console.error("Loaded config from environment variable (JSON)");
      } catch (error) {
        console.error("Failed to parse CONTEXT6_CONFIG as JSON:", error);
        process.exit(1);
      }
    }
  } else {
    // 如果没有环境变量，再检查命令行参数
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
  }

  const server = new Context6Server(config);

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
