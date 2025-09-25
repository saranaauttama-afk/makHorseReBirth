import { GameEngine } from '../game/GameEngine.js';
import { MinimaxAI } from '../ai/MinimaxAI.js';
import { PLAYERS, GAME_STATUS } from '../utils/constants.js';
import { DataProcessor } from '../ml/DataProcessor.js';
import fs from 'fs';

export class TrainingDataGenerator {
  constructor() {
    this.games = [];
    this.positions = [];
  }

  /**
   * Generate training data from Minimax self-play
   * @param {number} numGames - Number of games to generate
   * @param {Object} config - Configuration for players
   */
  async generateGames(numGames = 100, config = {}) {
    const defaultConfig = {
      whiteDepth: 3,
      blackDepth: 3,
      randomizeDepth: true,
      saveInterval: 10
    };

    const settings = { ...defaultConfig, ...config };

    console.log(`Generating ${numGames} games with Minimax self-play...`);

    for (let i = 0; i < numGames; i++) {
      // Randomize AI depths for variety
      const whiteDepth = settings.randomizeDepth
        ? Math.floor(Math.random() * 3) + 2 // 2-4
        : settings.whiteDepth;
      const blackDepth = settings.randomizeDepth
        ? Math.floor(Math.random() * 3) + 2 // 2-4
        : settings.blackDepth;

      const game = await this.playGame(whiteDepth, blackDepth);
      this.games.push(game);

      // Extract positions from game
      const positions = this.extractPositions(game);
      this.positions.push(...positions);

      // Progress report
      if ((i + 1) % settings.saveInterval === 0) {
        console.log(`Generated ${i + 1}/${numGames} games (${this.positions.length} positions)`);

        // Save intermediate data to prevent loss
        if (settings.autoSave) {
          await this.saveData(`training_data_checkpoint_${i + 1}.json`);
        }
      }
    }

    console.log(`\nTotal games generated: ${this.games.length}`);
    console.log(`Total positions collected: ${this.positions.length}`);

    return {
      games: this.games,
      positions: this.positions
    };
  }

  /**
   * Play a single game between two Minimax AIs
   * @param {number} whiteDepth - Depth for white AI
   * @param {number} blackDepth - Depth for black AI
   */
  async playGame(whiteDepth, blackDepth) {
    const gameEngine = new GameEngine();
    const whiteAI = new MinimaxAI(whiteDepth, PLAYERS.WHITE);
    const blackAI = new MinimaxAI(blackDepth, PLAYERS.BLACK);

    const gameRecord = {
      id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      players: {
        white: `minimax_${whiteDepth}`,
        black: `minimax_${blackDepth}`
      },
      moves: [],
      result: null,
      totalMoves: 0
    };

    let turnCount = 0;
    const maxTurns = 200; // Prevent infinite games

    while (gameEngine.gameStatus === GAME_STATUS.PLAYING && turnCount < maxTurns) {
      const currentAI = gameEngine.currentPlayer === PLAYERS.WHITE ? whiteAI : blackAI;

      // Get AI's best move
      const aiMove = currentAI.getBestMove(gameEngine);

      if (!aiMove) {
        console.warn(`No valid move found for ${gameEngine.currentPlayer}`);
        break;
      }

      // Record the position and move
      const moveRecord = {
        turn: turnCount + 1,
        player: gameEngine.currentPlayer,
        from: { ...aiMove.from },
        to: { ...aiMove.to },
        boardState: gameEngine.board.toArray(),
        evaluation: aiMove.evaluation || 0,
        validMoves: gameEngine.getAllValidMoves().length,
        capturedPieces: aiMove.capturedPieces ? aiMove.capturedPieces.length : 0
      };

      gameRecord.moves.push(moveRecord);

      // Make the move
      const result = gameEngine.makeMove(
        aiMove.from.row,
        aiMove.from.col,
        aiMove.to.row,
        aiMove.to.col
      );

      if (!result.success) {
        console.error(`Invalid move attempted: ${JSON.stringify(aiMove)}`);
        break;
      }

      turnCount++;
    }

    // Record game outcome
    gameRecord.totalMoves = turnCount;
    gameRecord.result = this.determineResult(gameEngine);

    return gameRecord;
  }

  /**
   * Determine game result
   */
  determineResult(gameEngine) {
    if (gameEngine.gameStatus === GAME_STATUS.WHITE_WIN) {
      return 'white_wins';
    } else if (gameEngine.gameStatus === GAME_STATUS.BLACK_WIN) {
      return 'black_wins';
    } else if (gameEngine.gameStatus === GAME_STATUS.DRAW) {
      return 'draw';
    } else {
      // Game didn't finish (hit turn limit)
      const whiteCount = gameEngine.board.countPieces(PLAYERS.WHITE);
      const blackCount = gameEngine.board.countPieces(PLAYERS.BLACK);

      if (whiteCount > blackCount) {
        return 'white_advantage';
      } else if (blackCount > whiteCount) {
        return 'black_advantage';
      } else {
        return 'draw';
      }
    }
  }

  /**
   * Extract training positions from a game
   */
  extractPositions(game) {
    const positions = [];

    // Determine game outcome value
    let whiteValue, blackValue;
    if (game.result === 'white_wins') {
      whiteValue = 1;
      blackValue = -1;
    } else if (game.result === 'black_wins') {
      whiteValue = -1;
      blackValue = 1;
    } else {
      whiteValue = 0;
      blackValue = 0;
    }

    // Extract each position
    game.moves.forEach((move, index) => {
      const position = {
        gameId: game.id,
        moveNumber: move.turn,
        player: move.player,
        boardState: move.boardState,
        move: {
          from: move.from,
          to: move.to
        },
        value: move.player === PLAYERS.WHITE ? whiteValue : blackValue,
        evaluation: move.evaluation,
        gameResult: game.result,
        validMovesCount: move.validMoves
      };

      positions.push(position);
    });

    return positions;
  }

  /**
   * Balance dataset by outcome
   */
  balanceDataset() {
    const wins = this.positions.filter(p => Math.abs(p.value) === 1);
    const draws = this.positions.filter(p => p.value === 0);

    // Balance wins and draws
    const minCount = Math.min(wins.length, draws.length);

    const balanced = [
      ...wins.slice(0, minCount),
      ...draws.slice(0, minCount)
    ];

    // Shuffle
    for (let i = balanced.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balanced[i], balanced[j]] = [balanced[j], balanced[i]];
    }

    console.log(`Balanced dataset: ${balanced.length} positions`);
    console.log(`Wins: ${wins.slice(0, minCount).length}, Draws: ${draws.slice(0, minCount).length}`);

    return balanced;
  }

  /**
   * Save training data to JSON file
   */
  async saveData(filename = 'training_data.json') {
    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalGames: this.games.length,
        totalPositions: this.positions.length,
        gamesBreakdown: this.getGamesBreakdown()
      },
      games: this.games,
      positions: this.positions
    };

    const json = JSON.stringify(data, null, 2);

    // For React Native, we'll save to AsyncStorage instead
    if (typeof window !== 'undefined') {
      // Browser/React Native environment
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(`training_${filename}`, json);
        console.log(`Data saved to AsyncStorage: training_${filename}`);
      } catch (e) {
        console.log('AsyncStorage not available, saving to localStorage');
        localStorage.setItem(`training_${filename}`, json);
      }
    } else {
      // Node.js environment
      fs.writeFileSync(filename, json);
      console.log(`Data saved to ${filename}`);
    }

    return data;
  }

  /**
   * Load training data from JSON file
   */
  async loadData(filename = 'training_data.json') {
    let json;

    if (typeof window !== 'undefined') {
      // Browser/React Native environment
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        json = await AsyncStorage.getItem(`training_${filename}`);
      } catch (e) {
        json = localStorage.getItem(`training_${filename}`);
      }
    } else {
      // Node.js environment
      json = fs.readFileSync(filename, 'utf-8');
    }

    const data = JSON.parse(json);
    this.games = data.games;
    this.positions = data.positions;

    console.log(`Loaded ${this.games.length} games, ${this.positions.length} positions`);
    return data;
  }

  /**
   * Get breakdown of game outcomes
   */
  getGamesBreakdown() {
    const breakdown = {
      white_wins: 0,
      black_wins: 0,
      draws: 0,
      white_advantage: 0,
      black_advantage: 0
    };

    this.games.forEach(game => {
      if (breakdown[game.result] !== undefined) {
        breakdown[game.result]++;
      }
    });

    return breakdown;
  }

  /**
   * Get statistics about the dataset
   */
  getStatistics() {
    const stats = {
      totalGames: this.games.length,
      totalPositions: this.positions.length,
      averageGameLength: 0,
      outcomeDistribution: this.getGamesBreakdown(),
      moveDistribution: {},
      evaluationStats: {
        min: Infinity,
        max: -Infinity,
        mean: 0
      }
    };

    // Calculate average game length
    const totalMoves = this.games.reduce((sum, game) => sum + game.totalMoves, 0);
    stats.averageGameLength = totalMoves / this.games.length;

    // Calculate evaluation statistics
    let evalSum = 0;
    this.positions.forEach(pos => {
      const evalValue = pos.evaluation;
      if (evalValue < stats.evaluationStats.min) stats.evaluationStats.min = evalValue;
      if (evalValue > stats.evaluationStats.max) stats.evaluationStats.max = evalValue;
      evalSum += evalValue;
    });
    stats.evaluationStats.mean = evalSum / this.positions.length;

    return stats;
  }
}