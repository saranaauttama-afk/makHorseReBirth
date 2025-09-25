import { Board } from './Board.js';
import { MoveValidator } from './MoveValidator.js';
import { PLAYERS, GAME_STATUS, PIECE_TYPES, PROMOTION_ROW } from '../utils/constants.js';

export class GameEngine {
  constructor() {
    this.board = new Board();
    this.currentPlayer = PLAYERS.WHITE;
    this.moveHistory = [];
    this.gameStatus = GAME_STATUS.PLAYING;
    this.turnCount = 0;
    this.capturedPieces = {
      [PLAYERS.WHITE]: [],
      [PLAYERS.BLACK]: []
    };
    this.lastMove = null;
    this.drawOfferCount = 0;
    this.repetitionCount = {};
    this.consecutiveMovesWithoutCapture = 0;
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    if (this.gameStatus !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'Game has ended' };
    }

    // ตรวจสอบว่าเป็น move ที่ valid
    const validMoves = MoveValidator.getValidMoves(this.board, fromRow, fromCol);
    const move = validMoves.find(m =>
      m.to.row === toRow && m.to.col === toCol
    );

    if (!move) {
      return { success: false, error: 'Invalid move' };
    }

    // ตรวจสอบว่าเป็นตัวของผู้เล่นปัจจุบัน
    const piece = this.board.getPieceAt(fromRow, fromCol);
    if (!piece || piece.player !== this.currentPlayer) {
      return { success: false, error: 'Not your piece' };
    }

    // บันทึก move ก่อนดำเนินการ
    const moveRecord = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      player: this.currentPlayer,
      turn: this.turnCount,
      type: move.type,
      capturedPieces: [],
      promoted: false,
      timestamp: Date.now()
    };

    // ดำเนินการตาม type ของ move
    if (move.type === 'capture') {
      this.executeCaptureMove(move, moveRecord);
    } else {
      this.executeRegularMove(fromRow, fromCol, toRow, toCol, moveRecord);
    }

    // ตรวจสอบการเลื่อนขั้นเป็นฮอส
    this.checkPromotion(toRow, toCol, moveRecord);

    // บันทึก move ลง history
    this.moveHistory.push(moveRecord);
    this.lastMove = moveRecord;
    this.turnCount++;

    // อัพเดท repetition count
    this.updateRepetitionCount();

    // ตรวจสอบการจบเกม
    this.checkGameEnd();

    // สลับตา (ถ้าเกมยังไม่จบ)
    if (this.gameStatus === GAME_STATUS.PLAYING) {
      this.switchPlayer();
    }

    return {
      success: true,
      move: moveRecord,
      gameStatus: this.gameStatus,
      nextPlayer: this.currentPlayer
    };
  }

  executeRegularMove(fromRow, fromCol, toRow, toCol, moveRecord) {
    this.board.movePiece(fromRow, fromCol, toRow, toCol);
    this.consecutiveMovesWithoutCapture++;
  }

  executeCaptureMove(move, moveRecord) {
    // ย้ายตัวหมาก
    this.board.movePiece(move.from.row, move.from.col, move.to.row, move.to.col);

    // ลบตัวที่ถูกกิน
    if (move.capturedPieces) {
      move.capturedPieces.forEach(capturedPos => {
        const capturedPiece = this.board.getPieceAt(capturedPos.row, capturedPos.col);
        if (capturedPiece) {
          this.board.removePiece(capturedPos.row, capturedPos.col);
          this.capturedPieces[capturedPiece.player].push(capturedPiece);
          moveRecord.capturedPieces.push(capturedPiece);
        }
      });
    }

    this.consecutiveMovesWithoutCapture = 0;
  }

  checkPromotion(row, col, moveRecord) {
    const piece = this.board.getPieceAt(row, col);

    if (piece &&
        piece.type === PIECE_TYPES.MAN &&
        MoveValidator.needsPromotion(piece.player, row)) {
      this.board.promotePiece(row, col);
      moveRecord.promoted = true;
    }
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === PLAYERS.WHITE
      ? PLAYERS.BLACK
      : PLAYERS.WHITE;
  }

  checkGameEnd() {
    const whitePieces = this.board.countPieces(PLAYERS.WHITE);
    const blackPieces = this.board.countPieces(PLAYERS.BLACK);

    // ชนะเมื่อฝ่ายตรงข้ามไม่มีตัวหมาก
    if (whitePieces === 0) {
      this.gameStatus = GAME_STATUS.BLACK_WIN;
      return;
    }

    if (blackPieces === 0) {
      this.gameStatus = GAME_STATUS.WHITE_WIN;
      return;
    }

    // ชนะเมื่อฝ่ายตรงข้ามไม่สามารถเดินได้
    const currentPlayerMoves = MoveValidator.getAllValidMovesForPlayer(
      this.board, this.currentPlayer
    );

    if (currentPlayerMoves.length === 0) {
      this.gameStatus = this.currentPlayer === PLAYERS.WHITE
        ? GAME_STATUS.BLACK_WIN
        : GAME_STATUS.WHITE_WIN;
      return;
    }

    // เสมอเมื่อไม่มีการกินนานเกินไป (40 รอบ = 80 move)
    if (this.consecutiveMovesWithoutCapture >= 80) {
      this.gameStatus = GAME_STATUS.DRAW;
      return;
    }

    // เสมอเมื่อเหลือแค่ฮอส vs ฮอส
    if (this.isKingVsKingDraw()) {
      this.gameStatus = GAME_STATUS.DRAW;
      return;
    }

    // เสมอเมื่อเกิดการวนซ้ำ 3 รอบ
    if (this.checkThreefoldRepetition()) {
      this.gameStatus = GAME_STATUS.DRAW;
      return;
    }
  }

  isKingVsKingDraw() {
    const whitePieces = this.board.getPlayerPieces(PLAYERS.WHITE);
    const blackPieces = this.board.getPlayerPieces(PLAYERS.BLACK);

    // ถ้าเหลือน้อยกว่า 3 ตัวรวมกัน และส่วนใหญ่เป็นฮอส
    const totalPieces = whitePieces.length + blackPieces.length;
    if (totalPieces <= 3) {
      const whiteKings = this.board.countKings(PLAYERS.WHITE);
      const blackKings = this.board.countKings(PLAYERS.BLACK);

      // ถ้าเหลือแค่ฮอสเท่านั้น
      return whiteKings === whitePieces.length && blackKings === blackPieces.length;
    }

    return false;
  }

  updateRepetitionCount() {
    const boardKey = this.getBoardKey();
    this.repetitionCount[boardKey] = (this.repetitionCount[boardKey] || 0) + 1;
  }

  checkThreefoldRepetition() {
    const boardKey = this.getBoardKey();
    return this.repetitionCount[boardKey] >= 3;
  }

  getBoardKey() {
    return JSON.stringify(this.board.toArray()) + this.currentPlayer;
  }

  undoMove() {
    if (this.moveHistory.length === 0) return false;

    const lastMove = this.moveHistory.pop();

    // ย้ายตัวหมากกลับ
    this.board.movePiece(
      lastMove.to.row, lastMove.to.col,
      lastMove.from.row, lastMove.from.col
    );

    // ถ้าเป็นการกิน ให้คืนตัวที่ถูกกิน
    if (lastMove.capturedPieces && lastMove.capturedPieces.length > 0) {
      lastMove.capturedPieces.forEach(capturedPiece => {
        this.board.setPieceAt(
          capturedPiece.position.row,
          capturedPiece.position.col,
          capturedPiece
        );

        // เพิ่มกลับใน pieces array
        this.board.pieces[capturedPiece.player].push(capturedPiece);

        // ลบจาก captured array
        const capturedArray = this.capturedPieces[capturedPiece.player];
        const index = capturedArray.findIndex(p => p.id === capturedPiece.id);
        if (index !== -1) {
          capturedArray.splice(index, 1);
        }
      });
    }

    // ถ้ามีการเลื่อนขั้น ให้ลดขั้นกลับ
    if (lastMove.promoted) {
      const piece = this.board.getPieceAt(lastMove.from.row, lastMove.from.col);
      if (piece) {
        piece.type = PIECE_TYPES.MAN;
      }
    }

    this.turnCount--;
    this.switchPlayer();
    this.gameStatus = GAME_STATUS.PLAYING;
    this.lastMove = this.moveHistory[this.moveHistory.length - 1] || null;

    return true;
  }

  getValidMovesForPiece(row, col) {
    return MoveValidator.getValidMoves(this.board, row, col);
  }

  getAllValidMoves() {
    return MoveValidator.getAllValidMovesForPlayer(
      this.board, this.currentPlayer
    );
  }

  isGameOver() {
    return this.gameStatus !== GAME_STATUS.PLAYING;
  }

  getWinner() {
    if (this.gameStatus === GAME_STATUS.WHITE_WIN) return PLAYERS.WHITE;
    if (this.gameStatus === GAME_STATUS.BLACK_WIN) return PLAYERS.BLACK;
    return null;
  }

  clone() {
    const clonedEngine = new GameEngine();
    clonedEngine.board = this.board.clone();
    clonedEngine.currentPlayer = this.currentPlayer;
    clonedEngine.moveHistory = [...this.moveHistory];
    clonedEngine.gameStatus = this.gameStatus;
    clonedEngine.turnCount = this.turnCount;
    clonedEngine.capturedPieces = {
      [PLAYERS.WHITE]: [...this.capturedPieces[PLAYERS.WHITE]],
      [PLAYERS.BLACK]: [...this.capturedPieces[PLAYERS.BLACK]]
    };
    clonedEngine.lastMove = this.lastMove ? { ...this.lastMove } : null;
    clonedEngine.repetitionCount = { ...this.repetitionCount };
    clonedEngine.consecutiveMovesWithoutCapture = this.consecutiveMovesWithoutCapture;
    return clonedEngine;
  }

  getGameState() {
    return {
      board: this.board.toArray(),
      currentPlayer: this.currentPlayer,
      gameStatus: this.gameStatus,
      turnCount: this.turnCount,
      moveHistory: this.moveHistory,
      capturedPieces: this.capturedPieces,
      lastMove: this.lastMove,
      validMoves: this.getAllValidMoves(),
      whiteCount: this.board.countPieces(PLAYERS.WHITE),
      blackCount: this.board.countPieces(PLAYERS.BLACK),
      whiteKings: this.board.countKings(PLAYERS.WHITE),
      blackKings: this.board.countKings(PLAYERS.BLACK)
    };
  }

  loadGameState(state) {
    this.currentPlayer = state.currentPlayer;
    this.gameStatus = state.gameStatus;
    this.turnCount = state.turnCount;
    this.moveHistory = state.moveHistory || [];
    this.capturedPieces = state.capturedPieces || {
      [PLAYERS.WHITE]: [],
      [PLAYERS.BLACK]: []
    };
    this.lastMove = state.lastMove || null;
    this.consecutiveMovesWithoutCapture = state.consecutiveMovesWithoutCapture || 0;
  }
}