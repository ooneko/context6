# Context6 MCP 服务器需求文档

## 项目概述

创建一个类似 Context7 的 MCP（Model Context Protocol）服务器，但专注于搜索和提供本地 Markdown 文件内容，使 AI 助手能够访问用户的本地知识库。

## 背景与动机

- **Context7** 是一个 MCP 服务器，用于动态注入在线文档到 AI 上下文
- **本项目目标** 是让 AI 能够访问和搜索用户的本地 Markdown 知识库
- **使用场景**：个人笔记、技术文档、项目文档、知识管理系统

## 核心功能需求

### 1. 文件索引与管理

- **扫描指定目录**：递归扫描配置的目录中的所有 `.md` 文件
- **文件索引**：建立文件路径、标题、内容的索引
- **增量更新**：监听文件变化，自动更新索引
- **忽略模式**：支持 `.gitignore` 风格的忽略规则

### 2. MCP Tools（工具）

#### 2.1 `search`
- **功能**：搜索 Markdown 文件内容（支持关键词和语义搜索）
- **参数**：
  - `query`: 搜索关键词（必需）
  - `limit`: 返回结果数量限制（默认 10）
  - `mode`: 搜索模式 - "keyword" | "semantic" | "hybrid"（默认 "keyword"）
  - `fuzzy`: 是否启用模糊搜索（默认 true，仅关键词模式）
- **返回**：匹配的文件列表，包含文件路径、标题、匹配片段、相关度分数

#### 2.2 `read_file`
- **功能**：读取指定 Markdown 文件的完整内容
- **参数**：
  - `path`: 文件相对路径（必需）
- **返回**：文件内容、元数据（如 frontmatter）

#### 2.3 `list_files`
- **功能**：列出所有可用的 Markdown 文件
- **参数**：
  - `pattern`: 文件名模式匹配（可选）
  - `sort`: 排序方式（name/date/size）
- **返回**：文件列表，包含路径、大小、修改时间

### 3. MCP Resources（资源）

- **`knowledge://index`**：返回所有文件的索引信息
- **`knowledge://file/{path}`**：返回特定文件的内容
- **`knowledge://recent`**：返回最近修改的文件列表

## 技术架构

### 技术栈
- **语言**：TypeScript
- **框架**：MCP TypeScript SDK
- **搜索引擎**：
  - **关键词搜索**：flexsearch（快速、轻量）
  - **语义搜索**（可选）：
    - 本地方案：ONNX Runtime + all-MiniLM-L6-v2
    - 远程方案：OpenAI Embeddings API / Cohere API
- **向量存储**（可选）：hnswlib-node 或 vectra
- **文件监听**：chokidar

### 项目结构
```
context6-mcp/
├── src/
│   ├── index.ts              # MCP 服务器主入口
│   ├── fileService.ts        # 文件系统操作服务
│   ├── search/
│   │   ├── keywordSearch.ts  # 关键词搜索实现
│   │   ├── semanticSearch.ts # 语义搜索实现（可选）
│   │   ├── hybridSearch.ts   # 混合搜索策略
│   │   └── searchEngine.ts   # 搜索引擎接口
│   ├── indexer.ts            # 文件索引器
│   ├── embeddings/           # 向量化相关（可选）
│   │   ├── embeddingProvider.ts
│   │   └── vectorStore.ts
│   ├── config.ts             # 配置管理
│   └── types.ts              # TypeScript 类型定义
├── tests/                    # 测试文件
├── docs/                     # 文档
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## 配置选项

```json
{
  "knowledge_paths": [
    "~/Documents/notes",
    "~/Projects/docs"
  ],
  "ignore_patterns": [
    "node_modules/**",
    "*.tmp.md",
    ".obsidian/**"
  ],
  "index_options": {
    "max_file_size_mb": 10,
    "cache_enabled": true,
    "update_interval_ms": 5000
  },
  "search_options": {
    "max_results": 20,
    "context_length": 200,
    "fuzzy_threshold": 0.6,
    "default_mode": "keyword",
    "semantic": {
      "enabled": false,
      "provider": "local",
      "model": "all-MiniLM-L6-v2",
      "api_key": "",
      "cache_embeddings": true,
      "batch_size": 100
    },
    "hybrid": {
      "keyword_weight": 0.7,
      "semantic_weight": 0.3
    }
  }
}
```

## 性能要求

### 关键词搜索模式
- **启动时间**：< 5 秒（1000 个文件）
- **搜索响应**：< 50ms（10000 个文件）
- **内存占用**：< 200MB（10000 个文件）
- **索引更新**：增量更新，不阻塞主进程

### 语义搜索模式（可选）
- **首次索引**：< 30 秒（1000 个文件，本地模型）
- **搜索响应**：< 200ms（包含向量计算）
- **内存占用**：< 500MB（包含模型和向量存储）
- **Embedding 缓存**：持久化存储，避免重复计算

## 安全要求

- **路径验证**：防止路径遍历攻击
- **权限控制**：只能访问配置的目录
- **文件大小限制**：防止读取超大文件导致内存溢出
- **内容过滤**：可选过滤敏感信息

## 错误处理

- **文件不存在**：返回清晰的错误信息
- **权限拒绝**：提示用户检查文件权限
- **编码错误**：尝试多种编码，提供降级方案
- **索引损坏**：自动重建索引

## 扩展性设计

### 第一阶段（MVP）
- 基本的关键词搜索和文件读取
- 内存索引 + flexsearch
- 支持单个知识库目录
- 基础配置选项

### 第二阶段
- 文件变化监听（chokidar）
- 持久化索引
- 支持多个知识库目录
- Frontmatter 解析
- 语义搜索基础架构（接口预留）

### 第三阶段
- 完整语义搜索实现
- 混合搜索模式
- 向量存储和缓存
- 支持更多文件格式（.txt, .rst）
- 高级搜索功能（正则、标签、日期范围）

## 测试要求

- **单元测试**：核心功能覆盖率 > 80%
- **集成测试**：MCP 协议兼容性测试
- **性能测试**：大量文件场景测试
- **边界测试**：空目录、超大文件、特殊字符

## 交付标准

1. **功能完整**：所有 P0 功能实现并测试通过
2. **文档完善**：README、API 文档、配置说明
3. **代码质量**：TypeScript 严格模式，ESLint 无错误
4. **可用性**：提供 Claude Desktop 配置示例
5. **性能达标**：满足性能要求指标

## 时间计划

- **第 1 天**：项目初始化，基础架构搭建
- **第 2-3 天**：实现核心功能（搜索、读取）
- **第 4 天**：完善功能，错误处理
- **第 5 天**：测试、文档、集成配置

## 成功标准

- 用户能够通过 Claude 搜索本地 Markdown 文件
- 搜索结果准确且响应快速
- 能够读取完整文件内容供 AI 分析
- 配置简单，易于使用