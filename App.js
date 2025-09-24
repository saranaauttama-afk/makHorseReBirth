import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { GameEngine } from './src/game/GameEngine';
import { MinimaxAI } from './src/ai/MinimaxAI';
import { PLAYERS, GAME_STATUS } from './src/utils/constants';

export default function App() {
  const [gameEngine, setGameEngine] = useState(new GameEngine());
  const [board, setBoard] = useState(gameEngine.board.toArray());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [gameStatus, setGameStatus] = useState(GAME_STATUS.PLAYING);
  const [currentPlayer, setCurrentPlayer] = useState(PLAYERS.WHITE);
  const [aiLevel, setAiLevel] = useState(3);

  const ai = React.useRef(new MinimaxAI(aiLevel, PLAYERS.BLACK));

  useEffect(() => {
    if (currentPlayer === PLAYERS.BLACK && gameStatus === GAME_STATUS.PLAYING) {
      makeAIMove();
    }
  }, [currentPlayer, gameStatus]);

  const makeAIMove = async () => {
    setIsAIThinking(true);

    setTimeout(() => {
      const move = ai.current.getBestMove(gameEngine);

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
      setSelectedSquare({ row, col });
      const moves = gameEngine.getValidMovesForPiece(row, col);
      setValidMoves(moves);
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

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={squareStyle}
        onPress={() => handleSquarePress(row, col)}
        disabled={isAIThinking}
      >
        <Text style={styles.piece}>
          {piece === 1 ? '♘' : piece === -1 ? '♞' : ''}
        </Text>
        {isValidMove && !piece && (
          <View style={styles.moveIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  const changeAILevel = (level) => {
    setAiLevel(level);
    ai.current.setDepth(level);
    resetGame();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>หมากฮอสไทย AI</Text>

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

        <View style={styles.difficultyContainer}>
          <Text style={styles.difficultyLabel}>ระดับ AI:</Text>
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
            ม้าขาว: {gameEngine.board.getPlayerHorses(PLAYERS.WHITE).length} |
            ม้าดำ: {gameEngine.board.getPlayerHorses(PLAYERS.BLACK).length}
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
  difficultyContainer: {
    marginTop: 20,
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
