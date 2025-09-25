import * as tf from '@tensorflow/tfjs-node';
import { BOARD_SIZE } from '../utils/constants.js';

/**
 * Create a demo neural network model for testing in Node.js
 */
export async function createDemoModelNode() {
  console.log('Creating demo model for Node.js...');

  console.log('TensorFlow.js version:', tf.version.tfjs);
  console.log('Backend:', tf.getBackend());

  // Create CNN model
  const inputShape = [BOARD_SIZE, BOARD_SIZE, 6];

  const input = tf.input({ shape: inputShape });

  // Convolutional layers
  let x = tf.layers.conv2d({
    filters: 32,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu'
  }).apply(input);

  x = tf.layers.conv2d({
    filters: 64,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu'
  }).apply(x);

  x = tf.layers.conv2d({
    filters: 128,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu'
  }).apply(x);

  // Global features
  const globalFeatures = tf.layers.flatten().apply(x);

  // Dense layers
  let features = tf.layers.dense({
    units: 256,
    activation: 'relu'
  }).apply(globalFeatures);

  features = tf.layers.dropout({ rate: 0.3 }).apply(features);

  features = tf.layers.dense({
    units: 128,
    activation: 'relu'
  }).apply(features);

  // Policy head - predicts move probabilities
  const policyHead = tf.layers.dense({
    units: BOARD_SIZE * BOARD_SIZE * BOARD_SIZE * BOARD_SIZE, // from-to positions
    activation: 'softmax',
    name: 'policy_head'
  }).apply(features);

  // Value head - evaluates position (-1 to 1)
  const valueHead = tf.layers.dense({
    units: 1,
    activation: 'tanh',
    name: 'value_head'
  }).apply(features);

  // Create model with two outputs
  const model = tf.model({
    inputs: input,
    outputs: [policyHead, valueHead]
  });

  // Compile model
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: {
      'policy_head': 'categoricalCrossentropy',
      'value_head': 'meanSquaredError'
    },
    lossWeights: {
      'policy_head': 1.0,
      'value_head': 0.5
    },
    metrics: ['accuracy']
  });

  const totalParams = model.trainableWeights
    .map(w => w.shape.reduce((a, b) => a * b, 1))
    .reduce((a, b) => a + b, 0);

  const modelSizeMB = (totalParams * 4) / (1024 * 1024);

  console.log('Model created:');
  console.log('- Parameters:', totalParams);
  console.log('- Size:', modelSizeMB.toFixed(2), 'MB');

  // Test inference
  const testInput = tf.randomNormal([1, 8, 8, 6]);
  console.log('\nTesting inference...');
  const startTime = Date.now();
  const [policy, value] = model.predict(testInput);
  const inferenceTime = Date.now() - startTime;

  const policyData = await policy.data();
  const valueData = await value.data();

  console.log('Inference test:');
  console.log('- Time:', inferenceTime, 'ms');
  console.log('- Policy shape:', policyData.length);
  console.log('- Value:', valueData[0]);

  // Cleanup
  testInput.dispose();
  policy.dispose();
  value.dispose();

  // Save model in Node.js format
  try {
    await model.save('file://./thai-checkers-demo-model');
    console.log('\n✅ Demo model saved to ./thai-checkers-demo-model/');
  } catch (error) {
    console.error('Failed to save model:', error);
  }

  return model;
}

// Run if executed directly
if (typeof window === 'undefined') {
  createDemoModelNode().catch(console.error);
}