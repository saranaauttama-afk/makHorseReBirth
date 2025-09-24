import { GameEngine } from './GameEngine';
import { PLAYERS, GAME_STATUS } from '../utils/constants';

function runTests() {
  console.log('🧪 Starting Game Engine Tests...\n');

  const testInitialSetup = () => {
    console.log('Test: Initial board setup');
    const game = new GameEngine();

    const whiteHorses = game.board.getPlayerHorses(PLAYERS.WHITE);
    const blackHorses = game.board.getPlayerHorses(PLAYERS.BLACK);

    console.assert(whiteHorses.length === 2, 'White should have 2 horses');
    console.assert(blackHorses.length === 2, 'Black should have 2 horses');
    console.assert(game.currentPlayer === PLAYERS.WHITE, 'White should start');
    console.assert(game.gameStatus === GAME_STATUS.PLAYING, 'Game should be playing');

    console.log('✅ Initial setup test passed\n');
  };

  const testValidMoves = () => {
    console.log('Test: Valid horse moves');
    const game = new GameEngine();

    const validMoves = game.getValidMovesForPiece(7, 1);
    console.log(`Horse at (7,1) has ${validMoves.length} valid moves`);

    const expectedMoves = [
      {row: 5, col: 0}, {row: 5, col: 2}, {row: 6, col: 3}
    ];

    console.assert(validMoves.length === 3, `Should have 3 valid moves, got ${validMoves.length}`);
    console.log('✅ Valid moves test passed\n');
  };

  const testMakeMove = () => {
    console.log('Test: Making a move');
    const game = new GameEngine();

    const result = game.makeMove(7, 1, 5, 2);
    console.assert(result.success === true, 'Move should succeed');
    console.assert(game.currentPlayer === PLAYERS.BLACK, 'Should switch to black');
    console.assert(game.board.getPieceAt(7, 1) === null, 'Original position should be empty');
    console.assert(game.board.getPieceAt(5, 2) !== null, 'New position should have piece');

    console.log('✅ Make move test passed\n');
  };

  const testInvalidMove = () => {
    console.log('Test: Invalid move');
    const game = new GameEngine();

    const result = game.makeMove(7, 1, 7, 2);
    console.assert(result.success === false, 'Invalid move should fail');
    console.assert(result.error === 'Invalid move', 'Should return error message');
    console.assert(game.currentPlayer === PLAYERS.WHITE, 'Should still be white turn');

    console.log('✅ Invalid move test passed\n');
  };

  const testCapture = () => {
    console.log('Test: Capturing opponent piece');
    const game = new GameEngine();

    game.makeMove(7, 1, 5, 2);
    game.makeMove(0, 1, 2, 2);
    game.makeMove(5, 2, 3, 3);
    game.makeMove(2, 2, 3, 4);

    const beforeCapture = game.board.getPlayerHorses(PLAYERS.BLACK).length;
    const captureResult = game.makeMove(3, 3, 3, 4);
    const afterCapture = game.board.getPlayerHorses(PLAYERS.BLACK).length;

    console.assert(captureResult.success === true, 'Capture should succeed');
    console.assert(captureResult.move.captured !== null, 'Should have captured piece');
    console.assert(afterCapture === beforeCapture - 1, 'Black should lose one horse');

    console.log('✅ Capture test passed\n');
  };

  const testWinCondition = () => {
    console.log('Test: Win condition');
    const game = new GameEngine();

    game.board.horses[PLAYERS.BLACK] = [];
    game.checkGameEnd();

    console.assert(game.gameStatus === GAME_STATUS.WHITE_WIN, 'White should win when black has no horses');
    console.assert(game.getWinner() === PLAYERS.WHITE, 'Winner should be white');

    console.log('✅ Win condition test passed\n');
  };

  const testUndoMove = () => {
    console.log('Test: Undo move');
    const game = new GameEngine();

    const initialState = JSON.stringify(game.board.toArray());
    game.makeMove(7, 1, 5, 2);
    const afterMove = JSON.stringify(game.board.toArray());

    console.assert(initialState !== afterMove, 'Board should change after move');

    game.undoMove();
    const afterUndo = JSON.stringify(game.board.toArray());

    console.assert(initialState === afterUndo, 'Board should return to initial state');
    console.assert(game.currentPlayer === PLAYERS.WHITE, 'Should be white turn again');

    console.log('✅ Undo move test passed\n');
  };

  const testClone = () => {
    console.log('Test: Game cloning');
    const game = new GameEngine();
    game.makeMove(7, 1, 5, 2);

    const clone = game.clone();

    console.assert(clone !== game, 'Clone should be different object');
    console.assert(clone.board !== game.board, 'Board should be cloned');
    console.assert(clone.currentPlayer === game.currentPlayer, 'Current player should match');
    console.assert(clone.turnCount === game.turnCount, 'Turn count should match');

    clone.makeMove(0, 1, 2, 2);
    console.assert(game.currentPlayer !== clone.currentPlayer, 'Changes to clone should not affect original');

    console.log('✅ Clone test passed\n');
  };

  testInitialSetup();
  testValidMoves();
  testMakeMove();
  testInvalidMove();
  testCapture();
  testWinCondition();
  testUndoMove();
  testClone();

  console.log('🎉 All tests passed!\n');
}

runTests();