import { GameEngine } from './GameEngine';
import { MinimaxAI } from '../ai/MinimaxAI';
import { PLAYERS, GAME_STATUS } from '../utils/constants';

export class ConsoleGame {
  constructor() {
    this.gameEngine = new GameEngine();
    this.ai = new MinimaxAI(4, PLAYERS.BLACK);
  }

  playAIvsAI(depth1 = 3, depth2 = 4, maxMoves = 200) {
    const ai1 = new MinimaxAI(depth1, PLAYERS.WHITE);
    const ai2 = new MinimaxAI(depth2, PLAYERS.BLACK);

    console.log(`🎮 Starting AI vs AI game (depth ${depth1} vs depth ${depth2})\n`);
    this.gameEngine.board.print();

    let moveCount = 0;

    while (!this.gameEngine.isGameOver() && moveCount < maxMoves) {
      const currentAI = this.gameEngine.currentPlayer === PLAYERS.WHITE ? ai1 : ai2;

      const move = currentAI.getBestMove(this.gameEngine);

      if (!move) {
        console.log('No valid moves available!');
        break;
      }

      console.log(`\nMove ${moveCount + 1}: ${this.gameEngine.currentPlayer} moves ${this.formatMove(move)}`);

      this.gameEngine.makeMove(
        move.from.row, move.from.col,
        move.to.row, move.to.col
      );

      this.gameEngine.board.print();

      const stats = currentAI.getStatistics();
      console.log(`Nodes evaluated: ${stats.nodesEvaluated}, Time: ${stats.timeElapsed}ms`);

      moveCount++;
    }

    this.printGameResult();
    return this.gameEngine.getWinner();
  }

  playVsAI(aiDepth = 4) {
    this.ai.setDepth(aiDepth);
    console.log(`🎮 Starting Human (White) vs AI (Black, depth ${aiDepth})\n`);

    while (!this.gameEngine.isGameOver()) {
      this.gameEngine.board.print();
      console.log(`\nCurrent player: ${this.gameEngine.currentPlayer}`);

      if (this.gameEngine.currentPlayer === PLAYERS.BLACK) {
        console.log('AI is thinking...');
        const move = this.ai.getBestMove(this.gameEngine);

        if (!move) {
          console.log('AI has no valid moves!');
          break;
        }

        console.log(`AI moves: ${this.formatMove(move)}`);
        this.gameEngine.makeMove(
          move.from.row, move.from.col,
          move.to.row, move.to.col
        );
      } else {
        const validMoves = this.gameEngine.getAllValidMoves();
        console.log('\nYour valid moves:');
        validMoves.forEach((move, index) => {
          console.log(`${index}: ${this.formatMove(move)}`);
        });
      }
    }

    this.printGameResult();
  }

  formatMove(move) {
    return `(${move.from.row},${move.from.col}) → (${move.to.row},${move.to.col})`;
  }

  printGameResult() {
    console.log('\n' + '='.repeat(30));
    if (this.gameEngine.gameStatus === GAME_STATUS.WHITE_WIN) {
      console.log('🏆 WHITE WINS!');
    } else if (this.gameEngine.gameStatus === GAME_STATUS.BLACK_WIN) {
      console.log('🏆 BLACK WINS!');
    } else if (this.gameEngine.gameStatus === GAME_STATUS.DRAW) {
      console.log('🤝 DRAW!');
    }
    console.log(`Total moves: ${this.gameEngine.turnCount}`);
    console.log('='.repeat(30));
  }

  benchmark(depth = 4, numGames = 10) {
    console.log(`\n📊 Running benchmark (${numGames} games at depth ${depth})...\n`);

    const results = {
      white: 0,
      black: 0,
      draw: 0,
      totalMoves: 0,
      totalTime: 0,
      totalNodes: 0
    };

    for (let i = 0; i < numGames; i++) {
      this.gameEngine = new GameEngine();
      const startTime = Date.now();

      const winner = this.playAIvsAI(depth, depth, 200);

      const gameTime = Date.now() - startTime;
      results.totalTime += gameTime;
      results.totalMoves += this.gameEngine.turnCount;

      if (winner === PLAYERS.WHITE) results.white++;
      else if (winner === PLAYERS.BLACK) results.black++;
      else results.draw++;

      console.log(`Game ${i + 1} completed in ${gameTime}ms\n`);
    }

    console.log('\n📈 BENCHMARK RESULTS:');
    console.log(`White wins: ${results.white}`);
    console.log(`Black wins: ${results.black}`);
    console.log(`Draws: ${results.draw}`);
    console.log(`Avg moves per game: ${(results.totalMoves / numGames).toFixed(1)}`);
    console.log(`Avg time per game: ${(results.totalTime / numGames).toFixed(0)}ms`);
  }
}

const game = new ConsoleGame();
game.playAIvsAI(3, 4, 100);