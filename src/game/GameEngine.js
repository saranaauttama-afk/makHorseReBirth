import { Board } from './Board';
import { MoveValidator } from './MoveValidator';
import { PLAYERS, GAME_STATUS } from '../utils/constants';

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
  }

  makeMove(fromRow, fromCol, toRow, toCol) {
    if (this.gameStatus !== GAME_STATUS.PLAYING) {
      return { success: false, error: 'Game has ended' };
    }

    if (!MoveValidator.isValidMove(
      this.board, fromRow, fromCol, toRow, toCol, this.currentPlayer
    )) {
      return { success: false, error: 'Invalid move' };
    }

    const capturedPiece = this.board.getPieceAt(toRow, toCol);

    const move = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      player: this.currentPlayer,
      turn: this.turnCount,
      captured: capturedPiece ? { ...capturedPiece } : null,
      timestamp: Date.now()
    };

    this.board.movePiece(fromRow, fromCol, toRow, toCol);

    if (capturedPiece) {
      this.capturedPieces[capturedPiece.player].push(capturedPiece);
    }

    this.moveHistory.push(move);
    this.lastMove = move;
    this.turnCount++;

    this.updateRepetitionCount();

    this.checkGameEnd();

    if (this.gameStatus === GAME_STATUS.PLAYING) {
      this.switchPlayer();
    }

    return {
      success: true,
      move,
      gameStatus: this.gameStatus,
      nextPlayer: this.currentPlayer
    };
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === PLAYERS.WHITE
      ? PLAYERS.BLACK
      : PLAYERS.WHITE;
  }

  checkGameEnd() {
    const whiteHorses = this.board.getPlayerHorses(PLAYERS.WHITE);
    const blackHorses = this.board.getPlayerHorses(PLAYERS.BLACK);

    if (whiteHorses.length === 0) {
      this.gameStatus = GAME_STATUS.BLACK_WIN;
      return;
    }

    if (blackHorses.length === 0) {
      this.gameStatus = GAME_STATUS.WHITE_WIN;
      return;
    }

    const currentPlayerMoves = MoveValidator.getAllValidMovesForPlayer(
      this.board, this.currentPlayer
    );

    if (currentPlayerMoves.length === 0) {
      this.gameStatus = this.currentPlayer === PLAYERS.WHITE
        ? GAME_STATUS.BLACK_WIN
        : GAME_STATUS.WHITE_WIN;
      return;
    }

    if (this.turnCount > 200) {
      this.gameStatus = GAME_STATUS.DRAW;
      return;
    }

    if (this.checkThreefoldRepetition()) {
      this.gameStatus = GAME_STATUS.DRAW;
      return;
    }
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

    this.board.movePiece(
      lastMove.to.row, lastMove.to.col,
      lastMove.from.row, lastMove.from.col
    );

    if (lastMove.captured) {
      this.board.setPieceAt(lastMove.to.row, lastMove.to.col, lastMove.captured);

      const capturedArray = this.capturedPieces[lastMove.captured.player];
      const index = capturedArray.findIndex(p => p.id === lastMove.captured.id);
      if (index !== -1) {
        capturedArray.splice(index, 1);
      }

      const horses = this.board.horses[lastMove.captured.player];
      horses.push(lastMove.captured);
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
      validMoves: this.getAllValidMoves()
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
  }
}