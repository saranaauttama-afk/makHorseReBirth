import { EvaluationFunction } from './EvaluationFunction.js';
import { PLAYERS } from '../utils/constants.js';

export class MinimaxAI {
  constructor(depth = 4, player = PLAYERS.BLACK) {
    this.maxDepth = depth;
    this.player = player;
    this.opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    this.nodesEvaluated = 0;
    this.transpositionTable = new Map();
    this.moveOrdering = true;
    this.timeLimit = null;
    this.startTime = null;
  }

  setDepth(depth) {
    this.maxDepth = depth;
  }

  setTimeLimit(timeMs) {
    this.timeLimit = timeMs;
    this.startTime = Date.now();
  }

  isTimeUp() {
    if (!this.timeLimit) return false;
    return Date.now() - this.startTime > this.timeLimit;
  }

  getBestMove(gameEngine, useIterativeDeepening = false) {
    this.nodesEvaluated = 0;
    this.transpositionTable.clear();
    this.startTime = Date.now();

    if (useIterativeDeepening && this.timeLimit) {
      return this.iterativeDeepening(gameEngine);
    }

    const moves = gameEngine.getAllValidMoves();

    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    let bestMove = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const orderedMoves = this.orderMoves(moves, gameEngine);

    for (const move of orderedMoves) {
      const clonedEngine = gameEngine.clone();
      clonedEngine.makeMove(
        move.from.row, move.from.col,
        move.to.row, move.to.col
      );

      const score = this.minimax(
        clonedEngine,
        this.maxDepth - 1,
        alpha,
        beta,
        false
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, bestScore);

      if (this.isTimeUp()) break;
    }

    console.log(`Minimax evaluated ${this.nodesEvaluated} nodes, best score: ${bestScore}`);
    return bestMove;
  }

  iterativeDeepening(gameEngine) {
    let bestMove = null;
    let currentDepth = 1;

    while (currentDepth <= this.maxDepth && !this.isTimeUp()) {
      this.transpositionTable.clear();
      const move = this.getBestMoveAtDepth(gameEngine, currentDepth);

      if (move && !this.isTimeUp()) {
        bestMove = move;
        console.log(`Depth ${currentDepth} completed`);
      }

      currentDepth++;
    }

    return bestMove;
  }

  getBestMoveAtDepth(gameEngine, depth) {
    const moves = gameEngine.getAllValidMoves();

    if (moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of moves) {
      if (this.isTimeUp()) break;

      const clonedEngine = gameEngine.clone();
      clonedEngine.makeMove(
        move.from.row, move.from.col,
        move.to.row, move.to.col
      );

      const score = this.minimax(
        clonedEngine,
        depth - 1,
        alpha,
        beta,
        false
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, bestScore);
    }

    return bestMove;
  }

  minimax(gameEngine, depth, alpha, beta, maximizingPlayer) {
    this.nodesEvaluated++;

    if (this.isTimeUp()) {
      return maximizingPlayer ? -Infinity : Infinity;
    }

    const boardKey = this.getBoardKey(gameEngine, depth, maximizingPlayer);
    if (this.transpositionTable.has(boardKey)) {
      const cached = this.transpositionTable.get(boardKey);
      if (cached.alpha <= alpha && cached.beta >= beta) {
        return cached.score;
      }
    }

    if (depth === 0 || gameEngine.isGameOver()) {
      const score = EvaluationFunction.evaluate(gameEngine, this.player);
      this.transpositionTable.set(boardKey, { score, alpha, beta });
      return score;
    }

    const currentPlayer = maximizingPlayer ? this.player : this.opponent;
    gameEngine.currentPlayer = currentPlayer;
    const moves = gameEngine.getAllValidMoves();

    if (moves.length === 0) {
      const score = maximizingPlayer ? -100000 : 100000;
      this.transpositionTable.set(boardKey, { score, alpha, beta });
      return score;
    }

    const orderedMoves = this.moveOrdering ?
      this.orderMoves(moves, gameEngine) : moves;

    if (maximizingPlayer) {
      let maxScore = -Infinity;

      for (const move of orderedMoves) {
        const clonedEngine = gameEngine.clone();
        clonedEngine.makeMove(
          move.from.row, move.from.col,
          move.to.row, move.to.col
        );

        const score = this.minimax(
          clonedEngine,
          depth - 1,
          alpha,
          beta,
          false
        );

        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);

        if (beta <= alpha) break;
      }

      this.transpositionTable.set(boardKey, { score: maxScore, alpha, beta });
      return maxScore;
    } else {
      let minScore = Infinity;

      for (const move of orderedMoves) {
        const clonedEngine = gameEngine.clone();
        clonedEngine.makeMove(
          move.from.row, move.from.col,
          move.to.row, move.to.col
        );

        const score = this.minimax(
          clonedEngine,
          depth - 1,
          alpha,
          beta,
          true
        );

        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);

        if (beta <= alpha) break;
      }

      this.transpositionTable.set(boardKey, { score: minScore, alpha, beta });
      return minScore;
    }
  }

  orderMoves(moves, gameEngine) {
    const scoredMoves = moves.map(move => {
      let score = 0;

      const targetPiece = gameEngine.board.getPieceAt(move.to.row, move.to.col);
      if (targetPiece) {
        score += 1000;
      }

      const centerDistance = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
      score += (7 - centerDistance) * 10;

      const clonedEngine = gameEngine.clone();
      clonedEngine.makeMove(
        move.from.row, move.from.col,
        move.to.row, move.to.col
      );
      const responses = clonedEngine.getAllValidMoves();
      score -= responses.filter(r =>
        r.to.row === move.to.row && r.to.col === move.to.col
      ).length * 50;

      return { move, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves.map(sm => sm.move);
  }

  getBoardKey(gameEngine, depth, maximizingPlayer) {
    const boardStr = JSON.stringify(gameEngine.board.toArray());
    return `${boardStr}_${depth}_${maximizingPlayer}`;
  }

  getStatistics() {
    return {
      nodesEvaluated: this.nodesEvaluated,
      transpositionTableSize: this.transpositionTable.size,
      timeElapsed: this.startTime ? Date.now() - this.startTime : 0
    };
  }
}