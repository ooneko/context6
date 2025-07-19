#!/usr/bin/env node

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

console.log(`${colors.blue}🧪 Running all manual tests...${colors.reset}\n`);

// Define test scripts and their descriptions
const tests = [
  {
    name: 'test-server.js',
    description: 'Basic server functionality test',
    skip: false
  },
  {
    name: 'run-semantic-test.ts',
    description: 'Semantic search test runner',
    skip: false
  },
  {
    name: 'test-semantic-automated.ts',
    description: 'Automated semantic search tests',
    skip: false
  },
  {
    name: 'test-semantic-debug.ts',
    description: 'Semantic search debugging',
    skip: false
  },
  {
    name: 'test-hybrid-search.ts',
    description: 'Hybrid search testing',
    skip: false
  },
  {
    name: 'test-chinese-embedding.js',
    description: 'Chinese text embedding with text2vec model',
    skip: false
  }
];

async function runTest(testFile, description) {
  console.log(`${colors.yellow}▶ Running: ${testFile}${colors.reset}`);
  console.log(`  ${colors.gray}${description}${colors.reset}`);
  
  return new Promise((resolve) => {
    const extension = testFile.endsWith('.ts') ? 'ts' : 'js';
    const command = extension === 'ts' ? 'tsx' : 'node';
    
    const child = spawn(command, [join(__dirname, testFile)], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}✓ ${testFile} completed successfully${colors.reset}\n`);
      } else {
        console.log(`${colors.red}✗ ${testFile} failed with code ${code}${colors.reset}\n`);
      }
      resolve(code);
    });
  });
}

async function runAllTests() {
  const results = [];
  
  for (const test of tests) {
    if (test.skip) {
      console.log(`${colors.gray}⏭  Skipping: ${test.name}${colors.reset}\n`);
      continue;
    }
    
    const code = await runTest(test.name, test.description);
    results.push({ name: test.name, code });
  }
  
  // Summary
  console.log(`${colors.blue}📊 Test Summary:${colors.reset}`);
  const passed = results.filter(r => r.code === 0).length;
  const failed = results.filter(r => r.code !== 0).length;
  
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed > 0) {
    console.log(`\n${colors.red}Failed tests:${colors.reset}`);
    results.filter(r => r.code !== 0).forEach(r => {
      console.log(`  - ${r.name}`);
    });
    process.exit(1);
  } else {
    console.log(`\n${colors.green}All tests passed! 🎉${colors.reset}`);
    process.exit(0);
  }
}

// Check if tsx is available for TypeScript files
import { execSync } from 'child_process';
try {
  execSync('which tsx', { stdio: 'ignore' });
} catch (error) {
  console.log(`${colors.yellow}Warning: tsx not found. Installing tsx for TypeScript support...${colors.reset}`);
  try {
    execSync('npm install -g tsx', { stdio: 'inherit' });
  } catch (installError) {
    console.error(`${colors.red}Failed to install tsx. TypeScript tests will be skipped.${colors.reset}`);
    tests.forEach(test => {
      if (test.name.endsWith('.ts')) {
        test.skip = true;
      }
    });
  }
}

runAllTests().catch(console.error);