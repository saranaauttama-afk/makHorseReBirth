# 🐴 Thai Horse Chess AI (หมากฮอสไทย AI)

A Thai Horse Chess game with AI opponent built using React Native (Expo) and JavaScript. Features a Minimax AI with alpha-beta pruning for challenging gameplay.

## 🎮 Features

- ✅ Complete game engine with move validation
- ✅ Minimax AI with alpha-beta pruning (depth 2-5)
- ✅ 4 difficulty levels (Easy, Medium, Hard, Expert)
- ✅ Interactive touch-based UI
- ✅ Move highlighting and validation
- ✅ Real-time game state tracking

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/saranaauttama-afk/makHorseReBirth.git
cd makHorseReBirth/horsechess-ai
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
# or
expo start
```

4. Run on your device:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app for physical device

## 📁 Project Structure

```
src/
├── game/
│   ├── Board.js           # Board representation
│   ├── GameEngine.js      # Core game logic
│   ├── MoveValidator.js   # Move validation rules
│   └── ConsoleGame.js     # Console testing
├── ai/
│   ├── MinimaxAI.js       # Minimax with alpha-beta
│   └── EvaluationFunction.js # Position evaluation
├── utils/
│   └── constants.js       # Game constants
└── components/            # React Native UI components
```

## 🎯 Game Rules

Thai Horse Chess (หมากฮอส) is played on an 8x8 board where:
- Each player starts with 2 knights (horses)
- Knights move in an L-shape (like in chess)
- Goal: Capture all opponent's pieces or block their moves
- The game ends when one player has no horses left or cannot move

## 🤖 AI Implementation

### Current AI (Minimax)
- **Algorithm**: Minimax with alpha-beta pruning
- **Depth**: 2-5 levels based on difficulty
- **Evaluation**: Material, position, mobility, threats
- **Performance**: ~10,000 nodes/sec

### Planned Improvements (Neural Network)
- Deep Q-Learning (DQN)
- Self-play reinforcement learning
- Monte Carlo Tree Search (MCTS)
- TensorFlow.js integration

## 📊 Development Roadmap

- [x] Phase 1: Game Engine (Day 1-7)
- [x] Phase 2: Minimax AI (Day 3-4)
- [ ] Phase 3: Neural Network (Day 8-14)
- [ ] Phase 4: Reinforcement Learning (Day 15-21)
- [ ] Phase 5: Mobile Polish (Day 22-30)

## 🛠️ Technologies

- **Frontend**: React Native, Expo
- **AI**: JavaScript (Minimax), TensorFlow.js (planned)
- **State Management**: React Hooks
- **Testing**: Custom test suite

## 📝 License

MIT License

## 👨‍💻 Author

Saran Auttama

## 🙏 Acknowledgments

- Inspired by AlphaZero and chess AI implementations
- Thai Horse Chess traditional game rules

---

**Note**: This is an active development project. The AI will be significantly improved with neural networks and self-play training over the next 30 days.