import { HORSE_MOVES, BOARD_SIZE } from '../utils/constants';

export class MoveValidator {
  static getValidMoves(board, row, col) {
    const piece = board.getPieceAt(row, col);
    if (!piece) return [];

    const validMoves = [];

    for (const [dRow, dCol] of HORSE_MOVES) {
      const newRow = row + dRow;
      const newCol = col + dCol;

      if (!board.isValidPosition(newRow, newCol)) continue;

      const targetPiece = board.getPieceAt(newRow, newCol);

      if (!targetPiece || targetPiece.player !== piece.player) {
        validMoves.push({ row: newRow, col: newCol });
      }
    }

    return validMoves;
  }

  static isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
    const piece = board.getPieceAt(fromRow, fromCol);

    if (!piece || piece.player !== player) {
      return false;
    }

    const validMoves = this.getValidMoves(board, fromRow, fromCol);

    return validMoves.some(move =>
      move.row === toRow && move.col === toCol
    );
  }

  static getAllValidMovesForPlayer(board, player) {
    const allMoves = [];
    const horses = board.getPlayerHorses(player);

    for (const horse of horses) {
      const { row, col } = horse.position;
      const validMoves = this.getValidMoves(board, row, col);

      for (const move of validMoves) {
        allMoves.push({
          from: { row, col },
          to: move,
          piece: horse
        });
      }
    }

    return allMoves;
  }

  static canCapture(board, fromRow, fromCol, toRow, toCol) {
    const targetPiece = board.getPieceAt(toRow, toCol);
    const piece = board.getPieceAt(fromRow, fromCol);

    return targetPiece &&
           piece &&
           targetPiece.player !== piece.player;
  }

  static isKnightMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);

    return (rowDiff === 2 && colDiff === 1) ||
           (rowDiff === 1 && colDiff === 2);
  }
}