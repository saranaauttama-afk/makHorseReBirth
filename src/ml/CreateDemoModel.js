import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { NeuralNetwork } from './NeuralNetwork.js';

/**
 * Create a demo neural network model for testing
 * This creates an untrained model that can be used in the app
 */
export async function createDemoModel() {
  console.log('Creating demo model...');

  // Initialize TensorFlow.js
  await tf.ready();
  console.log('TensorFlow.js ready, backend:', tf.getBackend());

  // Create the neural network
  const nn = new NeuralNetwork();
  const model = nn.createModel();

  console.log('Model created:');
  console.log('- Parameters:', nn.getParametersCount());
  console.log('- Size:', nn.getModelSizeInMB().toFixed(2), 'MB');

  // Save model for use in the app (React Native doesn't support localstorage save)
  try {
    // For React Native, we'll create the model on-demand instead of saving
    console.log('Model ready for use (will be created on-demand)');
  } catch (error) {
    console.error('Model initialization error:', error);
  }

  return nn;
}

// Function to create and immediately test the model
export async function testDemoModel() {
  const nn = await createDemoModel();

  // Create a test input
  const testInput = tf.randomNormal([1, 8, 8, 6]);

  console.log('\nTesting inference...');
  const startTime = Date.now();
  const prediction = await nn.predict(testInput);
  const inferenceTime = Date.now() - startTime;

  console.log('Inference successful:');
  console.log('- Time:', inferenceTime, 'ms');
  console.log('- Policy shape:', prediction.policy.length);
  console.log('- Value:', prediction.value);

  // Cleanup
  testInput.dispose();

  return nn;
}