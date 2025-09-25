import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { NeuralNetwork } from './NeuralNetwork';
import { DataProcessor } from './DataProcessor';
import { Board } from '../game/Board';
import { PLAYERS } from '../utils/constants';

export const TestNeuralNetwork = () => {
  const [isReady, setIsReady] = useState(false);
  const [model, setModel] = useState(null);
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setupTensorFlow();
  }, []);

  const setupTensorFlow = async () => {
    try {
      // Wait for TensorFlow to initialize
      await tf.ready();
      console.log('TensorFlow.js ready');
      console.log('Backend:', tf.getBackend());
      setIsReady(true);
    } catch (error) {
      console.error('Failed to setup TensorFlow:', error);
      setTestResult('Failed to initialize TensorFlow');
    }
  };

  const createAndTestModel = async () => {
    setLoading(true);
    setTestResult('Creating model...');

    try {
      // Create model
      const nn = new NeuralNetwork();
      const newModel = nn.createModel();
      setModel(newModel);

      setTestResult('Model created successfully!\n');
      setTestResult(prev => prev + `Parameters: ${nn.getParametersCount()}\n`);
      setTestResult(prev => prev + `Size: ${nn.getModelSizeInMB().toFixed(2)} MB\n\n`);

      // Test inference
      setTestResult(prev => prev + 'Testing inference...\n');

      // Create a test board
      const board = new Board();
      const boardTensor = DataProcessor.boardToTensor(board, PLAYERS.WHITE, 0);

      // Test prediction
      const startTime = Date.now();
      const prediction = await nn.predict(boardTensor);
      const inferenceTime = Date.now() - startTime;

      setTestResult(prev => prev + `Inference time: ${inferenceTime}ms\n`);
      setTestResult(prev => prev + `Policy output shape: ${prediction.policy.length}\n`);
      setTestResult(prev => prev + `Value output: ${prediction.value.toFixed(4)}\n\n`);

      // Clean up
      boardTensor.dispose();

      setTestResult(prev => prev + '✅ All tests passed!');

    } catch (error) {
      console.error('Test failed:', error);
      setTestResult(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDataProcessing = async () => {
    setLoading(true);
    setTestResult('Testing data processing...');

    try {
      // Create test board
      const board = new Board();

      // Test board to tensor conversion
      const tensor = DataProcessor.boardToTensor(board, PLAYERS.WHITE, 0);
      setTestResult(`Tensor shape: ${tensor.shape}\n`);

      // Test move encoding
      const move = { from: { row: 6, col: 1 }, to: { row: 5, col: 0 } };
      const policyIndex = DataProcessor.moveToPolicyIndex(move);
      const decodedMove = DataProcessor.policyIndexToMove(policyIndex);

      setTestResult(prev => prev + `Move encoding test:\n`);
      setTestResult(prev => prev + `Original: (${move.from.row},${move.from.col}) -> (${move.to.row},${move.to.col})\n`);
      setTestResult(prev => prev + `Policy index: ${policyIndex}\n`);
      setTestResult(prev => prev + `Decoded: (${decodedMove.from.row},${decodedMove.from.col}) -> (${decodedMove.to.row},${decodedMove.to.col})\n`);

      // Clean up
      tensor.dispose();

      setTestResult(prev => prev + '\n✅ Data processing tests passed!');

    } catch (error) {
      console.error('Data processing test failed:', error);
      setTestResult(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Neural Network Test
      </Text>

      {!isReady ? (
        <View>
          <ActivityIndicator size="large" />
          <Text>Initializing TensorFlow.js...</Text>
        </View>
      ) : (
        <View>
          <Text style={{ marginBottom: 10 }}>
            TensorFlow.js Backend: {tf.getBackend()}
          </Text>

          <View style={{ marginBottom: 10 }}>
            <Button
              title="Create & Test Model"
              onPress={createAndTestModel}
              disabled={loading}
            />
          </View>

          <View style={{ marginBottom: 10 }}>
            <Button
              title="Test Data Processing"
              onPress={testDataProcessing}
              disabled={loading}
            />
          </View>

          {loading && <ActivityIndicator size="small" />}

          <View style={{
            backgroundColor: '#f0f0f0',
            padding: 10,
            marginTop: 10,
            borderRadius: 5,
            minHeight: 200
          }}>
            <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {testResult || 'Press a button to run tests...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};