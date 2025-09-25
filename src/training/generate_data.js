import { TrainingDataGenerator } from './TrainingDataGenerator.js';

/**
 * Script to generate training data from Minimax self-play
 * Run with: node src/training/generate_data.js
 */

async function main() {
  console.log('🎮 Thai Checkers Training Data Generation');
  console.log('==========================================\n');

  const generator = new TrainingDataGenerator();

  // Configuration
  const config = {
    numGames: 5, // Start with 5 games for quick testing
    whiteDepth: 2,
    blackDepth: 2,
    randomizeDepth: true,
    saveInterval: 10,
    autoSave: false
  };

  console.log('Configuration:');
  console.log(`- Games to generate: ${config.numGames}`);
  console.log(`- White AI depth: ${config.whiteDepth}${config.randomizeDepth ? ' (randomized 2-4)' : ''}`);
  console.log(`- Black AI depth: ${config.blackDepth}${config.randomizeDepth ? ' (randomized 2-4)' : ''}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Generate games
    const { games, positions } = await generator.generateGames(
      config.numGames,
      {
        whiteDepth: config.whiteDepth,
        blackDepth: config.blackDepth,
        randomizeDepth: config.randomizeDepth,
        saveInterval: config.saveInterval,
        autoSave: config.autoSave
      }
    );

    const elapsedTime = (Date.now() - startTime) / 1000;

    console.log('\n📊 Generation Complete!');
    console.log('=======================');
    console.log(`Time taken: ${elapsedTime.toFixed(1)} seconds`);
    console.log(`Games/second: ${(config.numGames / elapsedTime).toFixed(2)}`);

    // Show statistics
    const stats = generator.getStatistics();
    console.log('\n📈 Dataset Statistics:');
    console.log(`- Total games: ${stats.totalGames}`);
    console.log(`- Total positions: ${stats.totalPositions}`);
    console.log(`- Average game length: ${stats.averageGameLength.toFixed(1)} moves`);

    console.log('\n🏆 Game Outcomes:');
    console.log(`- White wins: ${stats.outcomeDistribution.white_wins}`);
    console.log(`- Black wins: ${stats.outcomeDistribution.black_wins}`);
    console.log(`- Draws: ${stats.outcomeDistribution.draws}`);
    console.log(`- White advantage: ${stats.outcomeDistribution.white_advantage}`);
    console.log(`- Black advantage: ${stats.outcomeDistribution.black_advantage}`);

    console.log('\n📊 Evaluation Stats:');
    console.log(`- Min: ${stats.evaluationStats.min.toFixed(2)}`);
    console.log(`- Max: ${stats.evaluationStats.max.toFixed(2)}`);
    console.log(`- Mean: ${stats.evaluationStats.mean.toFixed(2)}`);

    // Balance dataset
    console.log('\n⚖️  Balancing dataset...');
    const balancedPositions = generator.balanceDataset();

    // Save data
    console.log('\n💾 Saving data...');
    const filename = `training_data_${config.numGames}_games.json`;
    await generator.saveData(filename);
    console.log(`✅ Data saved to ${filename}`);

    // Recommendations
    console.log('\n📝 Next Steps:');
    console.log('1. Review the data quality');
    console.log('2. Generate more games if needed (aim for 10,000+)');
    console.log('3. Run training with: node src/training/train_model.js');

  } catch (error) {
    console.error('\n❌ Error during generation:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof window === 'undefined') {
  main().catch(console.error);
}

export { main as generateTrainingData };