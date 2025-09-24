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
    const myHorses = gameEngine.board.getPlayerHorses(player).length;
    const oppHorses = gameEngine.board.getPlayerHorses(
      player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE
    ).length;

    return (myHorses - oppHorses) * this.WEIGHTS.PIECE_VALUE;
  }

  static evaluatePosition(gameEngine, player) {
    let score = 0;
    const myHorses = gameEngine.board.getPlayerHorses(player);
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    const oppHorses = gameEngine.board.getPlayerHorses(opponent);

    for (const horse of myHorses) {
      const { row, col } = horse.position;

      score += this.getCenterControlScore(row, col);
      score += this.getEdgePenalty(row, col);

      for (const oppHorse of oppHorses) {
        const distance = this.getManhattanDistance(
          row, col,
          oppHorse.position.row,
          oppHorse.position.col
        );
        score += distance * this.WEIGHTS.ENEMY_DISTANCE;
      }

      for (const allyHorse of myHorses) {
        if (allyHorse.id !== horse.id) {
          const distance = this.getManhattanDistance(
            row, col,
            allyHorse.position.row,
            allyHorse.position.col
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
    const myHorses = gameEngine.board.getPlayerHorses(player);
    const oppHorses = gameEngine.board.getPlayerHorses(opponent);

    for (const horse of myHorses) {
      const { row, col } = horse.position;
      const validMoves = MoveValidator.getValidMoves(gameEngine.board, row, col);

      for (const move of validMoves) {
        const targetPiece = gameEngine.board.getPieceAt(move.row, move.col);
        if (targetPiece && targetPiece.player === opponent) {
          score += this.WEIGHTS.ATTACK_THREAT;
        }
      }

      for (const allyHorse of myHorses) {
        if (allyHorse.id !== horse.id) {
          const protectionMoves = MoveValidator.getValidMoves(
            gameEngine.board,
            allyHorse.position.row,
            allyHorse.position.col
          );

          if (protectionMoves.some(m => m.row === row && m.col === col)) {
            score += this.WEIGHTS.PROTECTION;
          }
        }
      }
    }

    return score;
  }

  static evaluateEndgame(gameEngine, player) {
    const totalHorses = gameEngine.board.getPlayerHorses(PLAYERS.WHITE).length +
                        gameEngine.board.getPlayerHorses(PLAYERS.BLACK).length;

    if (totalHorses > 3) return 0;

    let score = 0;
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    const myHorses = gameEngine.board.getPlayerHorses(player);
    const oppHorses = gameEngine.board.getPlayerHorses(opponent);

    if (myHorses.length > oppHorses.length) {
      score += this.WEIGHTS.ENDGAME_BONUS * (myHorses.length - oppHorses.length);

      for (const myHorse of myHorses) {
        for (const oppHorse of oppHorses) {
          const distance = this.getManhattanDistance(
            myHorse.position.row,
            myHorse.position.col,
            oppHorse.position.row,
            oppHorse.position.col
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