/**
 * AI Performance Testing Suite
 * Tests and compares all AI implementations
 */

import { GameEngine } from '../game/GameEngine.js';
import { MinimaxAI } from '../ai/MinimaxAI.js';
import { NeuralNetworkAI } from '../ai/NeuralNetworkAI.js';
import { SimpleEvaluation } from '../ai/SimpleEvaluation.js';
import { EvaluationFunction } from '../ai/EvaluationFunction.js';
import { PLAYERS } from '../utils/constants.js';

export class AIPerformanceTest {
  constructor() {
    this.testResults = {};
    this.gameCount = 0;
  }

  /**
   * Run comprehensive AI performance tests
   */
  async runAllTests() {
    console.log('🧪 Starting AI Performance Tests');
    console.log('=' * 50);

    // Test 1: Speed Tests
    await this.testAISpeed();

    // Test 2: Evaluation Function Comparison
    this.testEvaluationFunctions();

    // Test 3: AI vs AI Matches
    await this.testAIMatches();

    // Test 4: Position Analysis
    this.testPositionAnalysis();

    // Generate Report
    this.generateReport();
  }

  /**
   * Test AI decision-making speed
   */
  async testAISpeed() {
    console.log('\n⏱️  Speed Test - Time per move');
    console.log('-'.repeat(30));

    const testPositions = this.generateTestPositions();
    const ais = [
      { name: 'Minimax-Depth-2', ai: new MinimaxAI(2) },
      { name: 'Minimax-Depth-3', ai: new MinimaxAI(3) },
      { name: 'Minimax-Depth-4', ai: new MinimaxAI(4) },
      { name: 'Neural-Network', ai: await this.createNeuralNetworkAI() }
    ];

    this.testResults.speedTest = {};

    for (const { name, ai } of ais) {
      if (!ai) {
        console.log(`❌ ${name}: Failed to initialize`);
        continue;
      }

      const times = [];

      for (let i = 0; i < Math.min(testPositions.length, 10); i++) {
        const gameEngine = testPositions[i];

        const startTime = Date.now();

        try {
          let move;
          if (ai instanceof MinimaxAIQuiescence) {
            move = ai.getBestMove(gameEngine);
          } else if (ai instanceof NeuralNetworkAI) {
            move = await ai.getBestMove(gameEngine);
          }

          const endTime = Date.now();
          times.push(endTime - startTime);
        } catch (error) {
          console.log(`❌ ${name}: Error on position ${i + 1}`);
          times.push(999999);
        }
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      this.testResults.speedTest[name] = {
        averageTime: avgTime,
        maxTime: maxTime,
        reliability: times.filter(t => t < 5000).length / times.length
      };

      console.log(`✅ ${name}: ${avgTime.toFixed(0)}ms avg, ${maxTime.toFixed(0)}ms max`);
    }
  }

  /**
   * Compare evaluation functions
   */
  testEvaluationFunctions() {
    console.log('\n🎯 Evaluation Function Test');
    console.log('-'.repeat(30));

    const testPositions = this.generateTestPositions(5);
    this.testResults.evaluationTest = {};

    for (let i = 0; i < testPositions.length; i++) {
      const gameEngine = testPositions[i];

      console.log(`\nPosition ${i + 1}:`);

      // Test original evaluation
      const originalScore = EvaluationFunction.evaluate(gameEngine, PLAYERS.WHITE);
      console.log(`  Original Eval: ${originalScore.toFixed(2)}`);

      // Test simple evaluation
      const simpleScore = SimpleEvaluation.evaluate(gameEngine, PLAYERS.WHITE);
      console.log(`  Simple Eval: ${simpleScore.toFixed(2)}`);

      // Test position features
      const pieces = this.analyzePosition(gameEngine);
      console.log(`  Material: W:${pieces.white.men}+${pieces.white.kings} vs B:${pieces.black.men}+${pieces.black.kings}`);
    }
  }

  /**
   * Run AI vs AI matches
   */
  async testAIMatches() {
    console.log('\n⚔️  AI vs AI Tournament');
    console.log('-'.repeat(30));

    const ais = {
      'Minimax-D2': new MinimaxAI(2),
      'Minimax-D3': new MinimaxAI(3),
      'Neural-Net': await this.createNeuralNetworkAI()
    };

    // Remove failed AIs
    Object.keys(ais).forEach(key => {
      if (!ais[key]) delete ais[key];
    });

    const aiNames = Object.keys(ais);
    this.testResults.tournament = {};

    // Round robin tournament
    for (let i = 0; i < aiNames.length; i++) {
      for (let j = i + 1; j < aiNames.length; j++) {
        const ai1Name = aiNames[i];
        const ai2Name = aiNames[j];

        console.log(`\n🥊 ${ai1Name} vs ${ai2Name}`);

        const results = await this.playMatch(ais[ai1Name], ais[ai2Name], 3);

        this.testResults.tournament[`${ai1Name}-vs-${ai2Name}`] = results;

        console.log(`   ${ai1Name}: ${results.ai1Wins} wins`);
        console.log(`   ${ai2Name}: ${results.ai2Wins} wins`);
        console.log(`   Draws: ${results.draws}`);
        console.log(`   Avg moves: ${results.avgMoves.toFixed(1)}`);
      }
    }
  }

  /**
   * Test position analysis capabilities
   */
  testPositionAnalysis() {
    console.log('\n🔍 Position Analysis Test');
    console.log('-'.repeat(30));

    // Create specific test positions
    const criticalPositions = [
      this.createEndgamePosition(),
      this.createTacticalPosition(),
      this.createOpeningPosition()
    ];

    this.testResults.positionAnalysis = [];

    criticalPositions.forEach((gameEngine, index) => {
      console.log(`\nAnalyzing Position ${index + 1}:`);

      const analysis = {
        positionType: ['Endgame', 'Tactical', 'Opening'][index],
        material: this.analyzePosition(gameEngine),
        evaluation: EvaluationFunction.evaluate(gameEngine, PLAYERS.WHITE)
      };

      try {
        const minimaxAI = new MinimaxAIQuiescence(3);
        analysis.minimaxMove = minimaxAI.getBestMove(gameEngine);
      } catch (error) {
        analysis.minimaxMove = null;
      }

      this.testResults.positionAnalysis.push(analysis);

      console.log(`  Material balance: ${analysis.material.balance}`);
      console.log(`  Evaluation: ${analysis.evaluation.toFixed(2)}`);
    });
  }

  /**
   * Generate test positions
   */
  generateTestPositions(count = 10) {
    const positions = [];

    for (let i = 0; i < count; i++) {
      const gameEngine = new GameEngine();
      gameEngine.initializeBoard();

      // Play some random moves to get different positions
      const numMoves = Math.floor(Math.random() * 20) + 5;

      for (let move = 0; move < numMoves && !gameEngine.isGameOver(); move++) {
        const validMoves = gameEngine.getAllValidMoves();
        if (validMoves.length === 0) break;

        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        gameEngine.makeMove(
          randomMove.from.row, randomMove.from.col,
          randomMove.to.row, randomMove.to.col
        );
      }

      if (!gameEngine.isGameOver()) {
        positions.push(gameEngine);
      }
    }

    return positions;
  }

  /**
   * Create Neural Network AI (with fallback)
   */
  async createNeuralNetworkAI() {
    try {
      const nnAI = new NeuralNetworkAI();
      const loaded = await nnAI.loadModel();
      return loaded ? nnAI : null;
    } catch (error) {
      console.log('⚠️  Neural Network AI not available');
      return null;
    }
  }

  /**
   * Play match between two AIs
   */
  async playMatch(ai1, ai2, games = 3) {
    let ai1Wins = 0, ai2Wins = 0, draws = 0;
    let totalMoves = 0;

    for (let game = 0; game < games; game++) {
      const gameEngine = new GameEngine();
      gameEngine.initializeBoard();

      let moves = 0;
      const maxMoves = 200;

      while (!gameEngine.isGameOver() && moves < maxMoves) {
        let move = null;

        try {
          if (gameEngine.currentPlayer === PLAYERS.WHITE) {
            if (ai1 instanceof MinimaxAIQuiescence) {
              move = ai1.getBestMove(gameEngine);
            } else if (ai1 instanceof NeuralNetworkAI) {
              move = await ai1.getBestMove(gameEngine);
            }
          } else {
            if (ai2 instanceof MinimaxAIQuiescence) {
              move = ai2.getBestMove(gameEngine);
            } else if (ai2 instanceof NeuralNetworkAI) {
              move = await ai2.getBestMove(gameEngine);
            }
          }

          if (move) {
            gameEngine.makeMove(
              move.from.row, move.from.col,
              move.to.row, move.to.col
            );
            moves++;
          } else {
            break; // No valid move
          }
        } catch (error) {
          console.log(`Game ${game + 1} ended with error:`, error.message);
          break;
        }
      }

      totalMoves += moves;

      if (gameEngine.isGameOver()) {
        const winner = gameEngine.getWinner();
        if (winner === PLAYERS.WHITE) {
          ai1Wins++;
        } else if (winner === PLAYERS.BLACK) {
          ai2Wins++;
        } else {
          draws++;
        }
      } else {
        draws++; // Timeout = draw
      }
    }

    return {
      ai1Wins,
      ai2Wins,
      draws,
      avgMoves: totalMoves / games
    };
  }

  /**
   * Analyze position for piece count and material
   */
  analyzePosition(gameEngine) {
    let whiteMen = 0, whiteKings = 0;
    let blackMen = 0, blackKings = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameEngine.board.getPieceAt(row, col);

        if (piece === 1) whiteMen++;
        else if (piece === 2) whiteKings++;
        else if (piece === -1) blackMen++;
        else if (piece === -2) blackKings++;
      }
    }

    const whiteMaterial = whiteMen * 100 + whiteKings * 200;
    const blackMaterial = blackMen * 100 + blackKings * 200;

    return {
      white: { men: whiteMen, kings: whiteKings, material: whiteMaterial },
      black: { men: blackMen, kings: blackKings, material: blackMaterial },
      balance: whiteMaterial - blackMaterial
    };
  }

  /**
   * Create specific test positions
   */
  createEndgamePosition() {
    const gameEngine = new GameEngine();
    gameEngine.board.clear();

    // Add few pieces for endgame
    gameEngine.board.setPieceAt(2, 1, 2);  // White king
    gameEngine.board.setPieceAt(5, 6, -1); // Black man
    gameEngine.board.setPieceAt(7, 4, -2); // Black king

    gameEngine.currentPlayer = PLAYERS.WHITE;
    return gameEngine;
  }

  createTacticalPosition() {
    const gameEngine = new GameEngine();
    gameEngine.board.clear();

    // Create a tactical capturing opportunity
    gameEngine.board.setPieceAt(3, 2, 1);  // White man
    gameEngine.board.setPieceAt(4, 3, -1); // Black man (can be captured)
    gameEngine.board.setPieceAt(6, 5, -1); // Black man
    gameEngine.board.setPieceAt(2, 1, 2);  // White king

    gameEngine.currentPlayer = PLAYERS.WHITE;
    return gameEngine;
  }

  createOpeningPosition() {
    const gameEngine = new GameEngine();
    gameEngine.initializeBoard();

    // Play a few opening moves
    gameEngine.makeMove(1, 0, 2, 1);  // White
    gameEngine.makeMove(6, 1, 5, 0);  // Black
    gameEngine.makeMove(1, 2, 3, 0);  // White

    return gameEngine;
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 AI PERFORMANCE TEST REPORT');
    console.log('='.repeat(60));

    // Speed Report
    if (this.testResults.speedTest) {
      console.log('\n⏱️  SPEED ANALYSIS');
      console.log('-'.repeat(20));

      Object.entries(this.testResults.speedTest).forEach(([name, data]) => {
        console.log(`${name}:`);
        console.log(`  Avg: ${data.averageTime.toFixed(0)}ms`);
        console.log(`  Max: ${data.maxTime.toFixed(0)}ms`);
        console.log(`  Reliability: ${(data.reliability * 100).toFixed(1)}%`);

        if (data.averageTime < 1000) {
          console.log(`  ✅ Fast and responsive`);
        } else if (data.averageTime < 3000) {
          console.log(`  ⚠️  Acceptable speed`);
        } else {
          console.log(`  ❌ Too slow for real-time play`);
        }
        console.log();
      });
    }

    // Tournament Results
    if (this.testResults.tournament) {
      console.log('⚔️  TOURNAMENT RESULTS');
      console.log('-'.repeat(20));

      Object.entries(this.testResults.tournament).forEach(([matchup, results]) => {
        console.log(`${matchup}:`);
        console.log(`  Results: ${results.ai1Wins}-${results.draws}-${results.ai2Wins}`);
        console.log(`  Avg game length: ${results.avgMoves.toFixed(1)} moves`);
        console.log();
      });
    }

    // Recommendations
    console.log('🔧 RECOMMENDATIONS');
    console.log('-'.repeat(20));

    if (this.testResults.speedTest) {
      const speeds = Object.entries(this.testResults.speedTest);
      const fastest = speeds.reduce((min, curr) =>
        curr[1].averageTime < min[1].averageTime ? curr : min
      );

      console.log(`Fastest AI: ${fastest[0]} (${fastest[1].averageTime.toFixed(0)}ms)`);

      const mostReliable = speeds.reduce((max, curr) =>
        curr[1].reliability > max[1].reliability ? curr : max
      );

      console.log(`Most Reliable: ${mostReliable[0]} (${(mostReliable[1].reliability * 100).toFixed(1)}%)`);
    }

    console.log('\n✅ For mobile gameplay, recommend:');
    console.log('   - Minimax depth 2-3 for fast response');
    console.log('   - Neural Network if properly trained');
    console.log('   - SimpleEvaluation for speed optimization');

    console.log('\n' + '='.repeat(60));
  }
}

// Export test runner function
export async function runAITests() {
  const testSuite = new AIPerformanceTest();
  await testSuite.runAllTests();
  return testSuite.testResults;
}