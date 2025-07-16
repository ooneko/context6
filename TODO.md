# TODO.md

## Current Task
- [ ] Phase 3: 实现语义搜索引擎

## Completed
- [x] Phase 1: 基础架构
  - [x] 创建搜索引擎工厂
  - [x] 定义嵌入提供者接口
  - [x] 定义向量存储接口
  - [x] 实现向量数学工具
  - [x] 更新服务器使用工厂模式
  - [x] 所有测试通过

- [x] Phase 2: 实现嵌入系统（本地/API 提供者）
  - [x] 安装必要的依赖（transformers.js, openai, cohere-ai）
  - [x] 实现本地嵌入提供者（LocalEmbeddingProvider）
  - [x] 实现 OpenAI 嵌入提供者（OpenAIEmbeddingProvider）
  - [x] 实现 Cohere 嵌入提供者（CohereEmbeddingProvider）
  - [x] 实现内存向量存储（MemoryVectorStore）
  - [x] 实现文件系统向量存储（FileVectorStore）
  - [x] 编写完整的测试覆盖（219 个测试全部通过）
  - [ ] 添加嵌入缓存机制（可选优化，后续实现）

## Next Steps
- [ ] Phase 4: 实现混合搜索
- [ ] Phase 5: 集成和优化

## Phase 3 详细任务
- [ ] 创建 SemanticSearchEngine 类
- [ ] 实现文档索引功能（加载文档并生成嵌入）
- [ ] 实现查询功能（生成查询嵌入并搜索）
- [ ] 添加批量索引支持
- [ ] 实现索引持久化和加载
- [ ] 添加索引更新和删除功能
- [ ] 编写测试覆盖