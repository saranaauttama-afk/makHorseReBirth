"""
FINAL COLAB CONVERSION SCRIPT - Convert to TensorFlow.js
Copy and paste this script AFTER training is complete
"""

import os
import json
from datetime import datetime

print("=" * 60)
print("🔄 Thai Checkers - TensorFlow.js Conversion")
print("Final Version - Convert Trained Model")
print("=" * 60)

def convert_to_tensorflowjs():
    """Convert trained model to TensorFlow.js format"""

    print("\n🔍 Checking for trained model...")

    # Check if model exists
    model_files = [
        '/content/thai_checkers_final_model.h5',
        '/content/best_model.h5'
    ]

    model_file = None
    for file in model_files:
        if os.path.exists(file):
            model_file = file
            print(f"✅ Found model: {file}")
            break

    if not model_file:
        print("❌ No trained model found!")
        print("Please run the training script first.")
        return

    print(f"\n📦 Installing TensorFlow.js converter...")
    os.system("pip install tensorflowjs")

    print(f"\n🔄 Converting {model_file} to TensorFlow.js...")

    # Convert model
    conversion_command = f"""
    tensorflowjs_converter \\
        --input_format=keras \\
        --output_format=tfjs_graph_model \\
        --quantize_float16 \\
        {model_file} \\
        /content/tfjs_model
    """

    result = os.system(conversion_command)

    if result == 0:
        print("✅ Conversion successful!")
    else:
        print("❌ Conversion failed!")
        return

    # Check output files
    print("\n📁 Checking output files...")
    if os.path.exists('/content/tfjs_model'):
        files = os.listdir('/content/tfjs_model')
        print(f"   Created {len(files)} files:")
        for file in files:
            size = os.path.getsize(f'/content/tfjs_model/{file}') / 1024  # KB
            print(f"      - {file} ({size:.1f} KB)")
    else:
        print("   ❌ Output directory not found")
        return

    # Create deployment info
    deployment_info = {
        'converted_at': datetime.now().isoformat(),
        'source_model': model_file,
        'output_directory': '/content/tfjs_model',
        'quantization': 'float16',
        'files': files,
        'total_size_kb': sum(os.path.getsize(f'/content/tfjs_model/{f}') for f in files) / 1024
    }

    with open('/content/deployment_info.json', 'w') as f:
        json.dump(deployment_info, f, indent=2)

    print("✅ Created deployment info")

def create_test_script():
    """Create a test script to verify the converted model"""

    test_script = '''
// Test script for TensorFlow.js model
// Copy this to your React Native app

import * as tf from '@tensorflow/tfjs';

async function testModel() {
    console.log('🧠 Loading TensorFlow.js model...');

    try {
        // Load model
        const model = await tf.loadGraphModel('/path/to/model.json');
        console.log('✅ Model loaded successfully!');

        // Test input (8x8x6 tensor)
        const testInput = tf.zeros([1, 8, 8, 6]);

        // Make prediction
        const prediction = model.predict(testInput);
        console.log('✅ Prediction successful!');

        // Check output shapes
        if (Array.isArray(prediction)) {
            prediction.forEach((output, i) => {
                console.log(`   Output ${i} shape:`, output.shape);
            });
        } else {
            console.log('   Output shape:', prediction.shape);
        }

        // Clean up
        testInput.dispose();
        if (Array.isArray(prediction)) {
            prediction.forEach(p => p.dispose());
        } else {
            prediction.dispose();
        }

        console.log('🎉 Model test complete!');

    } catch (error) {
        console.error('❌ Model test failed:', error);
    }
}

// Run test
testModel();
'''

    with open('/content/test_model.js', 'w') as f:
        f.write(test_script)

    print("✅ Created test script")

def main():
    """Main conversion pipeline"""

    print("\n🚀 Starting conversion pipeline...")

    # Convert model
    convert_to_tensorflowjs()

    # Create test script
    create_test_script()

    # Print deployment instructions
    print("\n" + "=" * 60)
    print("🎉 CONVERSION COMPLETE!")
    print("=" * 60)
    print("📁 Files ready for download:")
    print("   1. tfjs_model/model.json (model architecture)")
    print("   2. tfjs_model/group1-shard1of1.bin (model weights)")
    print("   3. deployment_info.json (conversion details)")
    print("   4. test_model.js (test script)")
    print()
    print("🚀 Next steps:")
    print("   1. Download tfjs_model folder")
    print("   2. Copy to React Native app: assets/model/")
    print("   3. Update NeuralNetworkAI.js to load from assets")
    print("   4. Test in app!")
    print()
    print("💡 Model size optimizations applied:")
    print("   - float16 quantization (50% size reduction)")
    print("   - Graph optimization")
    print("   - Mobile-friendly format")
    print("=" * 60)

if __name__ == "__main__":
    main()