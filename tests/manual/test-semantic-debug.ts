#!/usr/bin/env node

import { FileService } from "./dist/fileService.js";
import { createSearchEngine } from "./dist/search/searchEngineFactory.js";
import { getConfig } from "./dist/config.js";
import { KeywordSearchEngine } from "./dist/search/keywordSearch.js";
import type { Config } from "./dist/types.js";
import { readFileSync } from "fs";

async function testSemanticSearchDebug() {
  console.log("🐠 开始调试语义搜索功能...\n");

  // 加载配置
  const configContent = readFileSync("./semantic-test-config.json", "utf-8");
  const partialConfig = JSON.parse(configContent) as Partial<Config>;
  const config = getConfig(partialConfig);
  
  console.log("📁 知识库路径:", config.knowledgePaths);
  console.log("🔍 搜索模式:", config.searchOptions.defaultMode);
  console.log("🤖 嵌入模型:", config.searchOptions.semantic?.model);
  console.log("🔧 嵌入提供者:", config.searchOptions.semantic?.provider);
  console.log("💾 缓存嵌入:", config.searchOptions.semantic?.cacheEmbeddings);
  console.log("");

  try {
    // 创建文件服务
    const fileService = new FileService(
      config.knowledgePaths,
      config.ignorePatterns,
      config.indexOptions.maxFileSizeMb
    );
    const files = await fileService.scanFiles();
    console.log(`✅ 扫描到 ${files.length} 个文档:`);
    files.forEach(file => {
      console.log(`   - ${file.relativePath} (${file.size} bytes)`);
    });
    console.log("");

    // 先测试关键词搜索作为对比
    console.log("📝 先测试关键词搜索（作为对比）...");
    const keywordEngine = new KeywordSearchEngine();
    await keywordEngine.index(files);
    
    const keywordResults = await keywordEngine.search({
      query: "git",
      limit: 3
    });
    
    console.log(`关键词搜索 "git" 找到 ${keywordResults.length} 个结果`);
    keywordResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.file.title} - 相关度: ${(result.score * 100).toFixed(1)}%`);
    });
    console.log("");

    // 创建语义搜索引擎
    console.log("🤖 创建语义搜索引擎...");
    const searchEngine = createSearchEngine(config);
    console.log(`引擎类型: ${searchEngine.constructor.name}`);
    
    console.log("\n⏳ 正在初始化语义搜索引擎并建立索引...");
    console.log("（首次运行需要下载模型，可能需要几分钟）");
    
    // 索引文件
    await searchEngine.index(files);
    console.log("✅ 索引建立完成\n");

    // 测试简单查询
    const testQuery = "git";
    console.log(`🔍 测试查询: "${testQuery}"`);
    
    try {
      const results = await searchEngine.search({
        query: testQuery,
        limit: 5
      });

      console.log(`找到 ${results.length} 个结果`);
      if (results.length === 0) {
        console.log("⚠️  语义搜索未返回任何结果");
        console.log("可能的原因：");
        console.log("1. 模型尚未下载完成");
        console.log("2. 嵌入生成失败");
        console.log("3. 向量索引为空");
      } else {
        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.file.title}`);
          console.log(`   相关度: ${(result.score * 100).toFixed(1)}%`);
        });
      }
    } catch (searchError) {
      console.error("搜索时出错:", searchError);
    }

    // 清理资源
    if ('dispose' in searchEngine && typeof searchEngine.dispose === 'function') {
      await searchEngine.dispose();
    }
    
  } catch (error) {
    console.error("❌ 测试失败:", error);
    if (error instanceof Error) {
      console.error("错误详情:", error.message);
      console.error("堆栈:", error.stack);
    }
    process.exit(1);
  }
}

// 运行测试
testSemanticSearchDebug().then(() => {
  console.log("\n✅ 调试完成！");
  process.exit(0);
}).catch(error => {
  console.error("测试执行错误:", error);
  process.exit(1);
});