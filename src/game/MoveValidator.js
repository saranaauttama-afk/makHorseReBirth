import {
  BOARD_SIZE,
  PIECE_TYPES,
  MAN_MOVE_DIRECTIONS,
  KING_MOVE_DIRECTIONS,
  PROMOTION_ROW
} from '../utils/constants.js';

export class MoveValidator {
  static getValidMoves(board, row, col) {
    const piece = board.getPieceAt(row, col);
    if (!piece) return [];

    // ตรวจสอบการกินก่อน (บังคับกิน)
    const captureMoves = this.getCaptureMoves(board, row, col);

    if (captureMoves.length > 0) {
      return captureMoves;
    }

    // ถ้าไม่มีการกิน ให้เดินธรรมดา
    return this.getRegularMoves(board, row, col);
  }

  static getRegularMoves(board, row, col) {
    const piece = board.getPieceAt(row, col);
    if (!piece) return [];

    const moves = [];

    if (piece.type === PIECE_TYPES.MAN) {
      // หมากธรรมดาเดินได้แค่ 1 ช่อง
      const directions = MAN_MOVE_DIRECTIONS[piece.player];

      for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;

        if (board.isValidPosition(newRow, newCol) &&
            board.isDarkSquare(newRow, newCol) &&
            board.isEmpty(newRow, newCol)) {
          moves.push({
            from: { row, col },
            to: { row: newRow, col: newCol },
            type: 'move'
          });
        }
      }
    } else if (piece.type === PIECE_TYPES.KING) {
      // ฮอสเดินได้หลายช่องในเส้นทแยง
      for (const [dRow, dCol] of KING_MOVE_DIRECTIONS) {
        for (let distance = 1; distance < BOARD_SIZE; distance++) {
          const newRow = row + (dRow * distance);
          const newCol = col + (dCol * distance);

          if (!board.isValidPosition(newRow, newCol) ||
              !board.isDarkSquare(newRow, newCol)) {
            break;
          }

          if (!board.isEmpty(newRow, newCol)) {
            break; // ถ้ามีตัวหมากขวางทาง หยุด
          }

          moves.push({
            from: { row, col },
            to: { row: newRow, col: newCol },
            type: 'move'
          });
        }
      }
    }

    return moves;
  }

  static getCaptureMoves(board, row, col) {
    const piece = board.getPieceAt(row, col);
    if (!piece) return [];

    // ใช้ iterative approach แทน recursive เพื่อหาการกินต่อเนื่อง
    const allCapturePaths = [];
    this.findAllCapturePaths(board, row, col, piece, [], allCapturePaths);

    return allCapturePaths;
  }

  static findAllCapturePaths(board, row, col, piece, capturedSoFar, allPaths) {
    const currentCaptures = this.getSingleCaptureMoves(board, row, col, piece, capturedSoFar);

    if (currentCaptures.length === 0) {
      // ไม่มีการกินต่อ ให้บันทึก path ปัจจุบัน (ถ้ามีการกินแล้ว)
      if (capturedSoFar.length > 0) {
        const fullMove = {
          from: { row: capturedSoFar[0].from.row, col: capturedSoFar[0].from.col },
          to: { row, col },
          type: 'capture',
          capturedPieces: capturedSoFar.map(c => c.captured)
        };
        allPaths.push(fullMove);
      }
      return;
    }

    // มีการกินได้ ลองแต่ละ capture
    for (const capture of currentCaptures) {
      const newCaptured = [...capturedSoFar, {
        from: { row, col },
        to: capture.to,
        captured: capture.captured
      }];

      // สร้าง temp board เพื่อจำลองการกิน
      const tempBoard = board.clone();

      // ลบตัวที่ถูกกินทั้งหมดออก
      newCaptured.forEach(cap => {
        tempBoard.removePiece(cap.captured.row, cap.captured.col);
      });

      // ย้ายตัวหมากไปตำแหน่งใหม่
      tempBoard.removePiece(row, col);
      tempBoard.setPieceAt(capture.to.row, capture.to.col, piece);

      // หา capture ต่อไป
      this.findAllCapturePaths(
        tempBoard,
        capture.to.row,
        capture.to.col,
        piece,
        newCaptured,
        allPaths
      );
    }
  }

  static getSingleCaptureMoves(board, row, col, piece, alreadyCaptured) {
    const captureMoves = [];
    const capturedPositions = alreadyCaptured.map(c => `${c.captured.row},${c.captured.col}`);

    if (piece.type === PIECE_TYPES.MAN) {
      // หมากธรรมดา - กินแบบกระโดดข้าม 1 ช่อง
      const directions = MAN_MOVE_DIRECTIONS[piece.player];

      for (const [dRow, dCol] of directions) {
        const enemyRow = row + dRow;
        const enemyCol = col + dCol;
        const landRow = row + (dRow * 2);
        const landCol = col + (dCol * 2);

        if (this.canCapture(board, enemyRow, enemyCol, landRow, landCol, piece, capturedPositions)) {
          captureMoves.push({
            to: { row: landRow, col: landCol },
            captured: { row: enemyRow, col: enemyCol }
          });
        }
      }
    } else if (piece.type === PIECE_TYPES.KING) {
      // ฮอส - กินแบบกระโดดข้าม แล้วลงช่องถัดไป 1 ช่อง (เหมือนหมากธรรมดา)
      for (const [dRow, dCol] of KING_MOVE_DIRECTIONS) {
        // หาศัตรูในเส้นทแยง (สามารถอยู่ห่างได้หลายช่อง)
        for (let distance = 1; distance < BOARD_SIZE; distance++) {
          const enemyRow = row + (dRow * distance);
          const enemyCol = col + (dCol * distance);

          if (!board.isValidPosition(enemyRow, enemyCol) ||
              !board.isDarkSquare(enemyRow, enemyCol)) {
            break;
          }

          const enemyPiece = board.getPieceAt(enemyRow, enemyCol);
          const posKey = `${enemyRow},${enemyCol}`;

          if (enemyPiece) {
            // เจอตัวหมาก
            if (enemyPiece.player !== piece.player && !capturedPositions.includes(posKey)) {
              // เจอศัตรู - ลองกิน
              const landRow = enemyRow + dRow;  // ลงช่องถัดไป 1 ช่องเท่านั้น
              const landCol = enemyCol + dCol;

              if (this.canCapture(board, enemyRow, enemyCol, landRow, landCol, piece, capturedPositions)) {
                captureMoves.push({
                  to: { row: landRow, col: landCol },
                  captured: { row: enemyRow, col: enemyCol }
                });
              }
            }
            // หยุดการค้นหาในทิศทางนี้ (ไม่ว่าจะเป็นศัตรูหรือเพื่อน)
            break;
          }
        }
      }
    }

    return captureMoves;
  }

  static canCapture(board, enemyRow, enemyCol, landRow, landCol, piece, capturedPositions) {
    // ตรวจสอบตำแหน่งศัตรู
    if (!board.isValidPosition(enemyRow, enemyCol) ||
        !board.isValidPosition(landRow, landCol)) {
      return false;
    }

    // ตำแหน่งลงต้องเป็นช่องดำและว่าง
    if (!board.isDarkSquare(landRow, landCol) || !board.isEmpty(landRow, landCol)) {
      return false;
    }

    // ต้องมีศัตรูที่ตำแหน่งที่จะกิน
    const enemyPiece = board.getPieceAt(enemyRow, enemyCol);

    if (!enemyPiece || enemyPiece.player === piece.player) {
      return false;
    }

    // ตรวจสอบว่าไม่ได้กินตัวเดิมซ้ำ
    const posKey = `${enemyRow},${enemyCol}`;
    return !capturedPositions.includes(posKey);
  }

  static getAllValidMovesForPlayer(board, player) {
    const pieces = board.getPlayerPieces(player);
    let allCaptureMoves = [];

    // ตรวจสอบการกินจากทุกตัวก่อน
    for (const piece of pieces) {
      const { row, col } = piece.position;
      const captures = this.getCaptureMoves(board, row, col);
      allCaptureMoves.push(...captures);
    }

    // ถ้ามีการกิน บังคับให้กิน
    if (allCaptureMoves.length > 0) {
      return allCaptureMoves;
    }

    // ถ้าไม่มีการกิน ให้เดินธรรมดา
    const allRegularMoves = [];
    for (const piece of pieces) {
      const { row, col } = piece.position;
      const regularMoves = this.getRegularMoves(board, row, col);
      allRegularMoves.push(...regularMoves);
    }

    return allRegularMoves;
  }

  static isValidMove(board, fromRow, fromCol, toRow, toCol, player) {
    const piece = board.getPieceAt(fromRow, fromCol);

    if (!piece || piece.player !== player) {
      return false;
    }

    if (!board.isDarkSquare(toRow, toCol)) {
      return false;
    }

    const validMoves = this.getValidMoves(board, fromRow, fromCol);
    return validMoves.some(move =>
      move.to.row === toRow && move.to.col === toCol
    );
  }

  static needsPromotion(player, row) {
    return row === PROMOTION_ROW[player];
  }

  static getMoveDirections(piece) {
    if (piece.type === PIECE_TYPES.KING) {
      return KING_MOVE_DIRECTIONS;
    } else {
      return MAN_MOVE_DIRECTIONS[piece.player];
    }
  }
}