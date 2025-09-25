import * as tf from '@tensorflow/tfjs';
import { BOARD_SIZE, PLAYERS, PIECE_TYPES } from '../utils/constants.js';

export class DataProcessor {
  /**
   * Convert board state to tensor representation
   * 6 channels:
   * 0: Current player's men
   * 1: Current player's kings
   * 2: Opponent's men
   * 3: Opponent's kings
   * 4: Valid moves mask (1 where current player can move)
   * 5: Turn counter (normalized 0-1)
   *
   * @param {Board} board - Game board instance
   * @param {string} currentPlayer - Current player
   * @param {number} turnCount - Current turn number
   * @returns {tf.Tensor3D} - 8x8x6 tensor
   */
  static boardToTensor(board, currentPlayer, turnCount = 0) {
    const tensor = tf.zeros([BOARD_SIZE, BOARD_SIZE, 6]);
    const tensorArray = tensor.arraySync();

    const opponent = currentPlayer === PLAYERS.WHITE ? PLAYERS.BLACK : PLAYERS.WHITE;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board.getPieceAt(row, col);

        if (piece) {
          if (piece.player === currentPlayer) {
            // Current player's pieces
            if (piece.type === PIECE_TYPES.MAN) {
              tensorArray[row][col][0] = 1;
            } else if (piece.type === PIECE_TYPES.KING) {
              tensorArray[row][col][1] = 1;
            }
          } else {
            // Opponent's pieces
            if (piece.type === PIECE_TYPES.MAN) {
              tensorArray[row][col][2] = 1;
            } else if (piece.type === PIECE_TYPES.KING) {
              tensorArray[row][col][3] = 1;
            }
          }
        }

        // Channel 5: Turn counter (normalized)
        tensorArray[row][col][5] = Math.min(turnCount / 100, 1); // Normalize to 0-1
      }
    }

    // Clean up and return new tensor
    tensor.dispose();
    return tf.tensor3d(tensorArray);
  }

  /**
   * Add valid moves mask to tensor
   * @param {tf.Tensor3D} tensor - Board tensor
   * @param {Array} validMoves - Array of valid moves
   * @returns {tf.Tensor3D} - Updated tensor
   */
  static addValidMovesMask(tensor, validMoves) {
    const tensorArray = tensor.arraySync();

    // Mark positions where pieces can move from
    validMoves.forEach(move => {
      if (move.from && move.from.row >= 0 && move.from.col >= 0) {
        tensorArray[move.from.row][move.from.col][4] = 1;
      }
    });

    const oldTensor = tensor;
    const newTensor = tf.tensor3d(tensorArray);
    oldTensor.dispose();
    return newTensor;
  }

  /**
   * Convert move to policy index
   * Policy is 64x64 = 4096 possible from-to combinations
   * @param {Object} move - { from: {row, col}, to: {row, col} }
   * @returns {number} - Policy index (0-4095)
   */
  static moveToPolicyIndex(move) {
    const fromIndex = move.from.row * BOARD_SIZE + move.from.col;
    const toIndex = move.to.row * BOARD_SIZE + move.to.col;
    return fromIndex * (BOARD_SIZE * BOARD_SIZE) + toIndex;
  }

  /**
   * Convert policy index back to move
   * @param {number} policyIndex - Index in policy vector
   * @returns {Object} - { from: {row, col}, to: {row, col} }
   */
  static policyIndexToMove(policyIndex) {
    const totalSquares = BOARD_SIZE * BOARD_SIZE;
    const fromIndex = Math.floor(policyIndex / totalSquares);
    const toIndex = policyIndex % totalSquares;

    return {
      from: {
        row: Math.floor(fromIndex / BOARD_SIZE),
        col: fromIndex % BOARD_SIZE
      },
      to: {
        row: Math.floor(toIndex / BOARD_SIZE),
        col: toIndex % BOARD_SIZE
      }
    };
  }

  /**
   * Create one-hot encoded policy vector from move
   * @param {Object} move - Move object
   * @returns {Float32Array} - One-hot encoded vector (4096 dimensions)
   */
  static moveToOneHot(move) {
    const policySize = BOARD_SIZE * BOARD_SIZE * BOARD_SIZE * BOARD_SIZE;
    const oneHot = new Float32Array(policySize);
    const index = this.moveToPolicyIndex(move);
    oneHot[index] = 1;
    return oneHot;
  }

  /**
   * Convert game outcome to value
   * @param {string} winner - Winner (PLAYERS.WHITE, PLAYERS.BLACK, or null for draw)
   * @param {string} perspective - Player perspective
   * @returns {number} - Value between -1 and 1
   */
  static outcomeToValue(winner, perspective) {
    if (winner === null) return 0; // Draw
    if (winner === perspective) return 1; // Win
    return -1; // Loss
  }

  /**
   * Augment data with rotations and reflections
   * Thai Checkers can be augmented with 180-degree rotation
   * @param {tf.Tensor3D} boardTensor - Original board tensor
   * @param {Object} move - Original move
   * @returns {Array} - Array of {tensor, move} augmented data
   */
  static augmentData(boardTensor, move) {
    const augmented = [];

    // Original
    augmented.push({
      tensor: boardTensor,
      move: move
    });

    // 180-degree rotation
    const rotated = tf.reverse2d(tf.reverse2d(boardTensor, 0), 1);
    const rotatedMove = {
      from: {
        row: BOARD_SIZE - 1 - move.from.row,
        col: BOARD_SIZE - 1 - move.from.col
      },
      to: {
        row: BOARD_SIZE - 1 - move.to.row,
        col: BOARD_SIZE - 1 - move.to.col
      }
    };
    augmented.push({
      tensor: rotated,
      move: rotatedMove
    });

    return augmented;
  }

  /**
   * Prepare batch of training data
   * @param {Array} gameStates - Array of {board, move, value, currentPlayer, turnCount}
   * @returns {Object} - { inputs: tf.Tensor4D, policyTargets: tf.Tensor2D, valueTargets: tf.Tensor2D }
   */
  static prepareBatch(gameStates) {
    const inputs = [];
    const policyTargets = [];
    const valueTargets = [];

    gameStates.forEach(state => {
      // Convert board to tensor
      const boardTensor = this.boardToTensor(
        state.board,
        state.currentPlayer,
        state.turnCount
      );

      // Add valid moves mask if available
      if (state.validMoves) {
        const tensorWithMask = this.addValidMovesMask(boardTensor, state.validMoves);
        boardTensor.dispose();
        inputs.push(tensorWithMask.arraySync());
      } else {
        inputs.push(boardTensor.arraySync());
        boardTensor.dispose();
      }

      // Convert move to one-hot policy
      policyTargets.push(this.moveToOneHot(state.move));

      // Convert outcome to value
      valueTargets.push([state.value]);
    });

    return {
      inputs: tf.tensor4d(inputs),
      policyTargets: tf.tensor2d(policyTargets),
      valueTargets: tf.tensor2d(valueTargets)
    };
  }

  /**
   * Clean up tensors to prevent memory leaks
   */
  static cleanup(tensors) {
    if (Array.isArray(tensors)) {
      tensors.forEach(t => t.dispose());
    } else if (tensors) {
      tensors.dispose();
    }
  }
}