# Local Knowledge MCP Server

一个强大的 MCP (Model Context Protocol) 服务器，用于搜索和访问本地 Markdown 知识库。支持关键词搜索和先进的语义搜索功能。

## 项目说明

这是一个 MCP (Model Context Protocol) 服务器，用于搜索和访问本地 Markdown 知识库。该项目参考了 context7 的设计理念，但专注于本地文件而非在线文档，为 AI 助手提供访问本地知识库的能力。

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

## 🚀 快速开始

### 系统要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤
```bash
# 克隆项目
git clone <repository-url>
cd local-knowledge-mcp

# 安装依赖
npm install

# 构建项目
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

2. 在 Claude Desktop 配置文件中添加：
   
   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   **Linux**: `~/.config/Claude/claude_desktop_config.json`

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

4. 验证集成：在 Claude 中输入 "使用 list_files 工具" 来测试是否正常工作

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

**示例：**
```javascript
// 读取特定文件
await read_file({ path: "git-commands.md" });
```

### list_files
列出可用的 Markdown 文件。

**参数：**
- `directory` (可选): 要列出文件的目录

**示例：**
```javascript
// 列出所有文件
await list_files();

// 列出特定目录的文件
await list_files({ directory: "~/Documents/notes" });
```

### 在 Claude 中使用示例

当集成到 Claude Desktop 后，可以这样使用：

```
使用 search 工具搜索 "git branch"
使用 list_files 工具查看所有文档
使用 read_file 工具读取 "git-commands.md"
```

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

## 🔧 开发指南

### 开发环境设置
```bash
# 克隆项目
git clone <repository-url>
cd local-knowledge-mcp

# 安装依赖
npm install

# 开发模式（自动重新编译）
npm run watch
```

### 开发命令
```bash
# 构建项目
npm run build

# 运行测试
npm test

# 代码质量检查
npm run lint        # ESLint 检查
npm run format      # Prettier 格式化

# 调试 MCP 通信
npm run inspector   # 使用 MCP Inspector 调试
```

### 添加新功能
1. **添加新的 MCP 工具**：
   - 在 `server.ts` 构造函数中定义工具
   - 在 `handleToolCall` 方法中添加处理逻辑
   - 更新 `src/types.ts` 中的类型定义
   - 添加相应的测试用例

2. **扩展搜索引擎**：
   - 继承 `SearchEngine` 抽象类
   - 在 `src/search/` 目录下实现新引擎
   - 更新配置以支持新的搜索模式

## 🏗️ 技术架构

### 项目结构
```
local-knowledge-mcp/
├── src/                     # 源代码
│   ├── index.ts            # CLI 入口，处理配置加载和服务器启动
│   ├── server.ts           # MCP 服务器实现，使用 StdioTransport
│   ├── fileService.ts      # 文件系统操作，处理 Markdown 文件
│   ├── config.ts           # 配置管理，支持深度合并
│   ├── types.ts            # TypeScript 类型定义
│   └── search/             # 搜索引擎实现
│       ├── searchEngine.ts # 搜索引擎抽象基类
│       ├── keywordSearch.ts # 关键词搜索实现
│       └── semanticSearch.ts # 语义搜索实现
├── tests/                   # 单元测试和集成测试
├── dist/                    # 编译输出
└── README.md               # 项目文档
```

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

### 数据流架构
```
Claude Desktop → StdioTransport → LocalKnowledgeServer → Tool Handlers
                                                              ↓
                                            FileService ← SearchEngine
```

### 配置加载优先级
1. 命令行 `--config` 参数
2. 环境变量 `LOCAL_KNOWLEDGE_CONFIG`
3. 默认配置 `src/config.ts`

### 文件处理特性
- 使用 `glob` 进行文件发现
- `gray-matter` 解析 Markdown frontmatter
- 智能标题提取：frontmatter > 第一个 # 标题 > 文件名
- 支持 `.gitignore` 风格的忽略模式

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

### 测试命令
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 运行特定测试文件
npm test -- semanticSearch.test.ts
```

### 核心功能测试结果
- ✅ **服务器初始化** - MCP 服务器正确启动和配置
- ✅ **关键词搜索** - 成功搜索文件内容和标题
- ✅ **语义搜索** - 基于向量相似度的智能搜索
- ✅ **文件列表** - 递归扫描和列出 Markdown 文件
- ✅ **文件读取** - 读取文件内容和提取元数据
- ✅ **配置管理** - 多层配置合并和验证
- ✅ **错误处理** - 优雅处理各种异常情况

## 🛣️ 开发路线图

### 已完成功能
- ✅ **基础架构** - MCP 服务器核心功能
- ✅ **文件扫描** - 递归扫描和索引 Markdown 文件
- ✅ **关键词搜索** - 快速文本匹配搜索
- ✅ **语义搜索** - 基于 AI 嵌入的智能搜索
- ✅ **多嵌入提供者** - 支持本地/OpenAI/Cohere
- ✅ **向量缓存** - 嵌入向量持久化存储

### 开发中功能
- 🚧 **混合搜索** - 结合关键词和语义搜索优势
- 🚧 **实时文件监控** - 自动更新索引

### 未来计划
- 📋 **更多文件格式** - 支持 .txt、.org 等格式
- 📋 **搜索历史** - 记录和管理搜索历史
- 📋 **收藏功能** - 收藏常用文档
- 📋 **性能优化** - 大规模知识库优化

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. **Fork 项目**并创建功能分支
2. **编写代码**时遵循现有代码风格
3. **添加测试**覆盖新功能
4. **运行检查**：
   ```bash
   npm run format     # 格式化代码
   npm run lint       # 代码质量检查
   npm test           # 运行所有测试
   ```
5. **提交 PR** 并描述你的更改

### 代码规范
- 使用 TypeScript 严格模式
- 保持 80% 以上的测试覆盖率
- 遵循 ESLint 和 Prettier 配置
- 为所有导出的函数添加 JSDoc 注释

## 📄 License

MIT