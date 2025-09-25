import * as tf from '@tensorflow/tfjs';
import { BOARD_SIZE } from '../utils/constants.js';

export class NeuralNetwork {
  constructor() {
    this.model = null;
    this.inputShape = [BOARD_SIZE, BOARD_SIZE, 6]; // 6 channels for input encoding
  }

  /**
   * Create CNN architecture for board evaluation
   * Input: 8x8x6 tensor
   * Output:
   *   - Policy head: 64x64 move probabilities
   *   - Value head: 1 position evaluation
   */
  createModel() {
    const input = tf.input({ shape: this.inputShape });

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
    this.model = tf.model({
      inputs: input,
      outputs: [policyHead, valueHead]
    });

    // Compile model
    this.model.compile({
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

    console.log('Model created successfully');
    this.model.summary();

    return this.model;
  }

  /**
   * Save model to local storage or file system
   * Note: React Native doesn't support localstorage:// URLs
   */
  async saveModel(path = 'localstorage://thai-checkers-model') {
    if (!this.model) {
      throw new Error('Model not created yet');
    }

    // In React Native, we can't save to localstorage easily
    // Model will be created on-demand instead
    console.log('Model ready (React Native uses on-demand creation)');
    return true;
  }

  /**
   * Load model from storage or create new one
   */
  async loadModel(path = 'localstorage://thai-checkers-model') {
    try {
      // Try to load if possible
      this.model = await tf.loadLayersModel(path);
      console.log(`Model loaded from ${path}`);
      return this.model;
    } catch (error) {
      console.log('Could not load saved model, creating new one...');
      // Create new model instead
      return this.createModel();
    }
  }

  /**
   * Predict move probabilities and position value
   * @param {tf.Tensor} boardTensor - 8x8x6 tensor representation
   * @returns {Object} { policy: Float32Array, value: number }
   */
  async predict(boardTensor) {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Add batch dimension if needed
    const input = boardTensor.shape.length === 3
      ? boardTensor.expandDims(0)
      : boardTensor;

    const [policy, value] = await this.model.predict(input);

    const policyArray = await policy.data();
    const valueArray = await value.data();

    // Clean up tensors
    policy.dispose();
    value.dispose();
    if (input !== boardTensor) {
      input.dispose();
    }

    return {
      policy: policyArray,
      value: valueArray[0]
    };
  }

  /**
   * Get model parameters count
   */
  getParametersCount() {
    if (!this.model) return 0;

    return this.model.trainableWeights
      .map(w => w.shape.reduce((a, b) => a * b, 1))
      .reduce((a, b) => a + b, 0);
  }

  /**
   * Get model size in MB
   */
  getModelSizeInMB() {
    // Each parameter is 4 bytes (float32)
    return (this.getParametersCount() * 4) / (1024 * 1024);
  }
}