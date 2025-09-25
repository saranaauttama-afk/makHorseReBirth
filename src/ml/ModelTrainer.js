import * as tf from '@tensorflow/tfjs';
import { NeuralNetwork } from './NeuralNetwork.js';
import { DataProcessor } from './DataProcessor.js';
import { Board } from '../game/Board.js';

export class ModelTrainer {
  constructor() {
    this.neuralNetwork = new NeuralNetwork();
    this.model = null;
    this.trainingHistory = [];
  }

  /**
   * Initialize and create the model
   */
  async initialize() {
    this.model = this.neuralNetwork.createModel();
    console.log('Model initialized');
    console.log(`Total parameters: ${this.neuralNetwork.getParametersCount()}`);
    console.log(`Model size: ${this.neuralNetwork.getModelSizeInMB().toFixed(2)} MB`);
    return this.model;
  }

  /**
   * Train the model on prepared data
   * @param {Array} trainingData - Array of game positions
   * @param {Object} config - Training configuration
   */
  async train(trainingData, config = {}) {
    const defaultConfig = {
      batchSize: 32,
      epochs: 50,
      validationSplit: 0.15,
      learningRate: 0.001,
      verbose: 1,
      callbacks: []
    };

    const settings = { ...defaultConfig, ...config };

    console.log('Preparing training data...');

    // Convert positions to tensors
    const { inputs, policyTargets, valueTargets } = this.prepareTrainingData(trainingData);

    console.log(`Training on ${trainingData.length} positions`);
    console.log(`Batch size: ${settings.batchSize}`);
    console.log(`Epochs: ${settings.epochs}`);

    // Custom callbacks
    const callbacks = [
      ...settings.callbacks,
      {
        onEpochEnd: async (epoch, logs) => {
          this.trainingHistory.push({
            epoch,
            loss: logs.loss,
            policyLoss: logs.policy_head_loss,
            valueLoss: logs.value_head_loss,
            accuracy: logs.policy_head_accuracy,
            valLoss: logs.val_loss,
            valAccuracy: logs.val_policy_head_accuracy
          });

          console.log(
            `Epoch ${epoch + 1}/${settings.epochs} - ` +
            `Loss: ${logs.loss.toFixed(4)} - ` +
            `Accuracy: ${(logs.policy_head_accuracy * 100).toFixed(2)}% - ` +
            `Val Loss: ${logs.val_loss ? logs.val_loss.toFixed(4) : 'N/A'}`
          );

          // Early stopping check
          if (settings.earlyStoppingPatience) {
            const shouldStop = this.checkEarlyStopping(settings.earlyStoppingPatience);
            if (shouldStop) {
              console.log('Early stopping triggered');
              this.model.stopTraining = true;
            }
          }
        },
        onTrainEnd: () => {
          console.log('\nTraining completed!');
          this.printTrainingSummary();
        }
      }
    ];

    // Train the model
    const history = await this.model.fit(
      inputs,
      [policyTargets, valueTargets],
      {
        batchSize: settings.batchSize,
        epochs: settings.epochs,
        validationSplit: settings.validationSplit,
        verbose: settings.verbose,
        callbacks,
        shuffle: true
      }
    );

    // Clean up tensors
    inputs.dispose();
    policyTargets.dispose();
    valueTargets.dispose();

    return history;
  }

  /**
   * Prepare training data by converting to tensors
   */
  prepareTrainingData(positions) {
    const inputs = [];
    const policyTargets = [];
    const valueTargets = [];

    positions.forEach(position => {
      // Reconstruct board from array representation
      const board = this.arrayToBoard(position.boardState);

      // Convert to tensor
      const boardTensor = DataProcessor.boardToTensor(
        board,
        position.player,
        position.moveNumber
      );

      inputs.push(boardTensor.arraySync());
      boardTensor.dispose();

      // Policy target (one-hot encoded move)
      policyTargets.push(DataProcessor.moveToOneHot(position.move));

      // Value target
      valueTargets.push([position.value]);
    });

    return {
      inputs: tf.tensor4d(inputs),
      policyTargets: tf.tensor2d(policyTargets),
      valueTargets: tf.tensor2d(valueTargets)
    };
  }

  /**
   * Convert array representation back to Board object
   */
  arrayToBoard(boardArray) {
    const board = new Board();
    board.grid = Array(8).fill(null).map(() => Array(8).fill(null));
    board.pieces = { WHITE: [], BLACK: [] };

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const value = boardArray[row][col];
        if (value !== 0) {
          const piece = {
            player: value > 0 ? 'WHITE' : 'BLACK',
            type: Math.abs(value) === 2 ? 'KING' : 'MAN',
            id: `piece_${row}_${col}`,
            position: { row, col }
          };
          board.grid[row][col] = piece;
          board.pieces[piece.player].push(piece);
        }
      }
    }

    return board;
  }

  /**
   * Check for early stopping based on validation loss
   */
  checkEarlyStopping(patience) {
    if (this.trainingHistory.length < patience + 1) {
      return false;
    }

    const recent = this.trainingHistory.slice(-patience);
    const bestValLoss = Math.min(...recent.map(h => h.valLoss || Infinity));
    const currentValLoss = recent[recent.length - 1].valLoss;

    return currentValLoss > bestValLoss;
  }

  /**
   * Print training summary
   */
  printTrainingSummary() {
    if (this.trainingHistory.length === 0) return;

    const lastEpoch = this.trainingHistory[this.trainingHistory.length - 1];
    const bestEpoch = this.trainingHistory.reduce((best, current) =>
      (current.valLoss || Infinity) < (best.valLoss || Infinity) ? current : best
    );

    console.log('\n📊 Training Summary:');
    console.log('====================');
    console.log(`Total epochs: ${this.trainingHistory.length}`);
    console.log(`Final loss: ${lastEpoch.loss.toFixed(4)}`);
    console.log(`Final accuracy: ${(lastEpoch.accuracy * 100).toFixed(2)}%`);
    console.log(`Best validation loss: ${bestEpoch.valLoss?.toFixed(4)} (epoch ${bestEpoch.epoch + 1})`);
    console.log(`Best validation accuracy: ${(bestEpoch.valAccuracy * 100).toFixed(2)}%`);
  }

  /**
   * Evaluate model on test data
   */
  async evaluate(testData) {
    console.log(`\nEvaluating on ${testData.length} test positions...`);

    const { inputs, policyTargets, valueTargets } = this.prepareTrainingData(testData);

    const evaluation = await this.model.evaluate(inputs, [policyTargets, valueTargets]);

    const results = {
      loss: await evaluation[0].data(),
      policyLoss: await evaluation[1].data(),
      valueLoss: await evaluation[2].data(),
      policyAccuracy: await evaluation[3].data()
    };

    // Clean up
    inputs.dispose();
    policyTargets.dispose();
    valueTargets.dispose();
    evaluation.forEach(t => t.dispose());

    console.log('\n📈 Evaluation Results:');
    console.log(`- Total Loss: ${results.loss[0].toFixed(4)}`);
    console.log(`- Policy Loss: ${results.policyLoss[0].toFixed(4)}`);
    console.log(`- Value Loss: ${results.valueLoss[0].toFixed(4)}`);
    console.log(`- Policy Accuracy: ${(results.policyAccuracy[0] * 100).toFixed(2)}%`);

    return results;
  }

  /**
   * Save the trained model
   */
  async saveModel(path = 'localstorage://thai-checkers-model') {
    await this.neuralNetwork.saveModel(path);

    // Also save training history
    const historyPath = path.replace('model', 'history');
    if (typeof window !== 'undefined') {
      localStorage.setItem(historyPath, JSON.stringify(this.trainingHistory));
    }

    console.log(`Model and history saved to ${path}`);
  }

  /**
   * Load a previously trained model
   */
  async loadModel(path = 'localstorage://thai-checkers-model') {
    this.model = await this.neuralNetwork.loadModel(path);

    // Load training history if available
    const historyPath = path.replace('model', 'history');
    if (typeof window !== 'undefined') {
      const historyJson = localStorage.getItem(historyPath);
      if (historyJson) {
        this.trainingHistory = JSON.parse(historyJson);
        console.log('Training history loaded');
      }
    }

    return this.model;
  }

  /**
   * Fine-tune the model on new data
   */
  async fineTune(newData, config = {}) {
    const finetuneConfig = {
      ...config,
      epochs: config.epochs || 10,
      learningRate: config.learningRate || 0.0001,
      batchSize: config.batchSize || 16
    };

    // Reduce learning rate for fine-tuning
    this.model.optimizer.learningRate = finetuneConfig.learningRate;

    console.log('\n🎯 Fine-tuning model...');
    console.log(`Learning rate: ${finetuneConfig.learningRate}`);

    return await this.train(newData, finetuneConfig);
  }
}