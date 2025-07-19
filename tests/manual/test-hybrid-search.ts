#!/usr/bin/env node
import { Context6Server } from "./dist/server.js";
import { getConfig } from "./dist/config.js";

async function testHybridSearch() {
  console.log("🧪 Testing Hybrid Search Feature\n");

  // Create server with semantic search enabled
  const config = getConfig({
    searchOptions: {
      defaultMode: "hybrid",
      semantic: {
        enabled: true,
        provider: "local",
        model: "Xenova/all-MiniLM-L6-v2",
      },
      hybrid: {
        keywordWeight: 0.7,
        semanticWeight: 0.3,
      },
    },
  });

  const server = new Context6Server(config);

  // Initialize the server (load files)
  await server.initialize();

  console.log("✅ Server initialized\n");

  // Test different search modes
  const testQueries = [
    { query: "git branch", mode: "keyword" as const },
    { query: "version control", mode: "semantic" as const },
    { query: "code management", mode: "hybrid" as const },
  ];

  for (const { query, mode } of testQueries) {
    console.log(`\n📝 Testing ${mode} search for: "${query}"`);
    console.log("─".repeat(50));

    try {
      const result = await server["handleSearch"]({ query, mode, limit: 3 });
      
      if (result.content.length === 0) {
        console.log("No results found");
      } else {
        result.content.forEach((item, index) => {
          console.log(`\nResult ${index + 1}:`);
          console.log(item.text);
        });
      }
    } catch (error) {
      console.error(`Error during ${mode} search:`, error);
    }
  }

  console.log("\n✅ Hybrid search test completed!");
}

// Run the test
testHybridSearch().catch(console.error);