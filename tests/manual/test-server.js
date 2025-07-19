#!/usr/bin/env node

import { LocalKnowledgeServer } from './dist/server.js';
import { readFileSync } from 'fs';

// 读取测试配置
const testConfig = JSON.parse(readFileSync('./test-config.json', 'utf-8'));

console.log('创建 Local Knowledge MCP 服务器测试...\n');

async function testServer() {
  try {
    // 创建服务器实例
    const server = new LocalKnowledgeServer(testConfig);
    
    // 初始化服务器
    console.log('1. 初始化服务器...');
    await server.initialize();
    console.log('✓ 服务器初始化成功\n');
    
    // 测试搜索功能
    console.log('2. 测试搜索功能...');
    const searchResults = await server.handleSearch({ query: 'python', limit: 5 });
    console.log('搜索 "python" 的结果:');
    searchResults.content.forEach(item => {
      console.log(item.text.substring(0, 200) + '...\n');
    });
    
    // 测试列出文件
    console.log('3. 测试列出文件功能...');
    const fileList = await server.handleListFiles({});
    console.log('文件列表:');
    console.log(fileList.content[0].text + '\n');
    
    // 测试读取文件
    console.log('4. 测试读取文件功能...');
    const fileContent = await server.handleReadFile({ path: './test-knowledge-base/git-commands.md' });
    console.log('读取 git-commands.md:');
    console.log(fileContent.content[0].text.substring(0, 200) + '...\n');
    
    console.log('✅ 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 直接调用测试函数
testServer();