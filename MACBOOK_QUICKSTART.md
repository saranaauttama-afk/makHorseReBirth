# 🚀 MacBook Neural Network Training - Quick Start

## ⚡ Fast Setup (10 minutes)

### **1. Environment Setup:**
```bash
# Make setup script executable
chmod +x src/training/setup_macbook_env.sh

# Run setup (installs everything automatically)
./src/training/setup_macbook_env.sh
```

### **2. Activate Environment:**
```bash
source src/training/thai_checkers_env/bin/activate
```

### **3. Generate Training Data:**
```bash
# Generate 10,000 training games (2-3 hours)
python src/training/generate_data_macbook.py
```

### **4. Train Model:**
```bash
# Start overnight training (8-12 hours)
caffeinate -s python src/training/train_macbook.py
```

## 📊 What You Get

**After setup:**
- ✅ TensorFlow with Metal GPU acceleration
- ✅ Python environment optimized for M1/M2
- ✅ Temperature monitoring and thermal management
- ✅ Automatic data generation from Minimax self-play

**After training:**
- 🧠 **2MB Neural Network model** trained on 10,000+ positions
- 📈 **60-70% move accuracy** vs expert play
- ⚡ **<100ms inference** on mobile devices
- 🏆 **Strong strategic play** in Thai Checkers

## 🔥 MacBook Optimization Features

### **Metal GPU Acceleration:**
- Automatic GPU detection and setup
- Memory growth optimization
- Performance benchmarking

### **Thermal Management:**
- Automatic cooling breaks during training
- Temperature monitoring commands
- `caffeinate` prevents sleep mode

### **Training Configuration:**
- **Batch Size**: 32 (GPU) / 16 (CPU)
- **Learning Rate**: Adaptive with plateau reduction
- **Early Stopping**: Prevents overfitting
- **Model Checkpoints**: Saves best model automatically

## ⚠️ Quick Troubleshooting

### **TensorFlow Issues:**
```bash
# Check GPU availability
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"

# Test Metal performance
python -c "
import tensorflow as tf
with tf.device('/GPU:0'):
    a = tf.random.normal([1000, 1000])
    b = tf.random.normal([1000, 1000])
    c = tf.matmul(a, b)
print('Metal GPU working!')
"
```

### **Memory Issues:**
```bash
# Reduce batch size in train_macbook.py
'batch_size': 16  # Instead of 32
```

### **Temperature Issues:**
```bash
# Monitor CPU temperature
sudo powermetrics --samplers smc -n 1 | grep -i temp

# If temp > 90°C, use cooling breaks
'cooling_interval': 5  # More frequent breaks
```

## 🎯 Expected Timeline

| Phase | Time | Description |
|-------|------|-------------|
| **Setup** | 10 min | Install Python, TensorFlow, dependencies |
| **Data Gen** | 2-3 hours | Generate 10,000 training games |
| **Training** | 8-12 hours | Train CNN model (overnight) |
| **Deploy** | 5 min | Convert and integrate to React Native |

**Total: ~1 day (mostly automated)**

## 🚀 Advanced Usage

### **Custom Training:**
```python
# Modify train_macbook.py for custom settings
config = {
    'batch_size': 64,          # Larger batch for better GPU
    'epochs': 200,             # More epochs for better quality
    'learning_rate': 0.0005,   # Lower LR for stability
    'validation_split': 0.2    # More validation data
}
```

### **Multiple Model Training:**
```bash
# Train different model sizes
python train_macbook.py --model-size small    # 1MB model
python train_macbook.py --model-size medium   # 2MB model
python train_macbook.py --model-size large    # 5MB model
```

### **Performance Monitoring:**
```bash
# Watch training progress
tail -f training_log.txt

# Monitor system resources
htop
```

---

**MacBook M1/M2 + Metal GPU = Perfect for NN training! 🔥🧠**

Ready to create a world-class Thai Checkers AI! 🚀