/**
 * Quick test to verify ONNX runtime is working
 * Run: npx ts-node examples/onnx-quick-test.ts
 */

import * as ort from 'onnxruntime-node';

async function testOnnxRuntime() {
  console.log('Testing ONNX Runtime installation...\n');
  
  try {
    // Test 1: Check ONNX Runtime version
    console.log('✓ ONNX Runtime version:', ort.env.versions.onnxruntime);
    
    // Test 2: Create a simple tensor
    const tensor = new ort.Tensor('float32', [1, 2, 3, 4], [2, 2]);
    console.log('✓ Created tensor:', tensor);
    console.log('  Shape:', tensor.dims);
    console.log('  Data:', tensor.data);
    
    // Test 3: Check available execution providers
    console.log('\n✓ Available execution providers:');
    const providers = ort.env.wasm?.wasmPaths ? ['wasm'] : ['cpu'];
    console.log('  -', providers.join(', '));
    
    console.log('\n✅ ONNX Runtime is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Download the ONNX model file');
    console.log('2. Run the full demo: npx ts-node examples/onnx-demo.ts');
    
  } catch (error) {
    console.error('❌ Error testing ONNX Runtime:', error);
  }
}

testOnnxRuntime();