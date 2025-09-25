import { GameEngine } from '../game/GameEngine.js';
import { MinimaxAI } from '../ai/MinimaxAI.js';
import { NeuralNetworkAI } from '../ai/NeuralNetworkAI.js';
import { PLAYERS, GAME_STATUS } from '../utils/constants.js';

/**
 * AI Benchmark system for comparing different AI implementations
 */
export class AIBenchmark {
  constructor() {
    this.results = [];
  }

  /**
   * Run a tournament between two AI players
   * @param {Object} ai1 - First AI player
   * @param {Object} ai2 - Second AI player
   * @param {number} games - Number of games to play
   */
  async runTournament(ai1, ai2, games = 10) {
    console.log(`\n🏆 AI Tournament: ${ai1.name} vs ${ai2.name}`);
    console.log(`Playing ${games} games...`);

    const results = {
      ai1Wins: 0,
      ai2Wins: 0,
      draws: 0,
      games: [],
      totalTime: 0,
      averageGameLength: 0
    };

    const startTime = Date.now();

    for (let i = 0; i < games; i++) {
      // Alternate colors
      const ai1Player = i % 2 === 0 ? PLAYERS.WHITE : PLAYERS.BLACK;
      const ai2Player = ai1Player === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;

      const gameResult = await this.playGame(
        { ai: ai1.ai, player: ai1Player, name: ai1.name },
        { ai: ai2.ai, player: ai2Player, name: ai2.name }
      );

      results.games.push(gameResult);

      // Update win counts
      if (gameResult.winner === ai1Player) {
        results.ai1Wins++;
      } else if (gameResult.winner === ai2Player) {
        results.ai2Wins++;
      } else {
        results.draws++;
      }

      // Progress update
      if ((i + 1) % Math.max(1, Math.floor(games / 10)) === 0) {
        const progress = ((i + 1) / games * 100).toFixed(1);
        console.log(`Progress: ${progress}% (${i + 1}/${games})`);
      }
    }

    results.totalTime = Date.now() - startTime;
    results.averageGameLength = results.games.reduce((sum, game) => sum + game.moves, 0) / games;

    this.printTournamentResults(ai1.name, ai2.name, results);
    this.results.push({ ai1: ai1.name, ai2: ai2.name, ...results });

    return results;
  }

  /**
   * Play a single game between two AIs
   */
  async playGame(player1, player2) {
    const gameEngine = new GameEngine();
    const gameRecord = {
      timestamp: new Date().toISOString(),
      players: {
        white: player1.player === PLAYERS.WHITE ? player1.name : player2.name,
        black: player1.player === PLAYERS.BLACK ? player1.name : player2.name
      },
      moves: 0,
      winner: null,
      endReason: '',
      moveLog: []
    };

    let turnCount = 0;
    const maxTurns = 200; // Prevent infinite games

    while (gameEngine.gameStatus === GAME_STATUS.PLAYING && turnCount < maxTurns) {
      const currentAI = gameEngine.currentPlayer === player1.player ? player1.ai : player2.ai;
      const currentPlayer = gameEngine.currentPlayer === player1.player ? player1.name : player2.name;

      try {
        // Get AI move with timeout
        const moveStartTime = Date.now();
        const move = await Promise.race([
          currentAI.getBestMove(gameEngine),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Move timeout')), 10000) // 10 second timeout
          )
        ]);
        const moveTime = Date.now() - moveStartTime;

        if (!move) {
          gameRecord.endReason = `${currentPlayer} has no valid moves`;
          break;
        }

        // Record move
        gameRecord.moveLog.push({
          turn: turnCount + 1,
          player: currentPlayer,
          move: move,
          time: moveTime
        });

        // Make move
        const result = gameEngine.makeMove(
          move.from.row, move.from.col,
          move.to.row, move.to.col
        );

        if (!result.success) {
          gameRecord.endReason = `Invalid move by ${currentPlayer}`;
          break;
        }

        turnCount++;

      } catch (error) {
        console.error(`Error getting move from ${currentPlayer}:`, error.message);
        gameRecord.endReason = `${currentPlayer} error: ${error.message}`;
        break;
      }
    }

    // Determine winner
    if (gameEngine.gameStatus === GAME_STATUS.WHITE_WIN) {
      gameRecord.winner = PLAYERS.WHITE;
      gameRecord.endReason = gameRecord.endReason || 'White wins - Black has no pieces';
    } else if (gameEngine.gameStatus === GAME_STATUS.BLACK_WIN) {
      gameRecord.winner = PLAYERS.BLACK;
      gameRecord.endReason = gameRecord.endReason || 'Black wins - White has no pieces';
    } else if (turnCount >= maxTurns) {
      gameRecord.endReason = 'Draw - Maximum turns reached';
      // Determine winner by piece count
      const whiteCount = gameEngine.board.countPieces(PLAYERS.WHITE);
      const blackCount = gameEngine.board.countPieces(PLAYERS.BLACK);
      if (whiteCount > blackCount) {
        gameRecord.winner = PLAYERS.WHITE;
      } else if (blackCount > whiteCount) {
        gameRecord.winner = PLAYERS.BLACK;
      }
    }

    gameRecord.moves = turnCount;
    return gameRecord;
  }

  /**
   * Print tournament results
   */
  printTournamentResults(ai1Name, ai2Name, results) {
    console.log('\n📊 Tournament Results:');
    console.log('======================');
    console.log(`${ai1Name}: ${results.ai1Wins} wins (${(results.ai1Wins / results.games.length * 100).toFixed(1)}%)`);
    console.log(`${ai2Name}: ${results.ai2Wins} wins (${(results.ai2Wins / results.games.length * 100).toFixed(1)}%)`);
    console.log(`Draws: ${results.draws} (${(results.draws / results.games.length * 100).toFixed(1)}%)`);
    console.log(`Total time: ${(results.totalTime / 1000).toFixed(1)} seconds`);
    console.log(`Average game length: ${results.averageGameLength.toFixed(1)} moves`);

    // Performance metrics
    const ai1Moves = results.games.filter(g =>
      (g.players.white === ai1Name && g.winner === PLAYERS.WHITE) ||
      (g.players.black === ai1Name && g.winner === PLAYERS.BLACK)
    );

    if (ai1Moves.length > 0) {
      const avgWinMoves = ai1Moves.reduce((sum, g) => sum + g.moves, 0) / ai1Moves.length;
      console.log(`${ai1Name} average moves to win: ${avgWinMoves.toFixed(1)}`);
    }

    const ai2Moves = results.games.filter(g =>
      (g.players.white === ai2Name && g.winner === PLAYERS.WHITE) ||
      (g.players.black === ai2Name && g.winner === PLAYERS.BLACK)
    );

    if (ai2Moves.length > 0) {
      const avgWinMoves = ai2Moves.reduce((sum, g) => sum + g.moves, 0) / ai2Moves.length;
      console.log(`${ai2Name} average moves to win: ${avgWinMoves.toFixed(1)}`);
    }
  }

  /**
   * Benchmark Neural Network vs Minimax at different depths
   */
  async benchmarkNeuralVsMinimax() {
    console.log('\n🧠 Neural Network vs Minimax Benchmark');
    console.log('=====================================');

    // Initialize Neural Network
    const neuralAI = new NeuralNetworkAI();
    const loaded = await neuralAI.loadModel('localstorage://thai-checkers-demo-model');

    if (!loaded) {
      console.log('❌ Neural Network model not found. Creating demo model...');
      const { createDemoModel } = await import('../ml/CreateDemoModel.js');
      await createDemoModel();
      await neuralAI.loadModel('localstorage://thai-checkers-demo-model');
    }

    const depths = [2, 3, 4];
    const gamesPerMatch = 10;

    for (const depth of depths) {
      const minimaxAI = new MinimaxAI(depth);

      console.log(`\n🔥 Neural Network vs Minimax (Depth ${depth})`);

      await this.runTournament(
        { ai: neuralAI, name: 'Neural Network' },
        { ai: minimaxAI, name: `Minimax-${depth}` },
        gamesPerMatch
      );
    }

    return this.results;
  }

  /**
   * Quick performance test
   */
  async quickPerformanceTest() {
    console.log('\n⚡ Quick Performance Test');
    console.log('========================');

    const gameEngine = new GameEngine();

    // Test Minimax
    console.log('\nTesting Minimax (Depth 3)...');
    const minimaxAI = new MinimaxAI(3);
    const startTime = Date.now();
    const minimaxMove = minimaxAI.getBestMove(gameEngine);
    const minimaxTime = Date.now() - startTime;
    console.log(`Minimax time: ${minimaxTime}ms`);

    // Test Neural Network
    console.log('\nTesting Neural Network...');
    const neuralAI = new NeuralNetworkAI();
    const loaded = await neuralAI.loadModel('localstorage://thai-checkers-demo-model');

    if (loaded) {
      const startTime2 = Date.now();
      const neuralMove = await neuralAI.getBestMove(gameEngine);
      const neuralTime = Date.now() - startTime2;
      console.log(`Neural Network time: ${neuralTime}ms`);
      console.log(`Speed ratio: ${minimaxTime / neuralTime}x`);
    } else {
      console.log('Neural Network not available');
    }

    return { minimaxTime, neuralTime: loaded ? neuralTime : null };
  }

  /**
   * Save benchmark results to file
   */
  async saveResults(filename = 'benchmark_results.json') {
    const data = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.getSummary()
    };

    const json = JSON.stringify(data, null, 2);

    // For Node.js
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      fs.default.writeFileSync(filename, json);
      console.log(`\n💾 Results saved to ${filename}`);
    } else {
      // For browser/React Native
      console.log('Results:', json);
    }

    return data;
  }

  /**
   * Get summary of all results
   */
  getSummary() {
    if (this.results.length === 0) return null;

    const summary = {
      totalTournaments: this.results.length,
      totalGames: this.results.reduce((sum, r) => sum + r.games.length, 0),
      averageGameLength: this.results.reduce((sum, r) => sum + r.averageGameLength, 0) / this.results.length
    };

    return summary;
  }
}