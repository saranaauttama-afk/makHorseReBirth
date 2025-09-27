import { EvaluationFunction } from './EvaluationFunction.js';
import { PLAYERS, PIECE_TYPES } from '../utils/constants.js';

const FORCED_CAPTURE_BONUS = 90;
const RECAPTURE_BONUS = 45;

export class MinimaxAIQuiescence {
  constructor(depth = 4, player = PLAYERS.BLACK) {
    this.maxDepth = depth;
    this.player = player;
    this.opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    this.nodesEvaluated = 0;
    this.transpositionTable = new Map();
    this.moveOrdering = true;
    this.maxQuiescenceDepth = 4;
  }

  setDepth(depth) {
    this.maxDepth = depth;
  }

  resetSearchState() {
    this.nodesEvaluated = 0;
    this.transpositionTable.clear();
  }

  getBestMove(gameEngine) {
    this.resetSearchState();

    const moves = gameEngine.getAllValidMoves();
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    let bestMove = moves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const orderedMoves = this.orderMoves(moves, gameEngine);

    for (const move of orderedMoves) {
      const clonedEngine = gameEngine.clone();
      const result = clonedEngine.makeMove(
        move.from.row,
        move.from.col,
        move.to.row,
        move.to.col
      );

      if (!result || result.success === false) {
        continue;
      }

      const extension = this.getSearchExtension(move, clonedEngine);
      const score = this.minimax(
        clonedEngine,
        Math.max(0, this.maxDepth - 1 + extension),
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

    if (gameEngine.isGameOver()) {
      return EvaluationFunction.evaluate(gameEngine, this.player);
    }

    const boardKey = this.getBoardKey(gameEngine, depth, maximizingPlayer);
    const cached = this.transpositionTable.get(boardKey);
    if (cached && cached.depth >= depth) {
      if (cached.type === 'exact') {
        return cached.score;
      }
      if (cached.type === 'lower' && cached.score >= beta) {
        return cached.score;
      }
      if (cached.type === 'upper' && cached.score <= alpha) {
        return cached.score;
      }
    }

    if (depth === 0) {
      const score = this.quiescenceSearch(gameEngine, alpha, beta, maximizingPlayer, 0);
      this.transpositionTable.set(boardKey, { score, depth, type: 'exact' });
      return score;
    }

    const currentPlayer = maximizingPlayer ? this.player : this.opponent;
    gameEngine.currentPlayer = currentPlayer;
    const moves = gameEngine.getAllValidMoves();

    if (moves.length === 0) {
      const score = maximizingPlayer ? -10000 : 10000;
      this.transpositionTable.set(boardKey, { score, depth, type: 'exact' });
      return score;
    }

    const orderedMoves = this.moveOrdering ?
      this.orderMoves(moves, gameEngine) :
      moves;

    let bestScore = maximizingPlayer ? -Infinity : Infinity;

    for (const move of orderedMoves) {

      const clonedEngine = gameEngine.clone();
      const result = clonedEngine.makeMove(
        move.from.row,
        move.from.col,
        move.to.row,
        move.to.col
      );

      if (!result || result.success === false) {
        continue;
      }

      const extension = this.getSearchExtension(move, clonedEngine);
      const score = this.minimax(
        clonedEngine,
        Math.max(0, depth - 1 + extension),
        alpha,
        beta,
        !maximizingPlayer
      );

      if (maximizingPlayer) {
        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, score);
      } else {
        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, score);
      }

      if (beta <= alpha) {
        break;
      }
    }

    let ttType = 'exact';
    if (bestScore <= alpha) {
      ttType = 'upper';
    } else if (bestScore >= beta) {
      ttType = 'lower';
    }

    this.transpositionTable.set(boardKey, { score: bestScore, depth, type: ttType });
    return bestScore;
  }

  quiescenceSearch(gameEngine, alpha, beta, maximizingPlayer, qDepth) {
    this.nodesEvaluated++;

    if (qDepth >= this.maxQuiescenceDepth) {
      return EvaluationFunction.evaluate(gameEngine, this.player);
    }

    const standPat = EvaluationFunction.evaluate(gameEngine, this.player);

    if (maximizingPlayer) {
      if (standPat >= beta) {
        return beta;
      }
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) {
        return alpha;
      }
      beta = Math.min(beta, standPat);
    }

    const currentPlayer = maximizingPlayer ? this.player : this.opponent;
    gameEngine.currentPlayer = currentPlayer;
    const captureMoves = this.filterCaptureMoves(gameEngine.getAllValidMoves());

    if (captureMoves.length === 0) {
      return standPat;
    }

    const orderedCaptures = this.orderCapturesByValue(captureMoves, gameEngine);

    if (maximizingPlayer) {
      let maxEval = standPat;

      for (const move of orderedCaptures) {
        const ownedGain = this.getCapturedPieceValue(move, gameEngine);
        const clonedEngine = gameEngine.clone();
        const result = clonedEngine.makeMove(
          move.from.row,
          move.from.col,
          move.to.row,
          move.to.col
        );

        if (!result || result.success === false) {
          continue;
        }

        if (standPat + ownedGain + 100 < alpha) {
          continue;
        }

        const evalScore = this.quiescenceSearch(
          clonedEngine,
          alpha,
          beta,
          false,
          qDepth + 1
        );

        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);

        if (alpha >= beta) {
          break;
        }
      }

      return maxEval;
    } else {
      let minEval = standPat;

      for (const move of orderedCaptures) {
        const ownedGain = this.getCapturedPieceValue(move, gameEngine);
        const clonedEngine = gameEngine.clone();
        const result = clonedEngine.makeMove(
          move.from.row,
          move.from.col,
          move.to.row,
          move.to.col
        );

        if (!result || result.success === false) {
          continue;
        }

        if (standPat - ownedGain - 100 > beta) {
          continue;
        }

        const evalScore = this.quiescenceSearch(
          clonedEngine,
          alpha,
          beta,
          true,
          qDepth + 1
        );

        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);

        if (alpha >= beta) {
          break;
        }
      }

      return minEval;
    }
  }

  orderMoves(moves, gameEngine) {
    const captures = [];
    const quietMoves = [];

    for (const move of moves) {
      const deltaRow = Math.abs(move.to.row - move.from.row);
      const deltaCol = Math.abs(move.to.col - move.from.col);

      if (deltaRow > 1 || deltaCol > 1) {
        captures.push(move);
      } else {
        quietMoves.push(move);
      }
    }

    const orderedCaptures = this.orderCapturesByValue(captures, gameEngine);

    const orderedQuietMoves = quietMoves
      .map(move => {
        let score = 0;
        const centerDistance = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
        score += (7 - centerDistance) * 8;

        const piece = gameEngine.board.getPieceAt(move.from.row, move.from.col);
        if (piece) {
          if (piece.player === PLAYERS.WHITE) {
            score += (move.from.row - move.to.row) * 16;
          } else {
            score += (move.to.row - move.from.row) * 16;
          }

          if (piece.type === PIECE_TYPES.KING) {
            score += 25;
          }
        }

        score += this.evaluateTrapPotential(gameEngine, move);

        return { move, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.move);

    return [...orderedCaptures, ...orderedQuietMoves];
  }

  filterCaptureMoves(moves) {
    return moves.filter(move => {
      const deltaRow = Math.abs(move.to.row - move.from.row);
      const deltaCol = Math.abs(move.to.col - move.from.col);
      return deltaRow > 1 || deltaCol > 1;
    });
  }

  orderCapturesByValue(moves, gameEngine) {
    return moves
      .slice()
      .sort((a, b) => {
        const valueA = this.getCapturedPieceValue(a, gameEngine);
        const valueB = this.getCapturedPieceValue(b, gameEngine);
        return valueB - valueA;
      });
  }

  getCapturedPieceValue(move, gameEngine) {
    const capturedPositions = this.resolveCapturedPositions(move);
    if (!capturedPositions.length) return 0;

    let total = 0;
    for (const pos of capturedPositions) {
      const capturedPiece = gameEngine.board.getPieceAt(pos.row, pos.col);
      if (!capturedPiece) continue;
      total += capturedPiece.type === PIECE_TYPES.KING ? 300 : 100;
    }

    return total;
  }

  resolveCapturedPositions(move) {
    if (Array.isArray(move.capturedPieces) && move.capturedPieces.length > 0) {
      return move.capturedPieces;
    }

    const inferred = [];
    const rowDiff = move.to.row - move.from.row;
    const colDiff = move.to.col - move.from.col;
    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));

    if (steps <= 1) {
      return inferred;
    }

    const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

    let row = move.from.row + rowStep;
    let col = move.from.col + colStep;

    for (let i = 1; i < steps; i++) {
      inferred.push({ row, col });
      row += rowStep;
      col += colStep;
    }

    return inferred;
  }

  getSearchExtension(move, childEngine) {
    if (move.type === 'capture') {
      return 1;
    }

    const opponentMoves = childEngine.getAllValidMoves();

    if (opponentMoves.length <= 1) {
      return 1;
    }

    const forcedCaptures = opponentMoves.every(m => m.type === 'capture');
    if (!forcedCaptures) {
      return 0;
    }

    for (const oppMove of opponentMoves) {
      if (this.countRecaptures(childEngine, oppMove) > 0) {
        return 1;
      }
    }

    return 0;
  }

  countRecaptures(parentEngine, opponentMove) {
    const followEngine = parentEngine.clone();
    const result = followEngine.makeMove(
      opponentMove.from.row,
      opponentMove.from.col,
      opponentMove.to.row,
      opponentMove.to.col
    );

    if (!result || result.success === false) {
      return 0;
    }

    const ourMoves = followEngine.getAllValidMoves();
    let count = 0;

    for (const move of ourMoves) {
      if (this.moveCapturesSquare(move, opponentMove.to.row, opponentMove.to.col)) {
        count++;
      }
    }

    return count;
  }

  moveCapturesSquare(move, targetRow, targetCol) {
    if (move.type !== 'capture') {
      return false;
    }

    const capturedPositions = Array.isArray(move.capturedPieces) && move.capturedPieces.length > 0
      ? move.capturedPieces
      : this.resolveCapturedPositions(move);

    return capturedPositions.some(pos => pos.row === targetRow && pos.col === targetCol);
  }

  evaluateTrapPotential(gameEngine, move) {
    const probeEngine = gameEngine.clone();
    const result = probeEngine.makeMove(
      move.from.row,
      move.from.col,
      move.to.row,
      move.to.col
    );

    if (!result || result.success === false) {
      return 0;
    }

    const opponentMoves = probeEngine.getAllValidMoves();
    if (opponentMoves.length === 0) {
      return 0;
    }

    const forcedCaptures = opponentMoves.every(m => m.type === 'capture');
    if (!forcedCaptures) {
      return 0;
    }

    let recaptureCount = 0;
    for (const oppMove of opponentMoves) {
      recaptureCount += this.countRecaptures(probeEngine, oppMove);
    }

    if (recaptureCount === 0) {
      return 0;
    }

    return FORCED_CAPTURE_BONUS + (recaptureCount * RECAPTURE_BONUS);
  }

  getBoardKey(gameEngine, depth, maximizingPlayer) {
    const boardStr = JSON.stringify(gameEngine.board.toArray());
    const playerToMove = maximizingPlayer ? this.player : this.opponent;
    return `${boardStr}_${playerToMove}_${depth}_${maximizingPlayer}`;
  }
}