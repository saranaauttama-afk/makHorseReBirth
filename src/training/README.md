# Thai Checkers Neural Network Training

## 🎯 Complete Training Workflow

### Step 1: Generate Training Data
Use **`colab_batch_final.py`** in Google Colab:

```python
# Copy and paste colab_batch_final.py into Colab
# Generates 4000 games with improved Minimax (Quiescence Search + SimpleEvaluation)
# Saves as thai_batch_000.pkl to thai_batch_004.pkl
```

**Output Files:**
- `thai_batch_000.pkl` - `thai_batch_004.pkl` (1000 positions each)
- `thai_batches_info.json` (generation metadata)

### Step 2: Store Data on Google Drive
- Download batch files from Colab
- Upload to your Google Drive folder (e.g., `ThaiCheckers_AI/training_data/`)

### Step 3: Train Model from Google Drive
Use **`colab_train_from_drive.py`** in Google Colab:

```python
# Copy and paste colab_train_from_drive.py into Colab
# Auto-finds and loads data from your Google Drive
# Trains neural network with GPU acceleration
```

**Output Files:**
- `thai_checkers_from_drive.h5` (trained model)
- `best_model_from_drive.h5` (best checkpoint)
- `training_history_from_drive.json` (training metrics)

### Step 4: Convert to TensorFlow.js
Use **`colab_convert_final.py`** in Google Colab:

```python
# Copy and paste colab_convert_final.py into Colab
# Converts trained model to TensorFlow.js format for React Native
```

**Output Files:**
- `tfjs_model/model.json` (model architecture)
- `tfjs_model/group1-shard1of1.bin` (model weights)

## 📁 Final File Structure

```
src/training/
├── colab_batch_final.py         # Step 1: Generate data
├── colab_train_from_drive.py    # Step 3: Train from Drive
├── colab_convert_final.py       # Step 4: Convert to TensorFlow.js
└── README.md                    # This documentation
```

## 🚀 Key Improvements

### Enhanced Training Data:
- **Stronger Minimax AI** with Quiescence Search
- **Better Evaluation** using SimpleEvaluation (legacy engine techniques)
- **Tactical Depth** - AI sees multi-move capture sequences
- **Strategic Positioning** - Advanced evaluation weights

### Smart Workflow:
- **Batch Processing** prevents memory issues
- **Google Drive Integration** for easy data management
- **Auto-Detection** of data folders
- **Robust Error Handling** for different file formats

## 📊 Expected Performance

| Metric | Previous | New (Improved) |
|--------|----------|----------------|
| Policy Accuracy | ~45% | >60% |
| Value MAE | ~0.35 | <0.2 |
| Training Loss | >0.6 | <0.35 |
| Game Quality | Random-ish | Strategic |

## 💡 Usage Tips

### For Best Results:
1. **Use GPU Runtime** in Google Colab (T4 or better)
2. **Generate 4000+ games** for good data diversity
3. **Monitor training metrics** - stop if overfitting occurs
4. **Test against Minimax** to verify AI strength

### File Management:
- Keep data in organized Google Drive folders
- Download and backup trained models
- Save training history for analysis

### Troubleshooting:
- If auto-detection fails, edit `MANUAL_PATH` in scripts
- For memory issues, reduce batch size in training
- If training stalls, check GPU availability

## 🎮 Deployment

1. Download `model.json` and `group1-shard1of1.bin` from Step 4
2. Copy to React Native app: `assets/model/`
3. Update `NeuralNetworkAI.js` to load from assets
4. Test in app - AI should play significantly stronger!

## 🏆 Success Metrics

**Good Training Results:**
- Policy Accuracy > 60%
- Value MAE < 0.2
- Validation loss decreasing steadily
- AI beats random play 95%+ of the time

**Strong Gameplay:**
- Makes strategic moves, not just tactical
- Understands position value
- Plays endgames well
- Provides genuine challenge to human players

---

**Training pipeline optimized for Thai Checkers with proven techniques! 🧠⚡**