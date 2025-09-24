import { GameEngine } from './GameEngine';
import { PLAYERS, GAME_STATUS, PIECE_TYPES } from '../utils/constants';

function runThaiCheckersTests() {
  console.log('🧪 Testing Thai Checkers Engine...\n');

  const testInitialSetup = () => {
    console.log('Test: Initial board setup');
    const game = new GameEngine();

    const whiteCount = game.board.countPieces(PLAYERS.WHITE);
    const blackCount = game.board.countPieces(PLAYERS.BLACK);

    console.assert(whiteCount === 8, `White should have 8 pieces, got ${whiteCount}`);
    console.assert(blackCount === 8, `Black should have 8 pieces, got ${blackCount}`);
    console.assert(game.currentPlayer === PLAYERS.WHITE, 'White should start');
    console.assert(game.gameStatus === GAME_STATUS.PLAYING, 'Game should be playing');

    // ตรวจสอบตำแหน่งเริ่มต้น
    const whitePiece = game.board.getPieceAt(7, 0);
    const blackPiece = game.board.getPieceAt(0, 1);

    console.assert(whitePiece && whitePiece.player === PLAYERS.WHITE, 'White piece should be at (7,0)');
    console.assert(blackPiece && blackPiece.player === PLAYERS.BLACK, 'Black piece should be at (0,1)');

    // ตรวจสอบช่องว่าง
    const emptySquare = game.board.getPieceAt(3, 3);
    console.assert(emptySquare === null, 'Middle should be empty');

    game.board.print();
    console.log('✅ Initial setup test passed\n');
  };

  const testBasicMoves = () => {
    console.log('Test: Basic diagonal moves');
    const game = new GameEngine();

    // ตรวจสอบ valid moves ของตัวที่ (6,1)
    const validMoves = game.getValidMovesForPiece(6, 1);
    console.log(`Piece at (6,1) has ${validMoves.length} valid moves`);
    validMoves.forEach(move => {
      console.log(`- Can move to (${move.to.row},${move.to.col})`);
    });

    // ทดสอบเดินจริง
    const result = game.makeMove(6, 1, 5, 0);
    console.assert(result.success === true, 'Valid move should succeed');
    console.assert(game.currentPlayer === PLAYERS.BLACK, 'Should switch to black');

    const piece = game.board.getPieceAt(5, 0);
    console.assert(piece && piece.player === PLAYERS.WHITE, 'Piece should be at new position');

    const oldPos = game.board.getPieceAt(6, 1);
    console.assert(oldPos === null, 'Old position should be empty');

    game.board.print();
    console.log('✅ Basic moves test passed\n');
  };

  const testInvalidMoves = () => {
    console.log('Test: Invalid moves');
    const game = new GameEngine();

    // ลองเดินไปช่องขาว (invalid)
    let result = game.makeMove(6, 1, 5, 1);
    console.assert(result.success === false, 'Moving to light square should fail');

    // ลองเดินข้าม 2 ช่อง (invalid)
    result = game.makeMove(6, 1, 4, 3);
    console.assert(result.success === false, 'Moving 2 squares without capture should fail');

    // ลองเดินตัวของฝ่ายตรงข้าม
    result = game.makeMove(1, 0, 2, 1);
    console.assert(result.success === false, 'Moving opponent piece should fail');

    console.log('✅ Invalid moves test passed\n');
  };

  const testCapture = () => {
    console.log('Test: Capture mechanics');
    const game = new GameEngine();

    // จัดตำแหน่งให้กินได้
    game.makeMove(6, 1, 5, 0); // white เดิน
    game.makeMove(1, 0, 2, 1); // black เดิน
    game.makeMove(5, 0, 4, 1); // white เดิน
    game.makeMove(1, 2, 2, 3); // black เดิน

    console.log('\nBefore capture:');
    game.board.print();

    const blackCountBefore = game.board.countPieces(PLAYERS.BLACK);

    // white กิน black at (2,1)
    const captureResult = game.makeMove(4, 1, 3, 0);

    console.log('\nAfter capture:');
    game.board.print();

    console.assert(captureResult.success === true, 'Capture should succeed');

    const blackCountAfter = game.board.countPieces(PLAYERS.BLACK);
    console.assert(blackCountAfter === blackCountBefore - 1,
      `Black should lose 1 piece. Before: ${blackCountBefore}, After: ${blackCountAfter}`);

    // ตรวจสอบว่าตัวที่ถูกกินหายไป
    const capturedPos = game.board.getPieceAt(2, 1);
    console.assert(capturedPos === null, 'Captured piece should be removed');

    console.log('✅ Capture test passed\n');
  };

  const testPromotion = () => {
    console.log('Test: King promotion');
    const game = new GameEngine();

    // Clear board and place a white piece near promotion
    game.board = game.board.createEmptyBoard();
    game.board.grid = game.board.createEmptyBoard();
    game.board.pieces = { [PLAYERS.WHITE]: [], [PLAYERS.BLACK]: [] };

    // วาง white piece ใกล้แถวโปรโมท
    const whitePiece = {
      player: PLAYERS.WHITE,
      type: PIECE_TYPES.MAN,
      id: 'white_test',
      position: { row: 1, col: 0 }
    };

    game.board.setPieceAt(1, 0, whitePiece);
    game.board.pieces[PLAYERS.WHITE].push(whitePiece);

    console.log('Before promotion:');
    game.board.print();

    // เดินไป row 0 (promotion row สำหรับ white)
    game.board.movePiece(1, 0, 0, 1);
    game.checkPromotion(0, 1, {});

    const promotedPiece = game.board.getPieceAt(0, 1);
    console.assert(promotedPiece.type === PIECE_TYPES.KING, 'Piece should be promoted to king');

    console.log('After promotion:');
    game.board.print();
    console.log('✅ Promotion test passed\n');
  };

  const testMandatoryCapture = () => {
    console.log('Test: Mandatory capture rule');
    const game = new GameEngine();

    // จัดสถานการณ์ที่ต้องกิน
    game.board.grid = game.board.createEmptyBoard();
    game.board.pieces = { [PLAYERS.WHITE]: [], [PLAYERS.BLACK]: [] };

    // วาง white piece
    const whitePiece = {
      player: PLAYERS.WHITE,
      type: PIECE_TYPES.MAN,
      id: 'white_test',
      position: { row: 4, col: 1 }
    };
    game.board.setPieceAt(4, 1, whitePiece);
    game.board.pieces[PLAYERS.WHITE].push(whitePiece);

    // วาง black piece ที่กินได้
    const blackPiece = {
      player: PLAYERS.BLACK,
      type: PIECE_TYPES.MAN,
      id: 'black_test',
      position: { row: 3, col: 2 }
    };
    game.board.setPieceAt(3, 2, blackPiece);
    game.board.pieces[PLAYERS.BLACK].push(blackPiece);

    const allMoves = game.getAllValidMoves();
    console.log(`Available moves: ${allMoves.length}`);

    // ควรมีแค่ capture move เท่านั้น
    const captureMoves = allMoves.filter(move => move.type === 'capture');
    console.assert(captureMoves.length > 0, 'Should have capture moves available');
    console.assert(allMoves.length === captureMoves.length, 'Should only have capture moves when capture is possible');

    console.log('✅ Mandatory capture test passed\n');
  };

  const testGameEnd = () => {
    console.log('Test: Game end conditions');
    const game = new GameEngine();

    // จำลองสถานการณ์ที่ฝ่ายหนึ่งไม่มีตัวหมาก
    game.board.pieces[PLAYERS.BLACK] = [];

    game.checkGameEnd();
    console.assert(game.gameStatus === GAME_STATUS.WHITE_WIN, 'White should win when black has no pieces');
    console.assert(game.getWinner() === PLAYERS.WHITE, 'Winner should be white');

    console.log('✅ Game end test passed\n');
  };

  // Run all tests
  testInitialSetup();
  testBasicMoves();
  testInvalidMoves();
  testCapture();
  testPromotion();
  testMandatoryCapture();
  testGameEnd();

  console.log('🎉 All Thai Checkers tests passed!\n');
}

// Export for use in console
if (typeof window === 'undefined') {
  // Node.js environment
  runThaiCheckersTests();
}

export { runThaiCheckersTests };