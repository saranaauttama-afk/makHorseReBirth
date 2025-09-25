import * as tf from '@tensorflow/tfjs';
import { AIBenchmark } from './AIBenchmark.js';
import { createDemoModel } from '../ml/CreateDemoModel.js';

/**
 * Script to run AI benchmarks
 * Usage: node src/testing/run_benchmark.js
 */

async function main() {
  console.log('🏁 AI Benchmark Suite');
  console.log('=====================\n');

  // Initialize TensorFlow
  await tf.setBackend('cpu');
  await tf.ready();
  console.log('TensorFlow.js ready, backend:', tf.getBackend());

  // Create benchmark instance
  const benchmark = new AIBenchmark();

  try {
    // Quick performance test first
    console.log('Running quick performance test...');
    await benchmark.quickPerformanceTest();

    // Create demo model if needed
    console.log('\nEnsuring Neural Network model exists...');
    await createDemoModel();

    // Run full benchmark
    console.log('\nRunning full benchmark suite...');
    const results = await benchmark.benchmarkNeuralVsMinimax();

    // Save results
    await benchmark.saveResults(`benchmark_${Date.now()}.json`);

    console.log('\n✅ Benchmark completed successfully!');
    console.log('\nKey Insights:');

    const summary = benchmark.getSummary();
    if (summary) {
      console.log(`- Total games played: ${summary.totalGames}`);
      console.log(`- Average game length: ${summary.averageGameLength.toFixed(1)} moves`);
    }

    // Recommendations
    console.log('\n📝 Recommendations:');
    const nnWins = results.reduce((sum, r) =>
      r.ai1 === 'Neural Network' ? sum + r.ai1Wins : sum + r.ai2Wins, 0
    );
    const totalGames = results.reduce((sum, r) => sum + r.games.length, 0);
    const nnWinRate = nnWins / totalGames;

    if (nnWinRate < 0.3) {
      console.log('❌ Neural Network performance is poor:');
      console.log('  - Model needs training on real game data');
      console.log('  - Consider generating 10,000+ training games');
      console.log('  - Current model is untrained (random weights)');
    } else if (nnWinRate < 0.5) {
      console.log('⚠️  Neural Network shows promise but needs improvement:');
      console.log('  - Generate more diverse training data');
      console.log('  - Fine-tune model hyperparameters');
      console.log('  - Consider self-play training');
    } else {
      console.log('🎉 Neural Network performs well!');
      console.log('  - Ready for production use');
      console.log('  - Consider implementing MCTS for even stronger play');
    }

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof window === 'undefined') {
  main().catch(console.error);
}

export { main as runBenchmark };