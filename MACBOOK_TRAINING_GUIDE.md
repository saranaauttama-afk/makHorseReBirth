# 🖥️ MacBook Neural Network Training Setup

## 🚀 MacBook Training Overview

**ตาม roadmap: MacBook M1/M2 สามารถ train Neural Network ได้!**

### **MacBook Advantages:**
- **Metal Performance Shaders** - GPU acceleration
- **16GB+ RAM** - เพียงพอสำหรับ training
- **Efficient cooling** - train ได้ยาว ๆ
- **Python ecosystem** - TensorFlow รองรับดี

## ⚙️ Environment Setup

### **1. Python Environment:**
```bash
# Install Python 3.10
brew install python@3.10

# Create virtual environment
python3.10 -m venv thai_checkers_env
source thai_checkers_env/bin/activate

# Install TensorFlow for macOS
pip install tensorflow-macos==2.13
pip install tensorflow-metal==1.0

# Install other dependencies
pip install numpy==1.24.3
pip install pandas==2.0.3
pip install matplotlib==3.7.2
pip install tqdm==4.65.0
```

### **2. Test Metal Performance:**
```python
import tensorflow as tf
print("TensorFlow version:", tf.__version__)
print("GPU available:", tf.config.list_physical_devices('GPU'))
print("Built with CUDA:", tf.test.is_built_with_cuda())

# Test Metal
with tf.device('/GPU:0'):
    a = tf.random.normal([1000, 1000])
    b = tf.random.normal([1000, 1000])
    c = tf.matmul(a, b)
    print("Metal computation successful!")
```

## 📊 Training Configuration

### **Optimized for MacBook:**
```python
TRAINING_CONFIG = {
    'batch_size': 32,          # Moderate batch size
    'epochs': 100,             # Plenty of epochs
    'learning_rate': 0.001,    # Conservative LR
    'model_size': 'compact',   # ~2MB model
    'use_metal': True,         # Enable GPU
    'memory_growth': True,     # Prevent memory issues
    'mixed_precision': False,  # Keep float32 for stability
}
```

### **Night Training Schedule:**
```bash
#!/bin/bash
# train_overnight.sh
caffeinate -s python train_model_macbook.py --games 10000 --epochs 100
# Prevents sleep mode during training
```

## 🔥 Temperature Management

### **Monitor Temperature:**
```bash
# Check CPU temperature
sudo powermetrics --samplers smc -n 1 | grep -i temp

# If temperature > 90°C:
# - Reduce batch_size to 16
# - Add training breaks
# - Use external cooling
```

### **Thermal Throttling Prevention:**
```python
import time

# Add cooling breaks during training
class CoolingCallback(tf.keras.callbacks.Callback):
    def on_epoch_end(self, epoch, logs=None):
        if epoch % 10 == 0:  # Every 10 epochs
            print("Cooling break...")
            time.sleep(30)  # 30 second break
```

## 🎯 Training Strategy

### **Phase 1: Generate Data (2-3 hours)**
```python
# Generate 10,000 high-quality games
games_config = {
    'total_games': 10000,
    'minimax_depth': [3, 4, 5],  # Varied difficulty
    'time_limit': 60,            # Faster games
    'quality_filter': True       # Remove bad games
}
```

### **Phase 2: Train Model (8-12 hours overnight)**
```python
# Optimized training pipeline
training_phases = [
    {'epochs': 30, 'lr': 0.001, 'batch_size': 32},
    {'epochs': 40, 'lr': 0.0005, 'batch_size': 16},
    {'epochs': 30, 'lr': 0.0001, 'batch_size': 8}
]
```

## 📈 Expected Performance

### **MacBook Training Times:**
- **Data Generation**: 2-3 hours (10,000 games)
- **Model Training**: 8-12 hours (100 epochs)
- **Total Time**: 10-15 hours (overnight + morning)

### **Memory Usage:**
- **Training**: ~4-8GB RAM
- **Model Size**: ~2MB final model
- **Data Size**: ~500MB training data

## 🛠️ Training Files to Create

### **Files needed:**
1. `train_macbook.py` - Main training script
2. `generate_data_macbook.py` - Fast data generation
3. `macbook_optimizer.py` - MacBook-specific optimizations
4. `model_evaluator.py` - Test trained model

## ⚠️ Common Issues & Solutions

### **Memory Issues:**
```python
# Enable memory growth
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    tf.config.experimental.set_memory_growth(gpus[0], True)
```

### **Thermal Issues:**
- Use `caffeinate` to prevent sleep
- Monitor temperature regularly
- Use cooling pad if needed
- Train during cooler hours

### **Performance Issues:**
```bash
# Optimize environment
export TF_ENABLE_MLIR_OPTIMIZATIONS=1
export TF_CPP_MIN_LOG_LEVEL=2
```

## 🎯 Expected Results

### **After Training:**
- **Move Accuracy**: 60-70% (vs Minimax moves)
- **Win Rate vs Random**: 90%+
- **Win Rate vs Minimax-3**: 40-60%
- **Inference Time**: <100ms on mobile

### **Model Quality Indicators:**
- Training loss < 0.5
- Validation accuracy > 60%
- Stable learning curves
- No overfitting signs

---

**MacBook เอาอยู่! เริ่มกันเลย! 🚀**
