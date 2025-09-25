import * as tf from '@tensorflow/tfjs';
import { DataProcessor } from '../ml/DataProcessor.js';
import { NeuralNetwork } from '../ml/NeuralNetwork.js';
import { PLAYERS } from '../utils/constants.js';

export class NeuralNetworkAI {
  constructor(modelPath = null, player = PLAYERS.BLACK) {
    this.player = player;
    this.neuralNetwork = new NeuralNetwork();
    this.model = null;
    this.isReady = false;
    this.temperature = 1.0; // Controls randomness in move selection

    if (modelPath) {
      this.loadModel(modelPath);
    }
  }

  /**
   * Load the neural network model
   */
  async loadModel(path = 'localstorage://thai-checkers-model-v1') {
    try {
      this.model = await this.neuralNetwork.loadModel(path);
      this.isReady = true;
      console.log('Neural network AI ready');
      return true;
    } catch (error) {
      console.log('Failed to load model, creating new one...');
      try {
        // Try to create new model
        this.model = this.neuralNetwork.createModel();
        this.isReady = true;
        console.log('Neural network AI ready (new model)');
        return true;
      } catch (createError) {
        console.error('Failed to create model:', createError);
        this.isReady = false;
        return false;
      }
    }
  }

  /**
   * Get the best move using neural network predictions
   * @param {GameEngine} gameEngine - Current game state
   * @returns {Object} - Best move { from, to, evaluation }
   */
  async getBestMove(gameEngine) {
    if (!this.isReady) {
      console.warn('Neural network not ready, falling back to random move');
      return this.getRandomMove(gameEngine);
    }

    try {
      // Convert board to tensor
      const boardTensor = DataProcessor.boardToTensor(
        gameEngine.board,
        gameEngine.currentPlayer,
        gameEngine.moveHistory.length
      );

      // Get valid moves
      const validMoves = gameEngine.getAllValidMoves();

      if (validMoves.length === 0) {
        boardTensor.dispose();
        return null;
      }

      if (validMoves.length === 1) {
        boardTensor.dispose();
        return validMoves[0];
      }

      // Add valid moves mask
      const tensorWithMask = DataProcessor.addValidMovesMask(boardTensor, validMoves);
      boardTensor.dispose();

      // Get neural network predictions
      const { policy, value } = await this.neuralNetwork.predict(tensorWithMask);
      tensorWithMask.dispose();

      // Find best valid move based on policy
      let bestMove = null;
      let bestScore = -Infinity;

      // Apply temperature for move selection
      const scores = this.applyTemperature(policy, this.temperature);

      validMoves.forEach(move => {
        const policyIndex = DataProcessor.moveToPolicyIndex(move);
        const score = scores[policyIndex] || 0;

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      });

      // Add evaluation to move
      if (bestMove) {
        bestMove.evaluation = value;
        bestMove.confidence = bestScore;
      }

      return bestMove || validMoves[0];

    } catch (error) {
      console.error('Error getting neural network move:', error);
      return this.getRandomMove(gameEngine);
    }
  }

  /**
   * Apply temperature to policy scores for controlled randomness
   * @param {Float32Array} policy - Raw policy scores
   * @param {number} temperature - Temperature value (0 = deterministic, 1 = normal, >1 = more random)
   */
  applyTemperature(policy, temperature) {
    if (temperature === 0) {
      // Deterministic: pick highest score
      const maxScore = Math.max(...policy);
      return policy.map(score => score === maxScore ? 1 : 0);
    }

    // Apply temperature scaling
    const scaledScores = new Float32Array(policy.length);
    let sum = 0;

    for (let i = 0; i < policy.length; i++) {
      const score = Math.exp(policy[i] / temperature);
      scaledScores[i] = score;
      sum += score;
    }

    // Normalize to probabilities
    if (sum > 0) {
      for (let i = 0; i < scaledScores.length; i++) {
        scaledScores[i] /= sum;
      }
    }

    return scaledScores;
  }

  /**
   * Get a random valid move (fallback)
   */
  getRandomMove(gameEngine) {
    const validMoves = gameEngine.getAllValidMoves();
    if (validMoves.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }

  /**
   * Set temperature for move selection
   * @param {number} temp - Temperature value (0-2)
   */
  setTemperature(temp) {
    this.temperature = Math.max(0, Math.min(2, temp));
  }

  /**
   * Get move with exploration (for training)
   * Adds Dirichlet noise for exploration
   */
  async getExplorationMove(gameEngine, noiseWeight = 0.25) {
    const move = await this.getBestMove(gameEngine);

    if (!move || !this.isReady) return move;

    // Add Dirichlet noise for exploration during self-play
    const validMoves = gameEngine.getAllValidMoves();
    if (validMoves.length > 1 && Math.random() < noiseWeight) {
      // Sometimes pick a different move for exploration
      const randomIndex = Math.floor(Math.random() * validMoves.length);
      return validMoves[randomIndex];
    }

    return move;
  }

  /**
   * Evaluate current position
   * @param {GameEngine} gameEngine - Game state
   * @returns {number} - Position evaluation (-1 to 1)
   */
  async evaluatePosition(gameEngine) {
    if (!this.isReady) return 0;

    try {
      const boardTensor = DataProcessor.boardToTensor(
        gameEngine.board,
        gameEngine.currentPlayer,
        gameEngine.moveHistory.length
      );

      const { value } = await this.neuralNetwork.predict(boardTensor);
      boardTensor.dispose();

      return value;
    } catch (error) {
      console.error('Error evaluating position:', error);
      return 0;
    }
  }

  /**
   * Get confidence level for a specific move
   */
  async getMoveConfidence(gameEngine, move) {
    if (!this.isReady) return 0;

    try {
      const boardTensor = DataProcessor.boardToTensor(
        gameEngine.board,
        gameEngine.currentPlayer,
        gameEngine.moveHistory.length
      );

      const { policy } = await this.neuralNetwork.predict(boardTensor);
      boardTensor.dispose();

      const policyIndex = DataProcessor.moveToPolicyIndex(move);
      return policy[policyIndex] || 0;

    } catch (error) {
      console.error('Error getting move confidence:', error);
      return 0;
    }
  }

  /**
   * Get top N moves ranked by neural network
   */
  async getTopMoves(gameEngine, n = 3) {
    if (!this.isReady) {
      const validMoves = gameEngine.getAllValidMoves();
      return validMoves.slice(0, n);
    }

    try {
      const boardTensor = DataProcessor.boardToTensor(
        gameEngine.board,
        gameEngine.currentPlayer,
        gameEngine.moveHistory.length
      );

      const validMoves = gameEngine.getAllValidMoves();
      const { policy, value } = await this.neuralNetwork.predict(boardTensor);
      boardTensor.dispose();

      // Score all valid moves
      const scoredMoves = validMoves.map(move => {
        const policyIndex = DataProcessor.moveToPolicyIndex(move);
        return {
          ...move,
          score: policy[policyIndex] || 0,
          evaluation: value
        };
      });

      // Sort by score and return top N
      scoredMoves.sort((a, b) => b.score - a.score);
      return scoredMoves.slice(0, n);

    } catch (error) {
      console.error('Error getting top moves:', error);
      return gameEngine.getAllValidMoves().slice(0, n);
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isReady = false;
    }
  }
}