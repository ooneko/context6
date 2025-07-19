# 配置知识库路径指南

Context6 MCP 支持多种方式配置知识库路径。

## 方法一：使用配置文件（推荐）

### 1. 创建配置文件

创建一个 JSON 配置文件（例如 `my-knowledge.json`）：

```json
{
  "knowledgePaths": [
    "~/Documents/notes",
    "~/Documents/obsidian",
    "~/Projects/docs",
    "/Users/username/my-notes"
  ],
  "ignorePatterns": [
    "node_modules/**",
    "*.tmp.md",
    ".obsidian/**",
    ".git/**",
    "**/.DS_Store",
    "**/drafts/**"
  ]
}
```

支持的路径格式：
- `~` 开头的路径会自动展开为用户主目录
- 相对路径会相对于当前工作目录
- 绝对路径直接使用

### 2. 在 Claude Desktop 中使用配置文件

编辑 Claude Desktop 配置文件：

```json
{
  "mcpServers": {
    "context6": {
      "command": "node",
      "args": [
        "/path/to/context6-mcp/dist/index.js",
        "--config",
        "/path/to/my-knowledge.json"
      ]
    }
  }
}
```

## 方法二：使用环境变量

### 1. 设置环境变量

在 Claude Desktop 配置中设置环境变量：

```json
{
  "mcpServers": {
    "context6": {
      "command": "node",
      "args": ["/path/to/context6-mcp/dist/index.js"],
      "env": {
        "CONTEXT6_CONFIG": "{\"knowledgePaths\": [\"~/Documents/notes\", \"~/Projects/docs\"]}"
      }
    }
  }
}
```

### 2. 或在系统中设置环境变量

```bash
export CONTEXT6_CONFIG='{"knowledgePaths": ["~/Documents/notes"]}'
```

## 方法三：修改默认配置

编辑 `src/config.ts` 中的默认配置，然后重新构建：

```typescript
export const DEFAULT_CONFIG: Config = {
  knowledgePaths: [
    resolve(homedir(), 'Documents', 'notes'),
    resolve(homedir(), 'Projects', 'docs'),
    // 添加你的默认路径
    '/path/to/your/notes',
  ],
  // ...
}
```

然后运行：
```bash
npm run build
```

## 配置优先级

如果同时使用多种配置方法，优先级如下：
1. 命令行参数 `--config` 指定的配置文件
2. 环境变量 `CONTEXT6_CONFIG`
3. 代码中的默认配置

## 配置选项说明

### knowledgePaths
- 类型：`string[]`
- 说明：要扫描的目录列表
- 示例：`["~/Documents/notes", "./docs"]`

### ignorePatterns
- 类型：`string[]`
- 说明：要忽略的文件模式（使用 glob 语法）
- 示例：`["**/*.tmp.md", "**/drafts/**"]`

### indexOptions
- `maxFileSizeMb`：最大文件大小（MB），默认 10
- `cacheEnabled`：是否启用缓存，默认 true
- `updateIntervalMs`：更新间隔（毫秒），默认 5000

### searchOptions
- `maxResults`：最大搜索结果数，默认 20
- `contextLength`：搜索结果上下文长度，默认 200
- `defaultMode`：默认搜索模式，可选 "keyword"

## 测试配置

使用测试脚本验证配置是否正确：

```bash
node test-server.js
```

或使用自定义配置：

```bash
node dist/index.js --config my-knowledge.json
```

## 常见问题

### 1. 找不到文件
- 确保路径存在且可访问
- 使用绝对路径避免相对路径问题
- 检查是否被 ignorePatterns 排除

### 2. 配置不生效
- 重启 Claude Desktop
- 检查 JSON 格式是否正确
- 查看控制台错误信息

### 3. 扫描速度慢
- 减少 knowledgePaths 数量
- 增加 ignorePatterns 排除不需要的文件
- 调整 maxFileSizeMb 限制大文件