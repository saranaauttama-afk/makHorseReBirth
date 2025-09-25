import { PLAYERS } from '../utils/constants.js';

/**
 * Monte Carlo Tree Search Node
 */
export class MCTSNode {
  constructor(gameState, move = null, parent = null) {
    this.gameState = gameState; // GameEngine instance
    this.move = move; // Move that led to this state
    this.parent = parent;
    this.children = [];
    this.visits = 0;
    this.wins = 0;
    this.untriedMoves = null; // Will be populated on first visit
    this.player = gameState.currentPlayer;
  }

  /**
   * Check if node is fully expanded
   */
  isFullyExpanded() {
    return this.untriedMoves !== null && this.untriedMoves.length === 0;
  }

  /**
   * Check if node is terminal (game over)
   */
  isTerminal() {
    return this.gameState.gameStatus !== 'playing';
  }

  /**
   * Get UCB1 value for node selection
   */
  getUCB1(explorationParameter = Math.sqrt(2)) {
    if (this.visits === 0) {
      return Infinity;
    }

    const exploitation = this.wins / this.visits;
    const exploration = explorationParameter * Math.sqrt(Math.log(this.parent.visits) / this.visits);

    return exploitation + exploration;
  }

  /**
   * Select best child based on UCB1
   */
  selectBestChild(explorationParameter = Math.sqrt(2)) {
    return this.children.reduce((best, child) => {
      const childUCB1 = child.getUCB1(explorationParameter);
      const bestUCB1 = best.getUCB1(explorationParameter);
      return childUCB1 > bestUCB1 ? child : best;
    });
  }

  /**
   * Expand node by adding one untried move
   */
  expand() {
    if (this.untriedMoves === null) {
      this.untriedMoves = this.gameState.getAllValidMoves();
    }

    if (this.untriedMoves.length === 0) {
      return null;
    }

    const move = this.untriedMoves.pop();

    // Create new game state
    const newGameState = this.cloneGameState();
    const result = newGameState.makeMove(
      move.from.row, move.from.col,
      move.to.row, move.to.col
    );

    if (result.success) {
      const childNode = new MCTSNode(newGameState, move, this);
      this.children.push(childNode);
      return childNode;
    }

    return null;
  }

  /**
   * Simulate game from current state using evaluation-guided play
   */
  simulate() {
    const gameState = this.cloneGameState();
    let moves = 0;
    const maxMoves = 50; // Reduced for faster simulation

    while (gameState.gameStatus === 'playing' && moves < maxMoves) {
      const validMoves = gameState.getAllValidMoves();
      if (validMoves.length === 0) break;

      let selectedMove;
      if (moves < 10 && Math.random() < 0.7) {
        // Use evaluation-guided move selection for first 10 moves (70% chance)
        selectedMove = this.selectEvaluatedMove(gameState, validMoves);
      } else {
        // Random move for speed
        selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      }

      gameState.makeMove(
        selectedMove.from.row, selectedMove.from.col,
        selectedMove.to.row, selectedMove.to.col
      );
      moves++;
    }

    // Return evaluation-based result if game didn't finish
    if (gameState.gameStatus === 'playing') {
      return this.evaluatePosition(gameState);
    }

    // Determine winner from perspective of this node's player
    if (gameState.gameStatus === 'white_win') {
      return this.player === PLAYERS.WHITE ? 1 : 0;
    } else if (gameState.gameStatus === 'black_win') {
      return this.player === PLAYERS.BLACK ? 1 : 0;
    } else {
      // Draw or timeout
      return 0.5;
    }
  }

  /**
   * Select move based on evaluation function
   */
  selectEvaluatedMove(gameState, validMoves) {
    if (validMoves.length === 1) return validMoves[0];

    const { EvaluationFunction } = require('../ai/EvaluationFunction.js');
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    // Prioritize capture moves
    const captureMoves = validMoves.filter(move => move.type === 'capture');
    if (captureMoves.length > 0) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }

    // Evaluate top moves only for speed
    const movesToEvaluate = Math.min(validMoves.length, 5);
    const selectedMoves = this.shuffleArray(validMoves).slice(0, movesToEvaluate);

    for (const move of selectedMoves) {
      // Make temporary move
      const tempState = gameState.board.clone();
      const tempEngine = new (require('../game/GameEngine.js').GameEngine)();
      tempEngine.board = tempState;
      tempEngine.currentPlayer = gameState.currentPlayer;
      tempEngine.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);

      // Evaluate position
      const score = EvaluationFunction.evaluate(tempEngine, gameState.currentPlayer);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Evaluate position for MCTS simulation
   */
  evaluatePosition(gameState) {
    const { EvaluationFunction } = require('../ai/EvaluationFunction.js');

    const whiteScore = EvaluationFunction.evaluate(gameState, PLAYERS.WHITE);
    const blackScore = EvaluationFunction.evaluate(gameState, PLAYERS.BLACK);

    // Normalize to 0-1 range
    const scoreDiff = whiteScore - blackScore;
    const normalizedScore = 1 / (1 + Math.exp(-scoreDiff / 1000));

    return this.player === PLAYERS.WHITE ? normalizedScore : (1 - normalizedScore);
  }

  /**
   * Shuffle array utility
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Backpropagate result up the tree
   */
  backpropagate(result) {
    this.visits++;
    this.wins += result;

    if (this.parent) {
      // Invert result for parent (opponent's perspective)
      this.parent.backpropagate(1 - result);
    }
  }

  /**
   * Clone game state for simulation
   */
  cloneGameState() {
    const { GameEngine } = require('../game/GameEngine.js');
    const newEngine = new GameEngine();

    // Copy board state
    newEngine.board = this.gameState.board.clone();
    newEngine.currentPlayer = this.gameState.currentPlayer;
    newEngine.gameStatus = this.gameState.gameStatus;
    newEngine.moveHistory = [...this.gameState.moveHistory];

    return newEngine;
  }
}

/**
 * Monte Carlo Tree Search Algorithm
 */
export class MCTS {
  constructor(config = {}) {
    this.iterations = config.iterations || 1000;
    this.explorationParameter = config.explorationParameter || Math.sqrt(2);
    this.timeLimit = config.timeLimit || 5000; // 5 seconds
  }

  /**
   * Search for best move using MCTS
   */
  search(gameEngine) {
    const rootNode = new MCTSNode(gameEngine);
    const startTime = Date.now();
    let iterations = 0;

    while (
      iterations < this.iterations &&
      (Date.now() - startTime) < this.timeLimit
    ) {
      // Selection
      let node = this.select(rootNode);

      // Expansion
      if (!node.isTerminal() && node.visits > 0) {
        const expandedNode = node.expand();
        if (expandedNode) {
          node = expandedNode;
        }
      }

      // Simulation
      const result = node.simulate();

      // Backpropagation
      node.backpropagate(result);

      iterations++;
    }

    console.log(`MCTS: ${iterations} iterations in ${Date.now() - startTime}ms`);

    // Select best move based on visit count (most robust)
    if (rootNode.children.length === 0) {
      return null;
    }

    const bestChild = rootNode.children.reduce((best, child) => {
      return child.visits > best.visits ? child : best;
    });

    return bestChild.move;
  }

  /**
   * Selection phase - traverse tree using UCB1
   */
  select(rootNode) {
    let node = rootNode;

    while (!node.isTerminal() && node.isFullyExpanded()) {
      node = node.selectBestChild(this.explorationParameter);
    }

    return node;
  }

  /**
   * Get statistics about the search
   */
  getSearchStats(rootNode) {
    const stats = {
      totalNodes: this.countNodes(rootNode),
      depth: this.getMaxDepth(rootNode),
      bestMoveVisits: 0,
      bestMoveWinRate: 0
    };

    if (rootNode.children.length > 0) {
      const bestChild = rootNode.children.reduce((best, child) => {
        return child.visits > best.visits ? child : best;
      });

      stats.bestMoveVisits = bestChild.visits;
      stats.bestMoveWinRate = bestChild.wins / bestChild.visits;
    }

    return stats;
  }

  countNodes(node) {
    let count = 1;
    for (const child of node.children) {
      count += this.countNodes(child);
    }
    return count;
  }

  getMaxDepth(node, currentDepth = 0) {
    let maxDepth = currentDepth;
    for (const child of node.children) {
      const childDepth = this.getMaxDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
    return maxDepth;
  }
}