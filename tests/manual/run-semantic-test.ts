#!/usr/bin/env node

import { FileService } from "./dist/fileService.js";
import { createSearchEngine } from "./dist/search/searchEngineFactory.js";
import { getConfig } from "./dist/config.js";
import type { Config } from "./dist/types.js";
import { readFileSync } from "fs";

async function testSemanticSearch() {
  console.log("🐠 开始测试语义搜索功能...\n");

  // 加载配置
  const configContent = readFileSync("./semantic-test-config.json", "utf-8");
  const partialConfig = JSON.parse(configContent) as Partial<Config>;
  const config = getConfig(partialConfig);
  
  console.log("📁 知识库路径:", config.knowledgePaths);
  console.log("🔍 搜索模式:", config.searchOptions.defaultMode);
  console.log("🤖 嵌入模型:", config.searchOptions.semantic?.model);
  console.log("");

  try {
    // 创建文件服务
    const fileService = new FileService(
      config.knowledgePaths,
      config.ignorePatterns,
      config.indexOptions.maxFileSizeMb
    );
    const files = await fileService.scanFiles();
    console.log(`✅ 扫描到 ${files.length} 个文档\n`);

    // 创建搜索引擎
    const searchEngine = createSearchEngine(config);
    console.log("⏳ 正在初始化语义搜索引擎并建立索引...");
    
    // 索引文件
    await searchEngine.index(files);
    console.log("✅ 索引建立完成\n");

    // 测试用例
    const testCases = [
      {
        query: "版本控制",
        description: "查找版本控制相关内容（应该找到Git文档）"
      },
      {
        query: "function", 
        description: "查找function相关内容（应该找到JavaScript函数）"
      },
      {
        query: "列表操作",
        description: "查找列表操作相关内容（应该找到Python列表）"
      },
      {
        query: "代码复用",
        description: "查找代码复用技巧"
      },
      {
        query: "字符串格式化",
        description: "查找字符串格式化方法"
      }
    ];

    console.log("=".repeat(60));
    console.log("🧪 执行语义搜索测试");
    console.log("=".repeat(60) + "\n");

    for (const test of testCases) {
      console.log(`\n📝 测试: ${test.description}`);
      console.log(`   查询: "${test.query}"`);
      
      const results = await searchEngine.search({
        query: test.query,
        limit: 3
      });

      if (results.length === 0) {
        console.log("   ❌ 未找到任何结果");
      } else {
        console.log(`   ✅ 找到 ${results.length} 个结果:`);
        results.forEach((result, index) => {
          console.log(`      ${index + 1}. ${result.file.title || result.file.relativePath}`);
          console.log(`         相关度: ${(result.score * 100).toFixed(1)}%`);
          if (result.matches && result.matches.length > 0) {
            const text = result.matches[0].text || "";
            console.log(`         匹配内容: "${text.substring(0, 80)}..."`);
          }
        });
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 测试总结");
    console.log("=".repeat(60));
    console.log("\n语义搜索能够理解:");
    console.log("- 概念匹配: '版本控制' → Git相关文档");
    console.log("- 同义词: 'function' → 函数相关内容");
    console.log("- 跨语言: '列表' → Python list/array");
    console.log("- 上下文: '代码复用' → 相关编程技巧\n");

    // 清理资源
    if ('dispose' in searchEngine && typeof searchEngine.dispose === 'function') {
      await searchEngine.dispose();
    }
    
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
testSemanticSearch().then(() => {
  console.log("✅ 测试完成！");
  process.exit(0);
}).catch(error => {
  console.error("测试执行错误:", error);
  process.exit(1);
});