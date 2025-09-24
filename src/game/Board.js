import { BOARD_SIZE, PLAYERS, PIECE_TYPES, INITIAL_POSITIONS } from '../utils/constants';

export class Board {
  constructor() {
    this.grid = this.createEmptyBoard();
    this.pieces = {
      [PLAYERS.WHITE]: [],
      [PLAYERS.BLACK]: []
    };
    this.initializeBoard();
  }

  createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() =>
      Array(BOARD_SIZE).fill(null)
    );
  }

  initializeBoard() {
    // วางหมากเฉพาะช่องดำ (row + col เป็นเลขคี่)
    for (const player of [PLAYERS.WHITE, PLAYERS.BLACK]) {
      INITIAL_POSITIONS[player].forEach((pos, index) => {
        const piece = {
          player,
          type: PIECE_TYPES.MAN,  // เริ่มต้นเป็นตัวธรรมดา
          id: `${player}_piece_${index}`,
          position: { ...pos }
        };
        this.grid[pos.row][pos.col] = piece;
        this.pieces[player].push(piece);
      });
    }
  }

  getPieceAt(row, col) {
    if (!this.isValidPosition(row, col)) return null;
    return this.grid[row][col];
  }

  setPieceAt(row, col, piece) {
    if (!this.isValidPosition(row, col)) return false;
    this.grid[row][col] = piece;
    return true;
  }

  movePiece(fromRow, fromCol, toRow, toCol) {
    const piece = this.getPieceAt(fromRow, fromCol);
    if (!piece) return false;

    // ย้ายตัวหมาก
    this.grid[toRow][toCol] = piece;
    this.grid[fromRow][fromCol] = null;
    piece.position = { row: toRow, col: toCol };

    return true;
  }

  removePiece(row, col) {
    const piece = this.getPieceAt(row, col);
    if (!piece) return false;

    this.grid[row][col] = null;

    // ลบจาก array ของผู้เล่น
    const pieces = this.pieces[piece.player];
    const index = pieces.findIndex(p => p.id === piece.id);
    if (index !== -1) {
      pieces.splice(index, 1);
    }

    return true;
  }

  promotePiece(row, col) {
    const piece = this.getPieceAt(row, col);
    if (!piece || piece.type === PIECE_TYPES.KING) return false;

    piece.type = PIECE_TYPES.KING;
    return true;
  }

  isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  isDarkSquare(row, col) {
    // หมากฮอสเล่นบนช่องดำเท่านั้น
    return (row + col) % 2 === 1;
  }

  isEmpty(row, col) {
    return this.isValidPosition(row, col) && this.grid[row][col] === null;
  }

  isEnemyPiece(row, col, player) {
    const piece = this.getPieceAt(row, col);
    return piece && piece.player !== player;
  }

  getPlayerPieces(player) {
    return this.pieces[player];
  }

  countPieces(player) {
    return this.pieces[player].length;
  }

  countKings(player) {
    return this.pieces[player].filter(p => p.type === PIECE_TYPES.KING).length;
  }

  clone() {
    const newBoard = new Board();

    // Clear and copy grid
    newBoard.grid = this.grid.map(row =>
      row.map(cell => cell ? { ...cell, position: { ...cell.position } } : null)
    );

    // Clear and copy pieces arrays
    newBoard.pieces = {
      [PLAYERS.WHITE]: [],
      [PLAYERS.BLACK]: []
    };

    // Rebuild pieces arrays from grid
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = newBoard.grid[row][col];
        if (piece) {
          newBoard.pieces[piece.player].push(piece);
        }
      }
    }

    return newBoard;
  }

  toArray() {
    return this.grid.map(row =>
      row.map(cell => {
        if (!cell) return 0;
        if (cell.player === PLAYERS.WHITE) {
          return cell.type === PIECE_TYPES.KING ? 2 : 1;
        } else {
          return cell.type === PIECE_TYPES.KING ? -2 : -1;
        }
      })
    );
  }

  print() {
    console.log('  0 1 2 3 4 5 6 7');
    this.grid.forEach((row, i) => {
      const rowStr = row.map(cell => {
        if (!cell) return '.';
        const symbol = cell.player === PLAYERS.WHITE ? 'w' : 'b';
        return cell.type === PIECE_TYPES.KING ? symbol.toUpperCase() : symbol;
      }).join(' ');
      console.log(`${i} ${rowStr}`);
    });
  }
}