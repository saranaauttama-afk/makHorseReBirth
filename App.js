import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameEngine } from './src/game/GameEngine';
import { MinimaxAI } from './src/ai/MinimaxAI';
import { NeuralNetworkAI } from './src/ai/NeuralNetworkAI';
import { MCTSAI } from './src/ai/MCTSAI';
import { PLAYERS, GAME_STATUS } from './src/utils/constants';
import { runThaiCheckersTests } from './src/game/ThaiCheckersTest';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

export default function App() {
  const [gameEngine, setGameEngine] = useState(new GameEngine());
  const [board, setBoard] = useState(gameEngine.board.toArray());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.PLAYING);
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.WHITE);
  const [aiLevel, setAiLevel] = useState(4); // Start with harder difficulty
  const [aiType, setAiType] = useState('minimax'); // 'minimax', 'neural', or 'mcts'
  const [nnReady, setNnReady] = useState(false);
  const [tfReady, setTfReady] = useState(false);

  const minimaxAI = React.useRef(new MinimaxAI(4, PLAYERS.BLACK)); // Start with depth 4
  const neuralAI = React.useRef(null);
  const mctsAI = React.useRef(new MCTSAI({ iterations: 500, timeLimit: 4000 }, PLAYERS.BLACK)); // Stronger MCTS
  const ai = React.useRef(minimaxAI.current);

  useEffect(() => {
    if (currentPlayer === PLAYERS.BLACK && gameStatus === GAME_STATUS.PLAYING) {
      makeAIMove();
    }
  }, [currentPlayer, gameStatus]);

  // Initialize TensorFlow and Neural Network
  useEffect(() => {
    initializeTensorFlow();
  }, []);

  const initializeTensorFlow = async () => {
    try {
      // Wait for TensorFlow to initialize
      await tf.ready();
      console.log('TensorFlow.js ready, backend:', tf.getBackend());
      setTfReady(true);

      // Create Neural Network AI
      neuralAI.current = new NeuralNetworkAI(null, PLAYERS.BLACK);

      // Load or create neural network model
      const loaded = await neuralAI.current.loadModel('localstorage://thai-checkers-demo-model');

      setNnReady(true);
      console.log('Neural Network AI ready');
    } catch (error) {
      console.error('Failed to initialize Neural Network:', error);
      // Fall back to Minimax
      setAiType('minimax');
    }
  };

  // Update AI reference when type changes
  useEffect(() => {
    if (aiType === 'neural' && neuralAI.current && nnReady) {
      ai.current = neuralAI.current;
      console.log('Switched to Neural Network AI');
    } else if (aiType === 'mcts') {
      ai.current = mctsAI.current;
      console.log('Switched to MCTS AI');
    } else {
      ai.current = minimaxAI.current;
      console.log('Using Minimax AI');
    }
  }, [aiType, nnReady]);

  // Update Minimax depth when level changes
  useEffect(() => {
    minimaxAI.current.maxDepth = aiLevel;
  }, [aiLevel]);

  const makeAIMove = async () => {
    setIsAIThinking(true);

    setTimeout(async () => {
      let move;
      if (aiType === 'neural' && neuralAI.current && nnReady) {
        move = await neuralAI.current.getBestMove(gameEngine);
      } else if (aiType === 'mcts') {
        move = mctsAI.current.getBestMove(gameEngine);
      } else {
        move = ai.current.getBestMove(gameEngine);
      }

      if (move) {
        const result = gameEngine.makeMove(
          move.from.row, move.from.col,
          move.to.row, move.to.col
        );

        if (result.success) {
          updateGameState();
        }
      }
      setIsAIThinking(false);
    }, 100);
  };

  const updateGameState = () => {
    setBoard([...gameEngine.board.toArray()]);
    setCurrentPlayer(gameEngine.currentPlayer);
    setGameStatus(gameEngine.gameStatus);
    setSelectedSquare(null);
    setValidMoves([]);

    if (gameEngine.isGameOver()) {
      showGameOverAlert();
    }
  };

  const showGameOverAlert = () => {
    let message = '';
    if (gameEngine.gameStatus === GAME_STATUS.WHITE_WIN) {
      message = '🎉 คุณชนะ!';
    } else if (gameEngine.gameStatus === GAME_STATUS.BLACK_WIN) {
      message = '🤖 AI ชนะ!';
    } else {
      message = '🤝 เสมอ!';
    }

    Alert.alert('จบเกม', message, [
      { text: 'เล่นใหม่', onPress: resetGame }
    ]);
  };

  const handleSquarePress = (row, col) => {
    if (isAIThinking || currentPlayer !== PLAYERS.WHITE || gameStatus !== GAME_STATUS.PLAYING) {
      return;
    }

    const piece = gameEngine.board.getPieceAt(row, col);

    if (selectedSquare) {
      const isValidMove = validMoves.some(
        move => move.row === row && move.col === col
      );

      if (isValidMove) {
        const result = gameEngine.makeMove(
          selectedSquare.row, selectedSquare.col,
          row, col
        );

        if (result.success) {
          updateGameState();
        }
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else if (piece && piece.player === PLAYERS.WHITE) {
      // ตรวจสอบว่าตัวนี้สามารถเดินได้หรือไม่ (ตาม mandatory capture rule)
      if (canSelectPiece(row, col)) {
        setSelectedSquare({ row, col });
        const moves = gameEngine.getValidMovesForPiece(row, col);
        // แปลง move structure ให้ตรงกับ UI
        const processedMoves = moves.map(move => move.to);
        setValidMoves(processedMoves);
      }
    }
  };

  const canSelectPiece = (row, col) => {
    // ดูว่ามีการกินได้ในบอร์ดหรือไม่
    const allPlayerMoves = gameEngine.getAllValidMoves();
    const hasCaptures = allPlayerMoves.some(move => move.type === 'capture');

    if (!hasCaptures) {
      // ไม่มีการกิน ให้เลือกตัวไหนก็ได้ที่เดินได้
      const pieceMoves = gameEngine.getValidMovesForPiece(row, col);
      return pieceMoves.length > 0;
    } else {
      // มีการกิน ให้เลือกได้เฉพาะตัวที่กินได้
      const pieceMoves = gameEngine.getValidMovesForPiece(row, col);
      return pieceMoves.some(move => move.type === 'capture');
    }
  };

  const resetGame = () => {
    const newEngine = new GameEngine();
    setGameEngine(newEngine);
    setBoard(newEngine.board.toArray());
    setSelectedSquare(null);
    setValidMoves([]);
    setGameStatus(GAME_STATUS.PLAYING);
    setCurrentPlayer(PLAYERS.WHITE);
    setIsAIThinking(false);
  };

  const renderSquare = (row, col) => {
    const piece = board[row][col];
    const isSelected = selectedSquare &&
      selectedSquare.row === row && selectedSquare.col === col;
    const isValidMove = validMoves.some(
      move => move.row === row && move.col === col
    );
    const isLight = (row + col) % 2 === 0;

    // ตรวจสอบว่าตัวนี้เลือกได้หรือไม่ (สำหรับ mandatory capture)
    const isPieceSelectable = piece &&
                              piece > 0 &&
                              currentPlayer === PLAYERS.WHITE &&
                              canSelectPiece(row, col);

    let squareStyle = [
      styles.square,
      isLight ? styles.lightSquare : styles.darkSquare
    ];

    if (isSelected) {
      squareStyle.push(styles.selectedSquare);
    }

    if (isValidMove) {
      squareStyle.push(styles.validMove);
    }

    // เพิ่ม highlight สำหรับตัวที่กินได้ (mandatory capture)
    if (isPieceSelectable && !selectedSquare) {
      const allPlayerMoves = gameEngine.getAllValidMoves();
      const hasCaptures = allPlayerMoves.some(move => move.type === 'capture');
      const pieceMoves = gameEngine.getValidMovesForPiece(row, col);
      const pieceCanCapture = pieceMoves.some(move => move.type === 'capture');

      if (hasCaptures && pieceCanCapture) {
        squareStyle.push(styles.mustCapture);
      }
    }

    // แสดงตัวหมากฮอส
    let pieceSymbol = '';
    if (piece === 1) pieceSymbol = '⚪'; // White man
    else if (piece === 2) pieceSymbol = '♔'; // White king
    else if (piece === -1) pieceSymbol = '⚫'; // Black man
    else if (piece === -2) pieceSymbol = '♚'; // Black king

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={squareStyle}
        onPress={() => handleSquarePress(row, col)}
        disabled={isAIThinking}
      >
        <Text style={styles.piece}>
          {pieceSymbol}
        </Text>
        {isValidMove && !piece && (
          <View style={styles.moveIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  const changeAILevel = (level) => {
    setAiLevel(level);
    if (aiType === 'minimax') {
      minimaxAI.current.maxDepth = level;
    } else if (aiType === 'mcts') {
      // Adjust MCTS iterations based on difficulty
      const iterations = level === 2 ? 200 : level === 3 ? 300 : level === 4 ? 500 : 800;
      mctsAI.current.setConfig({ iterations, timeLimit: 3000 });
    }
    resetGame();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>หมากฮอสไทย (Thai Checkers) AI</Text>

        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            ตาของ: {currentPlayer === PLAYERS.WHITE ? 'คุณ (ขาว)' : 'AI (ดำ)'}
          </Text>
          {isAIThinking && <ActivityIndicator size="small" color="#007AFF" />}
        </View>

        <View style={styles.board}>
          {[...Array(8)].map((_, row) => (
            <View key={row} style={styles.row}>
              {[...Array(8)].map((_, col) => renderSquare(row, col))}
            </View>
          ))}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.button} onPress={resetGame}>
            <Text style={styles.buttonText}>เริ่มใหม่</Text>
          </TouchableOpacity>
        </View>

        {/* AI Type Selector */}
        <View style={styles.aiTypeContainer}>
          <Text style={styles.aiTypeLabel}>ประเภท AI:</Text>
          <View style={styles.aiTypeButtons}>
            <TouchableOpacity
              style={[
                styles.aiTypeButton,
                aiType === 'minimax' && styles.selectedAiType
              ]}
              onPress={() => setAiType('minimax')}
            >
              <Text style={[
                styles.aiTypeButtonText,
                aiType === 'minimax' && styles.selectedAiTypeText
              ]}>
                Minimax
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.aiTypeButton,
                aiType === 'neural' && styles.selectedAiType,
                !nnReady && styles.disabledButton
              ]}
              onPress={() => nnReady && setAiType('neural')}
              disabled={!nnReady}
            >
              <Text style={[
                styles.aiTypeButtonText,
                aiType === 'neural' && styles.selectedAiTypeText,
                !nnReady && styles.disabledText
              ]}>
                Neural Network
                {!nnReady && ' (Loading...)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.aiTypeButton,
                aiType === 'mcts' && styles.selectedAiType
              ]}
              onPress={() => setAiType('mcts')}
            >
              <Text style={[
                styles.aiTypeButtonText,
                aiType === 'mcts' && styles.selectedAiTypeText
              ]}>
                MCTS
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.difficultyContainer}>
          <Text style={styles.difficultyLabel}>ระดับ AI{aiType === 'minimax' ? ' (Depth)' : ''}:</Text>
          <View style={styles.difficultyButtons}>
            {[
              { label: 'ง่าย', value: 2 },
              { label: 'กลาง', value: 3 },
              { label: 'ยาก', value: 4 },
              { label: 'ยากมาก', value: 5 }
            ].map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.difficultyButton,
                  aiLevel === value && styles.selectedDifficulty
                ]}
                onPress={() => changeAILevel(value)}
              >
                <Text style={[
                  styles.difficultyButtonText,
                  aiLevel === value && styles.selectedDifficultyText
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.stats}>
          <Text style={styles.statsText}>รอบที่: {gameEngine.turnCount}</Text>
          <Text style={styles.statsText}>
            หมากขาว: {gameEngine.board.countPieces(PLAYERS.WHITE)} |
            หมากดำ: {gameEngine.board.countPieces(PLAYERS.BLACK)}
          </Text>
          <Text style={styles.statsText}>
            ฮอสขาว: {gameEngine.board.countKings(PLAYERS.WHITE)} |
            ฮอสดำ: {gameEngine.board.countKings(PLAYERS.BLACK)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 30,
  },
  statusText: {
    fontSize: 18,
    marginRight: 10,
    color: '#555',
  },
  board: {
    backgroundColor: '#8B4513',
    padding: 5,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightSquare: {
    backgroundColor: '#F0D9B5',
  },
  darkSquare: {
    backgroundColor: '#B58863',
  },
  selectedSquare: {
    backgroundColor: '#7FB069',
  },
  validMove: {
    backgroundColor: 'rgba(127, 176, 105, 0.5)',
  },
  mustCapture: {
    backgroundColor: 'rgba(255, 100, 100, 0.7)',
    borderWidth: 2,
    borderColor: '#FF3333',
  },
  piece: {
    fontSize: 30,
    color: '#000',
  },
  moveIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controls: {
    marginTop: 20,
    flexDirection: 'row',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  aiTypeContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  aiTypeLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  aiTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  aiTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedAiType: {
    backgroundColor: '#007AFF',
    borderColor: '#0056b3',
  },
  aiTypeButtonText: {
    color: '#333',
  },
  selectedAiTypeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  difficultyContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#555',
  },
  difficultyButtons: {
    flexDirection: 'row',
  },
  difficultyButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#ddd',
  },
  selectedDifficulty: {
    backgroundColor: '#007AFF',
  },
  difficultyButtonText: {
    fontSize: 14,
    color: '#555',
  },
  selectedDifficultyText: {
    color: 'white',
  },
  stats: {
    marginTop: 20,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
});
