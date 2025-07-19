import { LocalEmbeddingProvider } from '../../dist/embeddings/localEmbedding.js';

async function testChineseEmbedding() {
  console.log('测试中文语义嵌入...\n');

  // 创建本地嵌入提供者，使用多语言模型（支持中文）
  // 备选方案：
  // - 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' (多语言，384维)
  // - 'Xenova/distiluse-base-multilingual-cased-v2' (多语言，512维)
  // - 'Xenova/all-MiniLM-L6-v2' (英文为主，但也支持基础中文)
  const embeddingProvider = new LocalEmbeddingProvider({
    model: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    batchSize: 100
  });

  try {
    // 测试单个文本嵌入
    console.log('1. 测试单个文本嵌入：');
    const text1 = '如何更换花呗绑定银行卡';
    const result1 = await embeddingProvider.embed(text1);
    console.log(`   文本: "${text1}"`);
    console.log(`   嵌入维度: ${result1.embedding.length}`);
    console.log(`   前5个值: [${result1.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   Token数: ${result1.tokens}\n`);

    // 测试批量嵌入
    console.log('2. 测试批量嵌入：');
    const texts = [
      '如何更换花呗绑定银行卡',
      '花呗更改绑定银行卡',
      '今天天气真不错',
      '机器学习是人工智能的一个分支'
    ];
    
    const batchResult = await embeddingProvider.embedBatch(texts);
    console.log(`   批量大小: ${texts.length}`);
    console.log(`   返回嵌入数: ${batchResult.embeddings.length}`);
    console.log(`   总Token数: ${batchResult.totalTokens}\n`);

    // 计算相似度
    console.log('3. 计算语义相似度：');
    const cosineSimilarity = (vec1, vec2) => {
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;
      
      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
      }
      
      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    };

    // 计算相似度矩阵
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = cosineSimilarity(
          batchResult.embeddings[i],
          batchResult.embeddings[j]
        );
        console.log(`   "${texts[i]}" <-> "${texts[j]}"`);
        console.log(`   相似度: ${similarity.toFixed(4)}\n`);
      }
    }

    // 测试模型信息
    console.log('4. 模型信息：');
    console.log(`   嵌入维度: ${embeddingProvider.getDimension()}`);
    console.log(`   最大文本长度: ${embeddingProvider.getMaxTextLength()}`);
    console.log(`   模型就绪: ${await embeddingProvider.isReady()}`);

    // 清理资源
    await embeddingProvider.dispose();
    console.log('\n✅ 中文语义嵌入测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testChineseEmbedding().catch(console.error);