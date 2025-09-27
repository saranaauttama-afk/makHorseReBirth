"""
TRAIN FROM GOOGLE DRIVE - Load data directly from your Google Drive
Copy and paste this script into Colab and it will connect to your Drive
"""

import tensorflow as tf
import numpy as np
import json
import time
from datetime import datetime
import gc
import os
import pickle

print("=" * 60)
print("🎮 Thai Checkers - Train from Google Drive")
print("Load training data directly from your Drive")
print("=" * 60)

# Mount Google Drive
print("📂 Mounting Google Drive...")
from google.colab import drive
drive.mount('/content/drive')

# Check GPU
print("🔍 Checking GPU availability...")
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    print(f"🔥 GPU available: {gpus[0]}")
    try:
        tf.config.experimental.set_memory_growth(gpus[0], True)
        print("✅ GPU memory growth enabled")
    except:
        pass
else:
    print("⚠️  No GPU found - will use CPU (much slower)")

def find_training_data():
    """ค้นหา training data ใน Google Drive"""
    print("\n🔍 Searching for training data in Google Drive...")

    # Common paths where training data might be
    possible_paths = [
        '/content/drive/MyDrive/ThaiCheckers_AI/training_data/',
        '/content/drive/MyDrive/thai_checkers_training/',
        '/content/drive/MyDrive/thai_checkers_v2/',
        '/content/drive/MyDrive/training_batches/',
        '/content/drive/MyDrive/thai_checkers/',
        '/content/drive/MyDrive/horsechess-ai/training/',
    ]

    for path in possible_paths:
        if os.path.exists(path):
            # หา .pkl files ที่ขึ้นต้นด้วย thai_batch_
            batch_files = [f for f in os.listdir(path) if f.startswith('thai_batch_') and f.endswith('.pkl')]
            if batch_files:
                print(f"✅ Found training data at: {path}")
                print(f"   Batch files: {len(batch_files)}")
                return path

    # If not found, list available directories
    print("❌ Training data not found in common locations.")
    print("📁 Available directories in MyDrive:")
    try:
        mydrive_path = '/content/drive/MyDrive'
        for item in os.listdir(mydrive_path):
            item_path = os.path.join(mydrive_path, item)
            if os.path.isdir(item_path):
                print(f"   📁 {item}")
    except:
        print("   Could not list directories")

    return None

def load_training_data_from_drive(data_path):
    """โหลด training data จาก Google Drive"""
    print(f"\n📊 Loading training data from: {data_path}")

    X = []
    y_policy = []
    y_value = []

    # หา batch files (.pkl format)
    batch_files = sorted([f for f in os.listdir(data_path)
                         if f.startswith('thai_batch_') and f.endswith('.pkl')])

    if not batch_files:
        print("❌ No batch files found!")
        return None, None, None

    print(f"📦 Found {len(batch_files)} batch files")

    # โหลดแต่ละ batch
    for i, batch_file in enumerate(batch_files):
        batch_path = os.path.join(data_path, batch_file)
        print(f"Loading {batch_file}... ({i+1}/{len(batch_files)})")

        try:
            # โหลด pickle file
            with open(batch_path, 'rb') as f:
                data = pickle.load(f)

            # ตรวจสอบ structure ของ data
            if isinstance(data, dict):
                # ถ้าเป็น dict มี keys X, y_policy, y_value
                if 'X' in data and 'y_policy' in data and 'y_value' in data:
                    X.extend(data['X'])
                    y_policy.extend(data['y_policy'])
                    y_value.extend(data['y_value'])
                    print(f"   ✅ Loaded {len(data['X'])} positions (dict format)")
                else:
                    print(f"   ❌ Dict missing required keys: {list(data.keys())}")
                    continue
            elif isinstance(data, tuple) and len(data) == 3:
                # ถ้าเป็น tuple (X, y_policy, y_value)
                batch_X, batch_y_policy, batch_y_value = data
                X.extend(batch_X)
                y_policy.extend(batch_y_policy)
                y_value.extend(batch_y_value)
                print(f"   ✅ Loaded {len(batch_X)} positions (tuple format)")
            else:
                print(f"   ❌ Unknown data format: {type(data)}")
                continue

        except Exception as e:
            print(f"   ❌ Error loading {batch_file}: {e}")
            continue

    if len(X) == 0:
        print("❌ No data loaded!")
        return None, None, None

    print(f"\n✅ Total positions loaded: {len(X)}")
    print(f"   Input shape: {np.array(X[0]).shape}")
    print(f"   Policy shape: {np.array(y_policy[0]).shape}")
    print(f"   Value range: {min(y_value):.3f} to {max(y_value):.3f}")

    return np.array(X), np.array(y_policy), np.array(y_value)

def create_model():
    """สร้างโมเดล Neural Network"""
    inputs = tf.keras.Input(shape=(8, 8, 6))

    # Convolutional layers
    x = tf.keras.layers.Conv2D(32, 3, padding='same', activation='relu')(inputs)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Conv2D(64, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.BatchNormalization()(x)

    # Flatten and dense layers
    x = tf.keras.layers.Flatten()(x)
    x = tf.keras.layers.Dense(256, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.3)(x)

    # Policy head (move selection)
    policy = tf.keras.layers.Dense(128, activation='relu')(x)
    policy = tf.keras.layers.Dense(4096, activation='softmax', name='policy')(policy)

    # Value head (position evaluation)
    value = tf.keras.layers.Dense(64, activation='relu')(x)
    value = tf.keras.layers.Dense(1, activation='tanh', name='value')(value)

    model = tf.keras.Model(inputs=inputs, outputs=[policy, value])

    # Compile model
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss={
            'policy': 'categorical_crossentropy',
            'value': 'mse'
        },
        loss_weights={
            'policy': 1.0,
            'value': 0.5
        },
        metrics={
            'policy': 'accuracy',
            'value': 'mae'
        }
    )

    return model

def train_model(X, y_policy, y_value, epochs=25, batch_size=64):
    """ฝึกโมเดล Neural Network"""
    print("\n🧠 Starting Neural Network Training")
    print("=" * 50)

    model = create_model()
    print(f"✅ Model created with {model.count_params():,} parameters")

    # แบ่งข้อมูล train/validation
    split = int(0.9 * len(X))
    X_train, X_val = X[:split], X[split:]
    y_policy_train, y_policy_val = y_policy[:split], y_policy[split:]
    y_value_train, y_value_val = y_value[:split], y_value[split:]

    print(f"Training on {len(X_train)} samples, validating on {len(X_val)} samples")

    # Callbacks
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1
        ),
        tf.keras.callbacks.ModelCheckpoint(
            '/content/best_model_from_drive.h5',
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        )
    ]

    # Start training
    start_time = time.time()

    history = model.fit(
        X_train,
        {'policy': y_policy_train, 'value': y_value_train},
        validation_data=(
            X_val,
            {'policy': y_policy_val, 'value': y_value_val}
        ),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )

    training_time = time.time() - start_time
    print(f"\n✅ Training completed in {training_time:.1f} seconds ({training_time/60:.1f} minutes)")

    return model, history

def save_results(model, history):
    """บันทึกผลลัพธ์การฝึก"""
    print("\n💾 Saving training results...")

    # Save model
    model.save('/content/thai_checkers_from_drive.h5')
    model.save('/content/thai_checkers_from_drive_model')
    print("✅ Model saved")

    # Save history
    history_dict = {}
    for key, values in history.history.items():
        history_dict[key] = [float(x) for x in values]

    with open('/content/training_history_from_drive.json', 'w') as f:
        json.dump(history_dict, f, indent=2)
    print("✅ Training history saved")

    # Print final metrics
    final_loss = history.history['val_loss'][-1]
    final_policy_acc = history.history['val_policy_accuracy'][-1]
    final_value_mae = history.history['val_value_mae'][-1]

    print(f"\n📈 Final Results:")
    print(f"   Validation Loss: {final_loss:.4f}")
    print(f"   Policy Accuracy: {final_policy_acc:.1%}")
    print(f"   Value MAE: {final_value_mae:.4f}")

def main():
    """หลัก pipeline สำหรับการฝึกจาก Google Drive"""
    print("\n🚀 Starting training pipeline from Google Drive...")

    # ค้นหา training data
    data_path = find_training_data()

    if not data_path:
        print("\n❌ Training data not found!")
        print("\n💡 Please ensure your training data is in one of these locations:")
        print("   • /content/drive/MyDrive/thai_checkers_training/")
        print("   • /content/drive/MyDrive/thai_checkers_v2/")
        print("   • /content/drive/MyDrive/training_batches/")
        print("\n📁 Or manually specify the path by editing this script")
        return

    # โหลดข้อมูล
    print(f"\n📂 Loading data from: {data_path}")
    X, y_policy, y_value = load_training_data_from_drive(data_path)

    if X is None:
        print("❌ Failed to load training data")
        return

    # ฝึกโมเดล
    model, history = train_model(X, y_policy, y_value, epochs=25, batch_size=64)

    # บันทึกผลลัพธ์
    save_results(model, history)

    print("\n" + "=" * 60)
    print("🎉 TRAINING FROM GOOGLE DRIVE COMPLETE!")
    print("=" * 60)
    print("📥 Download these files:")
    print("   1. thai_checkers_from_drive.h5 (main model)")
    print("   2. best_model_from_drive.h5 (best checkpoint)")
    print("   3. training_history_from_drive.json (metrics)")
    print("   4. thai_checkers_from_drive_model/ (SavedModel format)")
    print("=" * 60)

# Manual path override (แก้ที่นี่ถ้า auto-detect ไม่เจอ)
MANUAL_PATH = '/content/drive/MyDrive/ThaiCheckers_AI/training_data/'

if __name__ == "__main__":
    if MANUAL_PATH:
        print(f"🎯 Using manual path: {MANUAL_PATH}")
        # Override the find function
        def find_training_data():
            return MANUAL_PATH if os.path.exists(MANUAL_PATH) else None

    main()