/**
 * Simple Test Runner for AI Performance
 * Run with: node src/testing/run_tests.js
 */

import { GameEngine } from '../game/GameEngine.js';
import { MinimaxAIQuiescence } from '../ai/MinimaxAIQuiescence.js';
import { EvaluationFunction } from '../ai/EvaluationFunction.js';
import { PLAYERS } from '../utils/constants.js';

console.log('🧪 Thai Checkers AI Performance Test');
console.log('='.repeat(50));

async function runBasicTests() {
  // Test 1: AI Speed Test
  console.log('\n⏱️  Speed Test');
  console.log('-'.repeat(20));

  const gameEngine = new GameEngine();
  // Board initializes automatically

  // Test Minimax with different depths
  const depths = [2, 3, 4];

  for (const depth of depths) {
    const ai = new MinimaxAIQuiescence(depth);

    const startTime = Date.now();

    try {
      const move = ai.getBestMove(gameEngine);
      const endTime = Date.now();

      console.log(`Minimax Depth ${depth}: ${endTime - startTime}ms`);

      if (move) {
        console.log(`  Best move: (${move.from.row},${move.from.col}) -> (${move.to.row},${move.to.col})`);
      } else {
        console.log(`  No move found`);
      }

    } catch (error) {
      console.log(`Minimax Depth ${depth}: ERROR - ${error.message}`);
    }
  }

  // Test 2: Evaluation Functions
  console.log('\n🎯 Evaluation Comparison');
  console.log('-'.repeat(20));

  try {
    const evalScore = EvaluationFunction.evaluate(gameEngine, PLAYERS.WHITE);
    console.log(`Evaluation Score: ${evalScore.toFixed(2)}`);
  } catch (error) {
    console.log(`Evaluation: ERROR - ${error.message}`);
  }

  // Test 3: Quick Game Simulation
  console.log('\n🎮 Quick Game Simulation');
  console.log('-'.repeat(20));

  const testGame = new GameEngine();
  // Board initializes automatically

  const ai1 = new MinimaxAIQuiescence(2);
  const ai2 = new MinimaxAIQuiescence(2);

  let moves = 0;
  const maxMoves = 50;

  console.log('Starting game: Minimax(2) vs Minimax(2)');

  while (!testGame.isGameOver() && moves < maxMoves) {
    try {
      const currentAI = testGame.currentPlayer === PLAYERS.WHITE ? ai1 : ai2;
      const move = currentAI.getBestMove(testGame);

      if (move) {
        testGame.makeMove(
          move.from.row, move.from.col,
          move.to.row, move.to.col
        );
        moves++;

        if (moves <= 10 || moves % 10 === 0) {
          console.log(`Move ${moves}: Player ${testGame.currentPlayer === PLAYERS.WHITE ? 'BLACK' : 'WHITE'} plays`);
        }
      } else {
        console.log('No valid moves available');
        break;
      }

    } catch (error) {
      console.log(`Game ended with error at move ${moves}: ${error.message}`);
      break;
    }
  }

  console.log(`Game finished after ${moves} moves`);

  if (testGame.isGameOver()) {
    const winner = testGame.getWinner();
    if (winner === PLAYERS.WHITE) {
      console.log('Winner: WHITE');
    } else if (winner === PLAYERS.BLACK) {
      console.log('Winner: BLACK');
    } else {
      console.log('Result: DRAW');
    }
  } else {
    console.log('Game timed out (50 move limit)');
  }

  // Test 4: Position Analysis
  console.log('\n🔍 Position Analysis');
  console.log('-'.repeat(20));

  analyzePosition(testGame);

  console.log('\n✅ Basic tests complete!');
  console.log('\nKey Findings:');
  console.log('- Use Minimax depth 2-3 for responsive gameplay');
  console.log('- Both AIs should complete games without errors');
}

function analyzePosition(gameEngine) {
  let whitePieces = 0, blackPieces = 0;
  let whiteKings = 0, blackKings = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameEngine.board.getPieceAt(row, col);

      if (!piece) continue;

      if (piece.player === PLAYERS.WHITE) {
        whitePieces++;
        if (piece.type === 'king') {
          whiteKings++;
        }
      } else if (piece.player === PLAYERS.BLACK) {
        blackPieces++;
        if (piece.type === 'king') {
          blackKings++;
        }
      }
    }
  }

  console.log(`White pieces: ${whitePieces} (${whiteKings} kings)`);
  console.log(`Black pieces: ${blackPieces} (${blackKings} kings)`);
  console.log(`Material balance: ${whitePieces - blackPieces}`);

  const validMoves = gameEngine.getAllValidMoves();
  console.log(`Valid moves for current player: ${validMoves.length}`);
}

// Run the tests
runBasicTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});