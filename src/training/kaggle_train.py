import os
import json
import pickle
import numpy as np
import tensorflow as tf
from tensorflow import keras
from datetime import datetime

print("=" * 60)
print("Thai Checkers Neural Network Training - Kaggle Version")
print("=" * 60)

KAGGLE_INPUT_PATH = "/kaggle/input/makhostrainingset"
OUTPUT_MODEL_NAME = "thai_checkers_kaggle"

print(f"\n📂 Loading data from: {KAGGLE_INPUT_PATH}")

def load_training_data(data_path):
    """Load all batch files from Kaggle input directory"""
    all_states = []
    all_policies = []
    all_values = []

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data path not found: {data_path}")

    pkl_files = sorted([f for f in os.listdir(data_path) if f.endswith('.pkl')])

    if not pkl_files:
        raise ValueError(f"No .pkl files found in {data_path}")

    print(f"\n✅ Found {len(pkl_files)} batch files")

    for pkl_file in pkl_files:
        file_path = os.path.join(data_path, pkl_file)
        print(f"   Loading {pkl_file}...", end=" ")

        try:
            with open(file_path, 'rb') as f:
                data = pickle.load(f)

            if isinstance(data, dict):
                states = data.get('states', [])
                policies = data.get('policies', [])
                values = data.get('values', [])
            elif isinstance(data, (list, tuple)) and len(data) == 3:
                states, policies, values = data
            else:
                print(f"❌ Invalid format")
                continue

            all_states.extend(states)
            all_policies.extend(policies)
            all_values.extend(values)

            print(f"✅ {len(states)} positions")

        except Exception as e:
            print(f"❌ Error: {e}")

    print(f"\n📊 Total positions loaded: {len(all_states)}")

    X = np.array(all_states, dtype=np.float32)
    y_policy = np.array(all_policies, dtype=np.float32)
    y_value = np.array(all_values, dtype=np.float32)

    return X, y_policy, y_value

def create_model():
    """Create CNN model for Thai Checkers"""
    inputs = keras.Input(shape=(8, 8, 6), name='board_input')

    x = keras.layers.Conv2D(64, (3, 3), padding='same', activation='relu')(inputs)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Conv2D(128, (3, 3), padding='same', activation='relu')(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Conv2D(128, (3, 3), padding='same', activation='relu')(x)
    x = keras.layers.BatchNormalization()(x)

    x = keras.layers.Flatten()(x)
    x = keras.layers.Dense(512, activation='relu')(x)
    x = keras.layers.Dropout(0.3)(x)

    policy_head = keras.layers.Dense(256, activation='relu')(x)
    policy_head = keras.layers.Dropout(0.3)(policy_head)
    policy_output = keras.layers.Dense(4096, activation='softmax', name='policy_output')(policy_head)

    value_head = keras.layers.Dense(128, activation='relu')(x)
    value_head = keras.layers.Dropout(0.3)(value_head)
    value_output = keras.layers.Dense(1, activation='tanh', name='value_output')(value_head)

    model = keras.Model(inputs=inputs, outputs=[policy_output, value_output])

    return model

print("\n🔧 Building model...")
model = create_model()
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss={
        'policy_output': 'categorical_crossentropy',
        'value_output': 'mse'
    },
    loss_weights={
        'policy_output': 1.0,
        'value_output': 0.5
    },
    metrics={
        'policy_output': ['accuracy', 'top_k_categorical_accuracy'],
        'value_output': ['mae']
    }
)

print("\n📋 Model Summary:")
model.summary()

print("\n📥 Loading training data...")
X, y_policy, y_value = load_training_data(KAGGLE_INPUT_PATH)

print(f"\n📊 Data shapes:")
print(f"   X: {X.shape}")
print(f"   y_policy: {y_policy.shape}")
print(f"   y_value: {y_value.shape}")

print("\n🔀 Splitting data...")
split_idx = int(len(X) * 0.9)
X_train, X_val = X[:split_idx], X[split_idx:]
y_policy_train, y_policy_val = y_policy[:split_idx], y_policy[split_idx:]
y_value_train, y_value_val = y_value[:split_idx], y_value[split_idx:]

print(f"   Training: {len(X_train)} positions")
print(f"   Validation: {len(X_val)} positions")

callbacks = [
    keras.callbacks.ModelCheckpoint(
        f'best_{OUTPUT_MODEL_NAME}.h5',
        monitor='val_loss',
        save_best_only=True,
        verbose=1
    ),
    keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=5,
        restore_best_weights=True,
        verbose=1
    ),
    keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=3,
        min_lr=0.00001,
        verbose=1
    )
]

print("\n🚀 Starting training...")
print("=" * 60)

history = model.fit(
    X_train,
    {'policy_output': y_policy_train, 'value_output': y_value_train},
    validation_data=(X_val, {'policy_output': y_policy_val, 'value_output': y_value_val}),
    epochs=30,
    batch_size=128,
    callbacks=callbacks,
    verbose=1
)

print("\n" + "=" * 60)
print("✅ Training Complete!")
print("=" * 60)

print("\n💾 Saving model...")
model.save(f'{OUTPUT_MODEL_NAME}.h5')
print(f"   ✅ Saved: {OUTPUT_MODEL_NAME}.h5")
print(f"   ✅ Saved: best_{OUTPUT_MODEL_NAME}.h5")

history_dict = {
    'loss': [float(x) for x in history.history['loss']],
    'val_loss': [float(x) for x in history.history['val_loss']],
    'policy_output_accuracy': [float(x) for x in history.history['policy_output_accuracy']],
    'val_policy_output_accuracy': [float(x) for x in history.history['val_policy_output_accuracy']],
    'value_output_mae': [float(x) for x in history.history['value_output_mae']],
    'val_value_output_mae': [float(x) for x in history.history['val_value_output_mae']]
}

with open(f'{OUTPUT_MODEL_NAME}_history.json', 'w') as f:
    json.dump(history_dict, f, indent=2)
print(f"   ✅ Saved: {OUTPUT_MODEL_NAME}_history.json")

print("\n📊 Final Metrics:")
print(f"   Policy Accuracy: {history.history['policy_output_accuracy'][-1]:.4f}")
print(f"   Val Policy Accuracy: {history.history['val_policy_output_accuracy'][-1]:.4f}")
print(f"   Value MAE: {history.history['value_output_mae'][-1]:.4f}")
print(f"   Val Value MAE: {history.history['val_value_output_mae'][-1]:.4f}")

print("\n🎯 Next Steps:")
print("1. Download trained model files:")
print(f"   - {OUTPUT_MODEL_NAME}.h5")
print(f"   - best_{OUTPUT_MODEL_NAME}.h5")
print("2. Convert to TensorFlow.js using colab_convert_final.py")
print("3. Deploy to React Native app")

print("\n✨ Training complete! Ready for deployment!")