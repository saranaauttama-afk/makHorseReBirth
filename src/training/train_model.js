import * as tf from '@tensorflow/tfjs';
import { ModelTrainer } from '../ml/ModelTrainer.js';
import { TrainingDataGenerator } from './TrainingDataGenerator.js';

/**
 * Script to train the neural network model
 * Run with: node src/training/train_model.js
 */

async function main() {
  console.log('🧠 Thai Checkers Neural Network Training');
  console.log('=========================================\n');

  // Set TensorFlow.js backend
  await tf.setBackend('cpu'); // Use 'webgl' for GPU in browser

  console.log(`TensorFlow.js backend: ${tf.getBackend()}`);
  console.log(`TensorFlow.js version: ${tf.version.tfjs}\n`);

  const trainer = new ModelTrainer();
  const generator = new TrainingDataGenerator();

  try {
    // Load or generate training data
    console.log('📂 Loading training data...');
    let data;

    try {
      // Try to load existing data
      data = await generator.loadData('training_data_100_games.json');
      console.log('✅ Loaded existing training data');
    } catch (e) {
      // Generate new data if not found
      console.log('⚠️  No existing data found, generating new data...');
      const { games, positions } = await generator.generateGames(100, {
        randomizeDepth: true,
        saveInterval: 10
      });
      await generator.saveData('training_data_100_games.json');
      data = { games, positions };
    }

    // Balance and prepare dataset
    console.log('\n⚖️  Balancing dataset...');
    const balancedPositions = generator.balanceDataset();

    // Split data into train/validation/test
    const totalPositions = balancedPositions.length;
    const trainSize = Math.floor(totalPositions * 0.7);
    const valSize = Math.floor(totalPositions * 0.15);

    const trainData = balancedPositions.slice(0, trainSize);
    const valData = balancedPositions.slice(trainSize, trainSize + valSize);
    const testData = balancedPositions.slice(trainSize + valSize);

    console.log(`\n📊 Dataset Split:`);
    console.log(`- Training: ${trainData.length} positions`);
    console.log(`- Validation: ${valData.length} positions`);
    console.log(`- Test: ${testData.length} positions`);

    // Initialize model
    console.log('\n🏗️  Initializing model...');
    await trainer.initialize();

    // Training configuration
    const trainingConfig = {
      batchSize: 32,
      epochs: 50,
      validationSplit: 0.15,
      learningRate: 0.001,
      earlyStoppingPatience: 10,
      verbose: 0
    };

    console.log('\n⚙️  Training Configuration:');
    console.log(`- Batch size: ${trainingConfig.batchSize}`);
    console.log(`- Epochs: ${trainingConfig.epochs}`);
    console.log(`- Learning rate: ${trainingConfig.learningRate}`);
    console.log(`- Early stopping patience: ${trainingConfig.earlyStoppingPatience}`);

    // Train the model
    console.log('\n🚀 Starting training...\n');
    const startTime = Date.now();

    const history = await trainer.train(trainData, trainingConfig);

    const trainingTime = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️  Training time: ${trainingTime.toFixed(1)} seconds`);

    // Evaluate on test set
    console.log('\n📈 Evaluating on test set...');
    const evaluation = await trainer.evaluate(testData);

    // Save the model
    console.log('\n💾 Saving model...');
    await trainer.saveModel('localstorage://thai-checkers-model-v1');

    // Training complete
    console.log('\n✅ Training Complete!');
    console.log('====================');
    console.log(`Model accuracy: ${(evaluation.policyAccuracy[0] * 100).toFixed(2)}%`);
    console.log(`Model size: ${trainer.neuralNetwork.getModelSizeInMB().toFixed(2)} MB`);

    // Recommendations
    console.log('\n📝 Recommendations:');
    if (evaluation.policyAccuracy[0] < 0.5) {
      console.log('- Model accuracy is low. Consider:');
      console.log('  • Generating more training data (10,000+ games)');
      console.log('  • Increasing model capacity');
      console.log('  • Adjusting hyperparameters');
    } else if (evaluation.policyAccuracy[0] < 0.7) {
      console.log('- Model shows promise. Consider:');
      console.log('  • Fine-tuning with more diverse data');
      console.log('  • Implementing self-play training');
      console.log('  • Adding MCTS for better move selection');
    } else {
      console.log('- Great performance! Ready for:');
      console.log('  • Integration with game app');
      console.log('  • Testing against human players');
      console.log('  • Further optimization for mobile');
    }

    console.log('\n🎮 Next Steps:');
    console.log('1. Test the model in the app');
    console.log('2. Generate more training data if needed');
    console.log('3. Implement MCTS for stronger play');

  } catch (error) {
    console.error('\n❌ Training error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof window === 'undefined') {
  main().catch(console.error);
}

export { main as trainModel };