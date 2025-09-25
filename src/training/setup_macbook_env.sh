#!/bin/bash
# 🖥️ MacBook Neural Network Training Environment Setup
# Run this script to set up everything needed for training

echo "🖥️ MacBook Neural Network Training Setup"
echo "========================================"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only"
    exit 1
fi

# Create training directory if it doesn't exist
mkdir -p "$(dirname "$0")"

# Install Homebrew if not installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Python 3.10
echo "🐍 Installing Python 3.10..."
brew install python@3.10

# Create virtual environment
echo "🌐 Creating virtual environment..."
cd "$(dirname "$0")"
python3.10 -m venv thai_checkers_env

# Activate virtual environment
source thai_checkers_env/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install TensorFlow for macOS with Metal support
echo "🔧 Installing TensorFlow with Metal support..."
pip install tensorflow-macos==2.13.0
pip install tensorflow-metal==1.0.1

# Install other dependencies
echo "📚 Installing other dependencies..."
pip install numpy==1.24.3
pip install pandas==2.0.3
pip install matplotlib==3.7.2
pip install tqdm==4.65.0
pip install scikit-learn==1.3.0

# Test TensorFlow installation
echo "🧪 Testing TensorFlow installation..."
python3 -c "
import tensorflow as tf
print(f'TensorFlow version: {tf.__version__}')
print(f'GPU devices: {tf.config.list_physical_devices(\"GPU\")}')

# Test Metal performance
print('Testing Metal performance...')
import time
start = time.time()
with tf.device('/GPU:0'):
    a = tf.random.normal([1000, 1000])
    b = tf.random.normal([1000, 1000])
    c = tf.matmul(a, b)
    result = tf.reduce_sum(c)
elapsed = time.time() - start
print(f'Matrix computation time: {elapsed:.3f}s')
print('✅ TensorFlow with Metal is working!')
"

if [ $? -eq 0 ]; then
    echo "✅ Environment setup complete!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Activate the environment: source src/training/thai_checkers_env/bin/activate"
    echo "2. Generate training data: python src/training/generate_data_macbook.py"
    echo "3. Train the model: python src/training/train_macbook.py"
    echo ""
    echo "💡 For overnight training, use:"
    echo "   caffeinate -s python src/training/train_macbook.py"
    echo ""
    echo "🔥 Monitor temperature during training:"
    echo "   sudo powermetrics --samplers smc -n 1 | grep -i temp"
else
    echo "❌ Environment setup failed. Please check the errors above."
    exit 1
fi