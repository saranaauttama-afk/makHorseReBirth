#!/usr/bin/env python3
"""
🖥️ MacBook Neural Network Training Script
Optimized for M1/M2 MacBook with Metal Performance Shaders
"""

import os
import sys
import time
import json
import numpy as np
from datetime import datetime

# MacBook-specific TensorFlow setup
os.environ['TF_ENABLE_MLIR_OPTIMIZATIONS'] = '1'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow import keras

def setup_macbook_gpu():
    """Configure TensorFlow for MacBook Metal GPU"""
    print("🔧 Setting up MacBook GPU...")

    # Check for Metal GPU
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✅ Found {len(gpus)} GPU(s): {gpus}")
        try:
            # Enable memory growth to prevent allocation issues
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print("✅ Memory growth enabled")
        except RuntimeError as e:
            print(f"⚠️ GPU setup warning: {e}")
    else:
        print("⚠️ No GPU found, using CPU")

    # Test computation
    print("\n🧪 Testing Metal performance...")
    start_time = time.time()
    with tf.device('/GPU:0' if gpus else '/CPU:0'):
        a = tf.random.normal([1000, 1000])
        b = tf.random.normal([1000, 1000])
        c = tf.matmul(a, b)
        result = tf.reduce_sum(c)

    elapsed = time.time() - start_time
    print(f"✅ Matrix multiplication test: {elapsed:.3f}s")

    return len(gpus) > 0

def create_neural_network(input_shape=(8, 8, 6)):
    """Create optimized CNN for MacBook training"""
    print(f"\n🧠 Creating neural network with input shape {input_shape}...")

    # Input layer
    inputs = keras.layers.Input(shape=input_shape, name='board_input')

    # Convolutional layers - optimized for MacBook
    x = keras.layers.Conv2D(32, 3, padding='same', activation='relu', name='conv1')(inputs)
    x = keras.layers.BatchNormalization(name='bn1')(x)

    x = keras.layers.Conv2D(64, 3, padding='same', activation='relu', name='conv2')(x)
    x = keras.layers.BatchNormalization(name='bn2')(x)

    x = keras.layers.Conv2D(128, 3, padding='same', activation='relu', name='conv3')(x)
    x = keras.layers.BatchNormalization(name='bn3')(x)

    # Global features
    x = keras.layers.Flatten(name='flatten')(x)
    x = keras.layers.Dense(256, activation='relu', name='dense1')(x)
    x = keras.layers.Dropout(0.3, name='dropout1')(x)

    x = keras.layers.Dense(128, activation='relu', name='dense2')(x)
    x = keras.layers.Dropout(0.2, name='dropout2')(x)

    # Output heads
    policy_head = keras.layers.Dense(4096, activation='softmax', name='policy_head')(x)
    value_head = keras.layers.Dense(1, activation='tanh', name='value_head')(x)

    # Create model
    model = keras.Model(inputs=inputs, outputs=[policy_head, value_head], name='thai_checkers_net')

    # Compile with MacBook-optimized settings
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001, epsilon=1e-8),
        loss={
            'policy_head': 'categorical_crossentropy',
            'value_head': 'mse'
        },
        loss_weights={
            'policy_head': 1.0,
            'value_head': 0.5
        },
        metrics={
            'policy_head': ['accuracy'],
            'value_head': ['mae']
        }
    )

    # Print model info
    total_params = model.count_params()
    model_size_mb = (total_params * 4) / (1024 * 1024)  # 4 bytes per param

    print(f"✅ Model created successfully")
    print(f"📊 Total parameters: {total_params:,}")
    print(f"📦 Model size: {model_size_mb:.2f} MB")

    return model

class MacBookTrainingCallback(keras.callbacks.Callback):
    """Custom callback for MacBook training optimization"""

    def __init__(self, cooling_interval=10, temp_check=True):
        super().__init__()
        self.cooling_interval = cooling_interval
        self.temp_check = temp_check
        self.start_time = time.time()

    def on_epoch_begin(self, epoch, logs=None):
        if epoch % self.cooling_interval == 0 and epoch > 0:
            print(f"\n❄️ Cooling break after epoch {epoch}...")
            time.sleep(10)  # 10 second cooling break

    def on_epoch_end(self, epoch, logs=None):
        # Calculate training speed
        elapsed = time.time() - self.start_time
        speed = (epoch + 1) / elapsed * 3600  # epochs per hour

        # Estimate completion time
        if hasattr(self.params, 'epochs'):
            remaining_epochs = self.params['epochs'] - (epoch + 1)
            eta_hours = remaining_epochs / speed if speed > 0 else 0

            print(f"🚄 Speed: {speed:.1f} epochs/hour, ETA: {eta_hours:.1f}h")

def load_training_data(data_path='training_data.json'):
    """Load and preprocess training data"""
    print(f"\n📂 Loading training data from {data_path}...")

    try:
        with open(data_path, 'r') as f:
            data = json.load(f)

        positions = data['positions']
        print(f"✅ Loaded {len(positions)} positions from {len(data['games'])} games")

        # Convert to training format
        X = []  # Board states
        y_policy = []  # Move probabilities
        y_value = []  # Position values

        for pos in positions:
            # Convert board state to tensor (simplified)
            board_tensor = np.zeros((8, 8, 6), dtype=np.float32)

            # Fill tensor with piece information
            board_array = pos['boardState']
            for row in range(8):
                for col in range(8):
                    piece = board_array[row][col]
                    if piece == 1:  # White man
                        board_tensor[row][col][0] = 1.0
                    elif piece == 2:  # White king
                        board_tensor[row][col][1] = 1.0
                    elif piece == -1:  # Black man
                        board_tensor[row][col][2] = 1.0
                    elif piece == -2:  # Black king
                        board_tensor[row][col][3] = 1.0

            X.append(board_tensor)

            # Create one-hot policy target (simplified)
            policy = np.zeros(4096, dtype=np.float32)
            move = pos['move']
            move_index = move['from']['row'] * 8 + move['from']['col']
            policy[move_index] = 1.0
            y_policy.append(policy)

            # Value target
            y_value.append([pos['value']])

        X = np.array(X)
        y_policy = np.array(y_policy)
        y_value = np.array(y_value)

        print(f"📊 Training data shape:")
        print(f"   Input: {X.shape}")
        print(f"   Policy: {y_policy.shape}")
        print(f"   Value: {y_value.shape}")

        return X, {'policy_head': y_policy, 'value_head': y_value}

    except FileNotFoundError:
        print(f"❌ Training data not found: {data_path}")
        print("💡 Generate training data first using:")
        print("   node src/training/generate_data.js")
        return None, None

def train_model(model, X, y, config):
    """Train model with MacBook optimizations"""
    print(f"\n🚀 Starting training with config:")
    for key, value in config.items():
        print(f"   {key}: {value}")

    # Callbacks
    callbacks = [
        MacBookTrainingCallback(cooling_interval=config['cooling_interval']),
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=config['early_stopping_patience'],
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=config['lr_patience'],
            min_lr=1e-7,
            verbose=1
        ),
        keras.callbacks.ModelCheckpoint(
            'best_model_macbook.keras',
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        )
    ]

    # Train model
    start_time = time.time()
    print(f"\n⏰ Training started at {datetime.now().strftime('%H:%M:%S')}")

    history = model.fit(
        X, y,
        batch_size=config['batch_size'],
        epochs=config['epochs'],
        validation_split=config['validation_split'],
        callbacks=callbacks,
        verbose=1,
        shuffle=True
    )

    training_time = time.time() - start_time
    print(f"\n✅ Training completed in {training_time/3600:.2f} hours")

    return history

def main():
    """Main training function"""
    print("🖥️ MacBook Neural Network Training")
    print("==================================")

    # Setup
    has_gpu = setup_macbook_gpu()

    # Training configuration
    config = {
        'batch_size': 32 if has_gpu else 16,
        'epochs': 100,
        'validation_split': 0.15,
        'cooling_interval': 15,
        'early_stopping_patience': 10,
        'lr_patience': 5,
    }

    # Create model
    model = create_neural_network()

    # Load data
    X, y = load_training_data('training_data.json')
    if X is None:
        print("❌ No training data available. Please generate data first.")
        return

    # Train
    history = train_model(model, X, y, config)

    # Save final model
    print("\n💾 Saving final model...")
    model.save('thai_checkers_model_macbook.keras')

    # Save training history
    with open('training_history_macbook.json', 'w') as f:
        json.dump(history.history, f, default=str, indent=2)

    print("✅ Training complete!")
    print("\nFiles created:")
    print("- thai_checkers_model_macbook.keras")
    print("- best_model_macbook.keras")
    print("- training_history_macbook.json")

    print(f"\n🎯 Next steps:")
    print("1. Test model performance")
    print("2. Convert to TensorFlow.js format")
    print("3. Deploy to React Native app")

if __name__ == '__main__':
    main()