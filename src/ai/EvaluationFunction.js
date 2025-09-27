import { PLAYERS, BOARD_SIZE, PIECE_TYPES } from '../utils/constants.js';
import { MoveValidator } from '../game/MoveValidator.js';

export class EvaluationFunction {
  static WEIGHTS = {
    PIECE_VALUE: 100,
    KING_VALUE: 300,
    CENTER_CONTROL: 5,
    MOBILITY: 15,
    BACK_ROW_BONUS: 10,
    ATTACK_THREAT: 25,
    ENDGAME_BONUS: 50,
    CORNER_PENALTY: -15,
    EDGE_PENALTY: -8,
    ADVANCEMENT: 12,
    KING_CENTRALIZATION: 20,
    PIECE_UNDER_ATTACK: -80,
    TEMPO: 3
  };

  static evaluate(gameEngine, player) {
    if (gameEngine.isGameOver()) {
      const winner = gameEngine.getWinner();
      if (winner === player) return 5000;
      if (winner !== null) return -5000;
      return 0;
    }

    let score = 0;

    score += this.evaluateMaterial(gameEngine, player);
    score += this.evaluatePosition(gameEngine, player);
    score += this.evaluateMobility(gameEngine, player);
    score += this.evaluateThreats(gameEngine, player);
    score += this.evaluateEndgame(gameEngine, player);
    score += this.evaluateAdvancement(gameEngine, player);
    score += this.evaluateKingPosition(gameEngine, player);
    score += this.evaluateTempo(gameEngine, player);

    return score;
  }

  static evaluateMaterial(gameEngine, player) {
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;

    const myPieces = gameEngine.board.countPieces(player);
    const myKings = gameEngine.board.countKings(player);
    const myMen = myPieces - myKings;

    const oppPieces = gameEngine.board.countPieces(opponent);
    const oppKings = gameEngine.board.countKings(opponent);
    const oppMen = oppPieces - oppKings;

    const menAdvantage = (myMen - oppMen) * this.WEIGHTS.PIECE_VALUE;
    const kingAdvantage = (myKings - oppKings) * this.WEIGHTS.KING_VALUE;

    return menAdvantage + kingAdvantage;
  }

  static evaluatePosition(gameEngine, player) {
    let score = 0;
    const myPieces = gameEngine.board.getPlayerPieces(player);

    for (const piece of myPieces) {
      const { row, col } = piece.position;

      if (piece.type === PIECE_TYPES.MAN) {
        score += this.getCenterControlScore(row, col);
        score += this.getEdgePenalty(row, col);

        if (player === PLAYERS.WHITE && row === 0) {
          score += this.WEIGHTS.BACK_ROW_BONUS;
        } else if (player === PLAYERS.BLACK && row === 7) {
          score += this.WEIGHTS.BACK_ROW_BONUS;
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
      gameEngine.board,
      player
    ).length;

    gameEngine.currentPlayer = opponent;
    const oppMoves = MoveValidator.getAllValidMovesForPlayer(
      gameEngine.board,
      opponent
    ).length;

    gameEngine.currentPlayer = originalPlayer;

    return (myMoves - oppMoves) * this.WEIGHTS.MOBILITY;
  }

  static evaluateThreats(gameEngine, player) {
    let score = 0;
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    const myPieces = gameEngine.board.getPlayerPieces(player);
    const oppPieces = gameEngine.board.getPlayerPieces(opponent);

    const originalPlayer = gameEngine.currentPlayer;

    gameEngine.currentPlayer = player;
    const myMoves = MoveValidator.getAllValidMovesForPlayer(gameEngine.board, player);
    const myCaptures = myMoves.filter(m => m.type === 'capture');
    score += myCaptures.length * this.WEIGHTS.ATTACK_THREAT;

    gameEngine.currentPlayer = opponent;
    const oppMoves = MoveValidator.getAllValidMovesForPlayer(gameEngine.board, opponent);
    const oppCaptures = oppMoves.filter(m => m.type === 'capture');

    for (const capture of oppCaptures) {
      const capturedPieces = Array.isArray(capture.capturedPieces)
        ? capture.capturedPieces
        : [];

      for (const capturedPos of capturedPieces) {
        const capturedPiece = gameEngine.board.getPieceAt(capturedPos.row, capturedPos.col);
        if (capturedPiece && capturedPiece.player === player) {
          score += this.WEIGHTS.PIECE_UNDER_ATTACK;
          if (capturedPiece.type === PIECE_TYPES.KING) {
            score += this.WEIGHTS.PIECE_UNDER_ATTACK;
          }
        }
      }
    }

    gameEngine.currentPlayer = originalPlayer;

    return score;
  }

  static evaluateEndgame(gameEngine, player) {
    const totalPieces =
      gameEngine.board.countPieces(PLAYERS.WHITE) +
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
          score -= distance * 1.5;
        }
      }
    }

    return score;
  }

  static getManhattanDistance(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  static evaluateAdvancement(gameEngine, player) {
    let score = 0;
    const myPieces = gameEngine.board.getPlayerPieces(player);

    for (const piece of myPieces) {
      if (piece.type === PIECE_TYPES.MAN) {
        if (player === PLAYERS.WHITE) {
          score += (7 - piece.position.row) * this.WEIGHTS.ADVANCEMENT;
        } else {
          score += piece.position.row * this.WEIGHTS.ADVANCEMENT;
        }
      }
    }

    return score;
  }

  static evaluateKingPosition(gameEngine, player) {
    let score = 0;
    const myKings = gameEngine.board
      .getPlayerPieces(player)
      .filter(p => p.type === PIECE_TYPES.KING);
    const opponent = player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;
    const oppPieces = gameEngine.board.getPlayerPieces(opponent);
    const myPieces = gameEngine.board.getPlayerPieces(player);

    const totalPieces = myPieces.length + oppPieces.length;

    for (const king of myKings) {
      const { row, col } = king.position;

      if (totalPieces <= 6) {
        const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
        score += (7 - centerDistance) * this.WEIGHTS.KING_CENTRALIZATION;
      }

      score += this.getEdgePenalty(row, col);
    }

    return score;
  }

  static evaluateTempo(gameEngine, player) {
    if (gameEngine.currentPlayer === player) {
      return this.WEIGHTS.TEMPO;
    }
    return 0;
  }
}