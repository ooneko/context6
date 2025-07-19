import { Context6Server } from "./src/server.js";
import { readFileSync } from "fs";
import type { Config } from "./src/types.js";

interface TestCase {
  name: string;
  query: string;
  expectedInResults: string[];
  mode: "keyword" | "semantic";
}

async function runTests() {
  console.log("🐠 启动语义搜索自动化测试...\n");

  // Load semantic config
  const configContent = readFileSync("./semantic-test-config.json", "utf-8");
  const config: Partial<Config> = JSON.parse(configContent);
  
  // Test cases
  const testCases: TestCase[] = [
    // Keyword search tests
    {
      name: "关键词搜索 - 精确匹配 'git'",
      query: "git",
      expectedInResults: ["git-commands.md"],
      mode: "keyword"
    },
    {
      name: "关键词搜索 - 精确匹配 'function'",
      query: "function",
      expectedInResults: ["javascript-basics.md"],
      mode: "keyword"
    },
    // Semantic search tests
    {
      name: "语义搜索 - 概念匹配 '版本控制'",
      query: "版本控制",
      expectedInResults: ["git-commands.md"],
      mode: "semantic"
    },
    {
      name: "语义搜索 - 同义词理解 'function'",
      query: "function",
      expectedInResults: ["javascript-basics.md"],
      mode: "semantic"
    },
    {
      name: "语义搜索 - 跨语言概念 '列表'",
      query: "列表",
      expectedInResults: ["python-tips.md"],
      mode: "semantic"
    },
    {
      name: "语义搜索 - 上下文理解 '代码复用'",
      query: "代码复用",
      expectedInResults: ["python-tips.md", "javascript-basics.md"],
      mode: "semantic"
    },
    {
      name: "语义搜索 - 技术概念 '字符串格式化'",
      query: "字符串格式化",
      expectedInResults: ["python-tips.md"],
      mode: "semantic"
    }
  ];

  // Create server instance
  const server = new Context6Server(config);
  
  console.log("⏳ 等待服务器初始化和文件索引...\n");
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log("🔍 开始执行测试用例...\n");
  
  const results: { passed: number; failed: number; details: any[] } = {
    passed: 0,
    failed: 0,
    details: []
  };

  for (const testCase of testCases) {
    try {
      console.log(`\n📝 测试: ${testCase.name}`);
      console.log(`   查询: "${testCase.query}"`);
      console.log(`   模式: ${testCase.mode}`);
      
      // Simulate search through the server's search engine
      const searchEngine = (server as any).searchEngine;
      const searchResults = await searchEngine.search({
        query: testCase.query,
        limit: 10
      });
      
      // Check if expected files are in results
      const foundFiles = searchResults.map((r: any) => 
        r.file.relativePath || r.file.path.split('/').pop()
      );
      
      const allExpectedFound = testCase.expectedInResults.every(expected =>
        foundFiles.some((found: string) => found.includes(expected))
      );
      
      if (allExpectedFound) {
        console.log(`   ✅ 通过 - 找到所有预期文件`);
        results.passed++;
      } else {
        console.log(`   ❌ 失败 - 未找到所有预期文件`);
        console.log(`   期望: ${testCase.expectedInResults.join(", ")}`);
        console.log(`   实际: ${foundFiles.slice(0, 3).join(", ")}`);
        results.failed++;
      }
      
      results.details.push({
        testCase,
        foundFiles,
        passed: allExpectedFound
      });
      
    } catch (error) {
      console.log(`   ❌ 错误: ${error}`);
      results.failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n📊 测试结果汇总:");
  console.log(`   ✅ 通过: ${results.passed}`);
  console.log(`   ❌ 失败: ${results.failed}`);
  console.log(`   📈 成功率: ${((results.passed / testCases.length) * 100).toFixed(1)}%`);
  
  // Cleanup
  await (server as any).searchEngine?.dispose?.();
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error("测试执行失败:", error);
  process.exit(1);
});