import os
import json
from datetime import datetime

print("=" * 60)
print("🔄 Thai Checkers - TensorFlow.js Conversion (Kaggle)")
print("=" * 60)

MODEL_NAME = "thai_checkers_kaggle"

print("\n🔍 Checking for trained model...")

model_files = [
    f'{MODEL_NAME}.h5',
    f'best_{MODEL_NAME}.h5'
]

model_file = None
for file in model_files:
    if os.path.exists(file):
        model_file = file
        print(f"✅ Found model: {file}")
        break

if not model_file:
    print("❌ No trained model found!")
    print("Please run kaggle_train.py first.")
    exit(1)

print(f"\n📦 Installing TensorFlow.js converter...")
os.system("pip install tensorflowjs")

print(f"\n🔄 Converting {model_file} to TensorFlow.js...")

conversion_command = f"tensorflowjs_converter --input_format=keras --output_format=tfjs_graph_model --quantize_float16 {model_file} tfjs_model"

result = os.system(conversion_command)

if result == 0:
    print("✅ Conversion successful!")
else:
    print("❌ Conversion failed!")
    exit(1)

print("\n📁 Output files:")
if os.path.exists('tfjs_model'):
    files = os.listdir('tfjs_model')
    print(f"   Created {len(files)} files:")
    for file in files:
        size = os.path.getsize(f'tfjs_model/{file}') / 1024
        print(f"      - {file} ({size:.1f} KB)")

    deployment_info = {
        'converted_at': datetime.now().isoformat(),
        'source_model': model_file,
        'quantization': 'float16',
        'files': files,
        'total_size_kb': sum(os.path.getsize(f'tfjs_model/{f}') for f in files) / 1024
    }

    with open('deployment_info.json', 'w') as f:
        json.dump(deployment_info, f, indent=2)

    print("\n✅ Created deployment_info.json")

print("\n" + "=" * 60)
print("🎉 CONVERSION COMPLETE!")
print("=" * 60)
print("📥 Download these files:")
print("   - tfjs_model/model.json")
print("   - tfjs_model/group1-shard*.bin")
print()
print("📂 Deploy to React Native:")
print("   Copy to: assets/model/")
print("=" * 60)