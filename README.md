# Local Knowledge MCP Server

一个 MCP (Model Context Protocol) 服务器，用于搜索和访问本地 Markdown 知识库。

## 功能

- **搜索功能**：在本地 Markdown 文件中搜索内容
- **文件读取**：读取指定的 Markdown 文件内容
- **文件列表**：列出可用的 Markdown 文件
- **实时监控**：自动监控文件变化并更新索引

## 安装

```bash
npm install
npm run build
```

## 配置

默认配置会搜索以下目录：
- `~/Documents/notes`
- `~/Projects/docs`

可以通过创建配置文件来自定义搜索路径。

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

## 可用工具

### search
搜索本地 Markdown 文件中的内容。

参数：
- `query` (必需): 搜索查询
- `limit` (可选): 最大结果数，默认为 10

### read_file
读取指定 Markdown 文件的完整内容。

参数：
- `path` (必需): Markdown 文件的路径

### list_files
列出可用的 Markdown 文件。

参数：
- `directory` (可选): 要列出文件的目录

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

## 技术栈

- TypeScript
- MCP SDK
- 关键词搜索（未来可扩展为语义搜索）
- 文件监控（chokidar）

## License

MIT