import { MCTS } from './MCTS.js';
import { PLAYERS } from '../utils/constants.js';

/**
 * MCTS-based AI Player
 */
export class MCTSAI {
  constructor(config = {}, player = PLAYERS.BLACK) {
    this.player = player;
    this.mcts = new MCTS({
      iterations: config.iterations || 500,
      explorationParameter: config.explorationParameter || Math.sqrt(2),
      timeLimit: config.timeLimit || 3000 // 3 seconds
    });

    this.stats = {
      totalMoves: 0,
      totalThinkingTime: 0,
      averageDepth: 0,
      averageNodes: 0
    };
  }

  /**
   * Get best move using MCTS
   */
  getBestMove(gameEngine) {
    if (gameEngine.currentPlayer !== this.player) {
      console.warn('MCTS AI called on wrong player turn');
      return null;
    }

    const validMoves = gameEngine.getAllValidMoves();
    if (validMoves.length === 0) {
      return null;
    }

    if (validMoves.length === 1) {
      // Only one move available
      return validMoves[0];
    }

    const startTime = Date.now();

    try {
      const bestMove = this.mcts.search(gameEngine);
      const thinkingTime = Date.now() - startTime;

      // Update statistics
      this.updateStats(thinkingTime);

      if (bestMove) {
        bestMove.evaluation = this.evaluateMove(bestMove, gameEngine);
        bestMove.thinkingTime = thinkingTime;
      }

      return bestMove;

    } catch (error) {
      console.error('MCTS search error:', error);
      // Fallback to random move
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
  }

  /**
   * Evaluate move quality (simple heuristic)
   */
  evaluateMove(move, gameEngine) {
    let score = 0;

    // Bonus for captures
    if (move.capturedPieces && move.capturedPieces.length > 0) {
      score += move.capturedPieces.length * 100;
    }

    // Bonus for center control
    const centerDistance = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
    score += (7 - centerDistance) * 5;

    // Bonus for advancing (for current player)
    if (gameEngine.currentPlayer === PLAYERS.WHITE) {
      score += (6 - move.to.row) * 2; // White advances upward
    } else {
      score += (move.to.row - 1) * 2; // Black advances downward
    }

    return score;
  }

  /**
   * Update internal statistics
   */
  updateStats(thinkingTime) {
    this.stats.totalMoves++;
    this.stats.totalThinkingTime += thinkingTime;
  }

  /**
   * Get AI statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageThinkingTime: this.stats.totalMoves > 0
        ? this.stats.totalThinkingTime / this.stats.totalMoves
        : 0
    };
  }

  /**
   * Set MCTS configuration
   */
  setConfig(config) {
    if (config.iterations !== undefined) {
      this.mcts.iterations = config.iterations;
    }
    if (config.timeLimit !== undefined) {
      this.mcts.timeLimit = config.timeLimit;
    }
    if (config.explorationParameter !== undefined) {
      this.mcts.explorationParameter = config.explorationParameter;
    }
  }

  /**
   * Get difficulty level description
   */
  getDifficultyInfo() {
    const iterations = this.mcts.iterations;
    const timeLimit = this.mcts.timeLimit;

    if (iterations <= 200) {
      return {
        name: 'Easy',
        description: `${iterations} iterations, ${timeLimit}ms thinking time`,
        strength: 'Beginner level'
      };
    } else if (iterations <= 500) {
      return {
        name: 'Medium',
        description: `${iterations} iterations, ${timeLimit}ms thinking time`,
        strength: 'Intermediate level'
      };
    } else if (iterations <= 1000) {
      return {
        name: 'Hard',
        description: `${iterations} iterations, ${timeLimit}ms thinking time`,
        strength: 'Advanced level'
      };
    } else {
      return {
        name: 'Expert',
        description: `${iterations} iterations, ${timeLimit}ms thinking time`,
        strength: 'Master level'
      };
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalMoves: 0,
      totalThinkingTime: 0,
      averageDepth: 0,
      averageNodes: 0
    };
  }
}