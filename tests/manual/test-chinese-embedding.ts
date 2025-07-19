import { LocalEmbeddingProvider } from "../../src/embeddings/localEmbedding.js";
import type { LocalEmbeddingConfig } from "../../src/embeddings/localEmbedding.js";

async function testChineseEmbedding() {
  console.log("🚀 测试中文嵌入模型...\n");

  const config: LocalEmbeddingConfig = {
    model: "shibing624/text2vec-base-chinese",
    batchSize: 5,
  };

  const provider = new LocalEmbeddingProvider(config);

  try {
    // 测试单个中文文本
    console.log("📝 测试单个中文文本嵌入:");
    const text = "自然语言处理是人工智能的重要分支";
    const result = await provider.embed(text);
    
    console.log(`  文本: "${text}"`);
    console.log(`  嵌入维度: ${result.embedding.length}`);
    console.log(`  Token数: ${result.tokens}`);
    console.log(`  前5个值: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(", ")}]`);
    
    // 验证维度
    if (result.embedding.length !== 768) {
      throw new Error(`期望768维，实际${result.embedding.length}维`);
    }
    console.log("  ✅ 维度正确\n");

    // 测试批量中文文本
    console.log("📚 测试批量中文文本嵌入:");
    const texts = [
      "机器学习是实现人工智能的重要方法",
      "深度学习在图像识别领域取得重大突破",
      "自然语言处理技术广泛应用于搜索引擎",
      "知识图谱有助于理解实体间的关系",
      "语义搜索能够理解用户查询的真实意图"
    ];

    const batchResult = await provider.embedBatch(texts);
    
    console.log(`  批量大小: ${texts.length}`);
    console.log(`  生成嵌入数: ${batchResult.embeddings.length}`);
    console.log(`  总Token数: ${batchResult.totalTokens}`);
    
    // 验证每个嵌入
    for (let i = 0; i < batchResult.embeddings.length; i++) {
      const embedding = batchResult.embeddings[i];
      console.log(`  文本${i + 1}: "${texts[i]}"`);
      console.log(`    维度: ${embedding.length}, 前3个值: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(", ")}]`);
      
      if (embedding.length !== 768) {
        throw new Error(`文本${i + 1}期望768维，实际${embedding.length}维`);
      }
    }
    console.log("  ✅ 批量嵌入成功\n");

    // 测试语义相似度
    console.log("🔍 测试语义相似度:");
    const testPairs = [
      ["人工智能", "机器学习"],
      ["人工智能", "天气预报"],
      ["深度学习", "神经网络"],
      ["编程语言", "Python开发"]
    ];

    for (const [text1, text2] of testPairs) {
      const emb1 = await provider.embed(text1);
      const emb2 = await provider.embed(text2);
      
      // 计算余弦相似度
      const dotProduct = emb1.embedding.reduce((sum, val, i) => sum + val * emb2.embedding[i], 0);
      const magnitude1 = Math.sqrt(emb1.embedding.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(emb2.embedding.reduce((sum, val) => sum + val * val, 0));
      const similarity = dotProduct / (magnitude1 * magnitude2);
      
      console.log(`  "${text1}" vs "${text2}": 相似度 = ${similarity.toFixed(4)}`);
    }
    console.log("  ✅ 相似度计算成功\n");

    // 测试长文本截断
    console.log("📏 测试长文本处理:");
    const longText = "自然语言处理".repeat(200); // 创建超长文本
    const longResult = await provider.embed(longText);
    
    console.log(`  原始文本长度: ${longText.length} 字符`);
    console.log(`  嵌入维度: ${longResult.embedding.length}`);
    console.log(`  Token数: ${longResult.tokens}`);
    
    if (longResult.embedding.length !== 768) {
      throw new Error(`长文本期望768维，实际${longResult.embedding.length}维`);
    }
    console.log("  ✅ 长文本处理成功\n");

    console.log("✨ 所有测试通过！中文嵌入模型工作正常。");

  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  } finally {
    await provider.dispose();
  }
}

// 运行测试
testChineseEmbedding().catch(console.error);