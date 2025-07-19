/**
 * ONNX Runtime Demo for text2vec-base-chinese
 * 
 * This demo validates that we can:
 * 1. Load ONNX models with onnxruntime-node
 * 2. Use tokenizers from @xenova/transformers
 * 3. Generate embeddings compatible with sentence-transformers
 * 
 * Usage:
 * 1. First install dependencies: npm install onnxruntime-node
 * 2. Download or convert the ONNX model (see instructions below)
 * 3. Run: npx ts-node examples/onnx-demo.ts
 */

import * as ort from 'onnxruntime-node';
import { AutoTokenizer } from '@xenova/transformers';
import * as path from 'path';
import * as fs from 'fs/promises';

async function meanPooling(
  tokenEmbeddings: Float32Array,
  attentionMask: number[],
  shape: number[]
): Promise<Float32Array> {
  const [batchSize, seqLen, hiddenSize] = shape;
  const pooled = new Float32Array(batchSize * hiddenSize);

  for (let b = 0; b < batchSize; b++) {
    for (let h = 0; h < hiddenSize; h++) {
      let sum = 0;
      let count = 0;
      for (let s = 0; s < seqLen; s++) {
        const maskValue = attentionMask[b * seqLen + s];
        if (maskValue > 0) {
          sum += tokenEmbeddings[b * seqLen * hiddenSize + s * hiddenSize + h];
          count += maskValue;
        }
      }
      pooled[b * hiddenSize + h] = count > 0 ? sum / count : 0;
    }
  }

  return pooled;
}

function normalize(vector: Float32Array): Float32Array {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / (norm || 1));
}

async function generateEmbedding(text: string, modelPath: string): Promise<Float32Array> {
  console.log('Loading tokenizer...');
  const tokenizer = await AutoTokenizer.from_pretrained('shibing624/text2vec-base-chinese');
  
  console.log('Tokenizing text:', text);
  const encoded = await tokenizer(text, {
    padding: true,
    truncation: true,
    max_length: 512,
    return_tensors: false
  });

  console.log('Creating ONNX tensors...');
  const inputIds = new ort.Tensor('int64', 
    BigInt64Array.from(encoded.input_ids.map((id: number) => BigInt(id))), 
    [1, encoded.input_ids.length]
  );
  
  const attentionMask = new ort.Tensor('int64',
    BigInt64Array.from(encoded.attention_mask.map((mask: number) => BigInt(mask))),
    [1, encoded.attention_mask.length]
  );

  console.log('Loading ONNX model from:', modelPath);
  const session = await ort.InferenceSession.create(modelPath);
  
  console.log('Running inference...');
  const feeds = {
    input_ids: inputIds,
    attention_mask: attentionMask
  };
  
  const results = await session.run(feeds);
  
  // Get the last hidden state
  const lastHiddenState = results.last_hidden_state || results.output;
  const embeddings = lastHiddenState.data as Float32Array;
  
  console.log('Applying mean pooling...');
  const pooled = await meanPooling(
    embeddings,
    encoded.attention_mask,
    lastHiddenState.dims as number[]
  );
  
  console.log('Normalizing vector...');
  const normalized = normalize(pooled);
  
  return normalized;
}

async function cosineSimilarity(vec1: Float32Array, vec2: Float32Array): Promise<number> {
  let dotProduct = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  return dotProduct;
}

async function main() {
  // Note: You need to download the ONNX model first
  // The model can be downloaded from Hugging Face or converted from PyTorch
  const modelPath = path.join(process.cwd(), 'models', 'text2vec-base-chinese.onnx');
  
  // Check if model exists
  try {
    await fs.access(modelPath);
  } catch {
    console.error(`
Model not found at: ${modelPath}

Please download the ONNX model first:

Option 1: Convert from PyTorch using optimum
  pip install optimum[exporters] sentence-transformers
  optimum-cli export onnx --model shibing624/text2vec-base-chinese models/text2vec-base-chinese

Option 2: Download pre-converted ONNX model
  Download the model_qint8_avx512_vnni.onnx file from Hugging Face and place it in the models/ directory

Option 3: Use Python to export specific ONNX format
  from optimum.onnxruntime import ORTModelForFeatureExtraction
  model = ORTModelForFeatureExtraction.from_pretrained(
    "shibing624/text2vec-base-chinese", 
    export=True,
    provider="CPUExecutionProvider"
  )
  model.save_pretrained("models/text2vec-base-chinese")
`);
    process.exit(1);
  }

  try {
    console.log('=== ONNX Embedding Demo ===\n');
    
    const texts = [
      '今天天气真好',
      '今天天气不错',
      '机器学习是人工智能的一个分支'
    ];
    
    const embeddings: Float32Array[] = [];
    
    for (const text of texts) {
      console.log(`\nProcessing: "${text}"`);
      const embedding = await generateEmbedding(text, modelPath);
      embeddings.push(embedding);
      console.log(`Embedding shape: [${embedding.length}]`);
      console.log(`First 5 values: [${Array.from(embedding.slice(0, 5)).map(v => v.toFixed(4)).join(', ')}]`);
    }
    
    console.log('\n=== Similarity Scores ===');
    console.log(`"${texts[0]}" vs "${texts[1]}": ${(await cosineSimilarity(embeddings[0], embeddings[1])).toFixed(4)}`);
    console.log(`"${texts[0]}" vs "${texts[2]}": ${(await cosineSimilarity(embeddings[0], embeddings[2])).toFixed(4)}`);
    console.log(`"${texts[1]}" vs "${texts[2]}": ${(await cosineSimilarity(embeddings[1], embeddings[2])).toFixed(4)}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}