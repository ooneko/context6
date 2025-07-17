# Local Knowledge MCP Server

一个强大的 MCP (Model Context Protocol) 服务器，用于搜索和访问本地 Markdown 知识库。支持关键词搜索和先进的语义搜索功能。

## ✨ 功能特性

### 🔍 多种搜索模式
- **关键词搜索**：传统的关键词匹配搜索
- **语义搜索**：基于 AI 嵌入的语义理解搜索
- **混合搜索**：结合关键词和语义搜索的优势（开发中）

### 🧠 智能语义搜索
- **多种嵌入提供者支持**：
  - 🏠 **本地嵌入**：使用 Transformers.js，无需网络连接
  - 🌐 **OpenAI 嵌入**：text-embedding-3-small/large 模型
  - 🔄 **Cohere 嵌入**：embed-english-v3.0 等模型
- **智能文档分块**：自动将长文档分割为有意义的片段
- **向量缓存**：支持嵌入向量的持久化存储
- **批量处理**：高效的批量文档索引

### 📁 文件管理
- **文件读取**：读取指定的 Markdown 文件内容
- **文件列表**：列出可用的 Markdown 文件
- **实时监控**：自动监控文件变化并更新索引
- **增量更新**：只重新索引变更的文件

## 安装

```bash
npm install
npm run build
```

## ⚙️ 配置

### 默认配置

默认配置会搜索以下目录：
- `~/Documents/notes`
- `~/Projects/docs`

### 自定义配置

创建配置文件来自定义搜索路径和搜索模式：

```json
{
  "knowledgePaths": [
    "/path/to/your/notes",
    "/path/to/your/docs"
  ],
  "searchOptions": {
    "defaultMode": "semantic",
    "maxResults": 20,
    "semantic": {
      "enabled": true,
      "provider": "local",
      "model": "Xenova/all-MiniLM-L6-v2",
      "cacheEmbeddings": true,
      "batchSize": 100
    }
  }
}
```

### 搜索模式配置

#### 关键词搜索（默认）
```json
{
  "searchOptions": {
    "defaultMode": "keyword"
  }
}
```

#### 本地语义搜索
```json
{
  "searchOptions": {
    "defaultMode": "semantic",
    "semantic": {
      "enabled": true,
      "provider": "local",
      "model": "Xenova/all-MiniLM-L6-v2",
      "cacheEmbeddings": true
    }
  }
}
```

#### OpenAI 语义搜索
```json
{
  "searchOptions": {
    "defaultMode": "semantic", 
    "semantic": {
      "enabled": true,
      "provider": "openai",
      "model": "text-embedding-3-small",
      "apiKey": "your-openai-api-key",
      "cacheEmbeddings": true
    }
  }
}
```

#### Cohere 语义搜索
```json
{
  "searchOptions": {
    "defaultMode": "semantic",
    "semantic": {
      "enabled": true,
      "provider": "cohere",
      "model": "embed-english-v3.0", 
      "apiKey": "your-cohere-api-key",
      "cacheEmbeddings": true
    }
  }
}
```

## 使用方法

### 在 Claude Desktop 中使用

1. 构建项目：
   ```bash
   npm run build
   ```

2. 在 Claude Desktop 配置文件中添加（通常位于 `~/Library/Application Support/Claude/claude_desktop_config.json`）：

   ```json
   {
     "mcpServers": {
       "local-knowledge": {
         "command": "node",
         "args": ["/path/to/local-knowledge-mcp/dist/index.js"]
       }
     }
   }
   ```

3. 重启 Claude Desktop

### 使用 MCP Inspector 测试

```bash
npm run inspector
```

## 🛠️ 可用工具

### search
智能搜索本地 Markdown 文件中的内容。根据配置自动选择搜索模式（关键词或语义搜索）。

**参数：**
- `query` (必需): 搜索查询
- `limit` (可选): 最大结果数，默认为 10
- `mode` (可选): 搜索模式 (`"keyword"` | `"semantic"`)

**示例：**
```javascript
// 使用默认搜索模式
await search({ query: "机器学习算法" });

// 强制使用语义搜索
await search({ query: "neural networks", mode: "semantic" });

// 限制结果数量
await search({ query: "配置", limit: 5 });
```

### read_file
读取指定 Markdown 文件的完整内容。

**参数：**
- `path` (必需): Markdown 文件的路径

### list_files
列出可用的 Markdown 文件。

**参数：**
- `directory` (可选): 要列出文件的目录

## 🚀 语义搜索优势

与传统关键词搜索相比，语义搜索提供：

- **概念匹配**：理解查询的含义，而不仅仅是关键词
- **多语言支持**：支持跨语言概念匹配
- **上下文理解**：考虑词汇的上下文语境
- **相关性排序**：基于语义相似度的智能排序

**示例对比：**

| 查询 | 关键词搜索 | 语义搜索 |
|------|------------|----------|
| "人工智能" | 只匹配包含"人工智能"的文档 | 匹配 AI、机器学习、深度学习等相关概念 |
| "troubleshooting" | 只匹配英文关键词 | 可以匹配"故障排除"、"问题解决"等中文内容 |
| "performance optimization" | 精确关键词匹配 | 理解性能、优化、提升效率等相关概念 |

## 开发

### 运行测试
```bash
npm test
```

### 运行 linter
```bash
npm run lint
```

### 监视模式
```bash
npm run watch
```

## 🏗️ 技术架构

### 核心技术栈
- **TypeScript** - 类型安全的开发体验
- **MCP SDK** - Model Context Protocol 集成
- **Jest** - 全面的测试框架（259 个测试）

### 搜索技术
- **关键词搜索** - 基于字符串匹配的快速搜索
- **语义搜索** - 基于向量嵌入的智能搜索
  - **Transformers.js** - 本地 AI 模型运行
  - **OpenAI Embeddings API** - 云端嵌入服务
  - **Cohere Embeddings API** - 多语言嵌入支持

### 向量处理
- **向量数学工具** - 余弦相似度、欧几里得距离
- **向量存储** - 内存和文件系统持久化
- **文档分块** - 智能文档分割和重叠处理

### 开发工具
- **ESLint** - 严格的代码质量检查
- **Prettier** - 代码格式化
- **Chokidar** - 文件监控（为未来实时更新准备）

## 📊 性能特点

- **高效索引**：增量更新，只处理变更文件
- **智能缓存**：向量嵌入持久化存储
- **批量处理**：优化的批量嵌入生成
- **内存优化**：智能的文档分块策略
- **类型安全**：完整的 TypeScript 类型检查

## 🧪 测试覆盖

项目包含 **259 个测试用例**，覆盖：
- 单元测试 - 所有核心组件
- 集成测试 - 端到端搜索流程
- 边缘情况测试 - 错误处理和边界条件
- 性能测试 - 大规模文档处理

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 运行特定测试文件
npm test -- semanticSearch.test.ts
```

## 🛣️ 开发路线图

- ✅ **Phase 1**: 基础架构和工厂模式
- ✅ **Phase 2**: 嵌入系统（本地/云端提供者）
- ✅ **Phase 3**: 语义搜索引擎
- 🚧 **Phase 4**: 混合搜索（关键词 + 语义）
- 📋 **Phase 5**: 性能优化和用户体验

## 🤝 贡献

欢迎贡献代码！请确保：
1. 运行 `npm test` 确保所有测试通过
2. 运行 `npm run lint` 确保代码质量
3. 添加适当的测试覆盖

## 📄 License

MIT