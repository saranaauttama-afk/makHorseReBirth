import { PLAYERS, BOARD_SIZE } from '../utils/constants';
import { MoveValidator } from '../game/MoveValidator';

export class EvaluationFunction {
  static WEIGHTS = {
    PIECE_VALUE: 1000,
    CENTER_CONTROL: 15,
    MOBILITY: 8,
    ENEMY_DISTANCE: -5,
    ALLY_DISTANCE: 3,
    ATTACK_THREAT: 25,
    PROTECTION: 10,
    ENDGAME_BONUS: 30,
    CORNER_PENALTY: -20,
    EDGE_PENALTY: -10
  };

  static evaluate(gameEngine, player) {
    if (gameEngine.isGameOver()) {
      const winner = gameEngine.getWinner();
      if (winner === player) return 100000;
      if (winner !== null) return -100000;
      return 0;
    }

    let score = 0;

    score += this.evaluateMaterial(gameEngine, player);
    score += this.evaluatePosition(gameEngine, player);
    score += this.evaluateMobility(gameEngine, player);
    score += this.evaluateThreats(gameEngine, player);
    score += this.evaluateEndgame(gameEngine, player);

    return score;
  }

  static evaluateMaterial(gameEngine, player) {
    const myPieces = gameEngine.board.countPieces(player);
    const oppPieces = gameEngine.board.countPieces(
      player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE
    );

    return (myPieces - oppPieces) * this.WEIGHTS.PIECE_VALUE;
  }

  static evaluatePosition(gameEngine, player) {
    let score = 0;
    const myPieces = gameEngine.board.getPlayerPieces(player);
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    const oppPieces = gameEngine.board.getPlayerPieces(opponent);

    for (const piece of myPieces) {
      const { row, col } = piece.position;

      score += this.getCenterControlScore(row, col);
      score += this.getEdgePenalty(row, col);

      for (const oppPiece of oppPieces) {
        const distance = this.getManhattanDistance(
          row, col,
          oppPiece.position.row,
          oppPiece.position.col
        );
        score += distance * this.WEIGHTS.ENEMY_DISTANCE;
      }

      for (const allyPiece of myPieces) {
        if (allyPiece.id !== piece.id) {
          const distance = this.getManhattanDistance(
            row, col,
            allyPiece.position.row,
            allyPiece.position.col
          );
          score += Math.max(0, 4 - distance) * this.WEIGHTS.ALLY_DISTANCE;
        }
      }
    }

    return score;
  }

  static getCenterControlScore(row, col) {
    const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
    return (7 - centerDistance) * this.WEIGHTS.CENTER_CONTROL;
  }

  static getEdgePenalty(row, col) {
    let penalty = 0;

    if (row === 0 || row === BOARD_SIZE - 1) {
      penalty += this.WEIGHTS.EDGE_PENALTY;
    }
    if (col === 0 || col === BOARD_SIZE - 1) {
      penalty += this.WEIGHTS.EDGE_PENALTY;
    }

    if ((row === 0 || row === BOARD_SIZE - 1) &&
        (col === 0 || col === BOARD_SIZE - 1)) {
      penalty += this.WEIGHTS.CORNER_PENALTY;
    }

    return penalty;
  }

  static evaluateMobility(gameEngine, player) {
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;

    const originalPlayer = gameEngine.currentPlayer;

    gameEngine.currentPlayer = player;
    const myMoves = MoveValidator.getAllValidMovesForPlayer(
      gameEngine.board, player
    ).length;

    gameEngine.currentPlayer = opponent;
    const oppMoves = MoveValidator.getAllValidMovesForPlayer(
      gameEngine.board, opponent
    ).length;

    gameEngine.currentPlayer = originalPlayer;

    return (myMoves - oppMoves) * this.WEIGHTS.MOBILITY;
  }

  static evaluateThreats(gameEngine, player) {
    let score = 0;
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    const myPieces = gameEngine.board.getPlayerPieces(player);
    const oppPieces = gameEngine.board.getPlayerPieces(opponent);

    for (const piece of myPieces) {
      const { row, col } = piece.position;
      const validMoves = MoveValidator.getValidMoves(gameEngine.board, row, col);

      for (const move of validMoves) {
        if (move.type === 'capture' && move.captured) {
          score += this.WEIGHTS.ATTACK_THREAT;
        }
      }

      for (const allyPiece of myPieces) {
        if (allyPiece.id !== piece.id) {
          const protectionMoves = MoveValidator.getValidMoves(
            gameEngine.board,
            allyPiece.position.row,
            allyPiece.position.col
          );

          if (protectionMoves.some(m => m.to.row === row && m.to.col === col)) {
            score += this.WEIGHTS.PROTECTION;
          }
        }
      }
    }

    return score;
  }

  static evaluateEndgame(gameEngine, player) {
    const totalPieces = gameEngine.board.countPieces(PLAYERS.WHITE) +
                        gameEngine.board.countPieces(PLAYERS.BLACK);

    if (totalPieces > 4) return 0;

    let score = 0;
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    const myPieces = gameEngine.board.getPlayerPieces(player);
    const oppPieces = gameEngine.board.getPlayerPieces(opponent);

    if (myPieces.length > oppPieces.length) {
      score += this.WEIGHTS.ENDGAME_BONUS * (myPieces.length - oppPieces.length);

      for (const myPiece of myPieces) {
        for (const oppPiece of oppPieces) {
          const distance = this.getManhattanDistance(
            myPiece.position.row,
            myPiece.position.col,
            oppPiece.position.row,
            oppPiece.position.col
          );
          score -= distance * 2;
        }
      }
    }

    return score;
  }

  static getManhattanDistance(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  static getKnightDistance(r1, c1, r2, c2) {
    const dx = Math.abs(r1 - r2);
    const dy = Math.abs(c1 - c2);

    if (dx + dy === 1) return 3;
    if (dx === 2 && dy === 1) return 1;
    if (dx === 1 && dy === 2) return 1;
    if (dx === 2 && dy === 2) return 2;
    if (dx === 1 && dy === 1) return 2;

    const m = Math.max(dx, dy);
    const n = Math.min(dx, dy);

    if (n <= m / 2) {
      return Math.ceil(m / 2);
    } else {
      return Math.ceil((m + n) / 3);
    }
  }
}