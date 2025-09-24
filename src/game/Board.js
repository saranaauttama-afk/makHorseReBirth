import { BOARD_SIZE, PLAYERS, PIECE_TYPES, INITIAL_POSITIONS } from '../utils/constants';

export class Board {
  constructor() {
    this.grid = this.createEmptyBoard();
    this.horses = {
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
    for (const player of [PLAYERS.WHITE, PLAYERS.BLACK]) {
      INITIAL_POSITIONS[player].forEach((pos, index) => {
        const horse = {
          player,
          type: PIECE_TYPES.HORSE,
          id: `${player}_horse_${index}`,
          position: { ...pos }
        };
        this.grid[pos.row][pos.col] = horse;
        this.horses[player].push(horse);
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

    const targetPiece = this.getPieceAt(toRow, toCol);

    this.grid[toRow][toCol] = piece;
    this.grid[fromRow][fromCol] = null;

    piece.position = { row: toRow, col: toCol };

    if (targetPiece && targetPiece.player !== piece.player) {
      this.removePiece(targetPiece);
    }

    return true;
  }

  removePiece(piece) {
    const horses = this.horses[piece.player];
    const index = horses.findIndex(h => h.id === piece.id);
    if (index !== -1) {
      horses.splice(index, 1);
    }
  }

  isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  isEmpty(row, col) {
    return this.isValidPosition(row, col) && this.grid[row][col] === null;
  }

  isEnemyPiece(row, col, player) {
    const piece = this.getPieceAt(row, col);
    return piece && piece.player !== player;
  }

  getPlayerHorses(player) {
    return this.horses[player];
  }

  clone() {
    const newBoard = new Board();
    newBoard.grid = this.grid.map(row => [...row]);
    newBoard.horses = {
      [PLAYERS.WHITE]: [...this.horses[PLAYERS.WHITE]],
      [PLAYERS.BLACK]: [...this.horses[PLAYERS.BLACK]]
    };
    return newBoard;
  }

  toArray() {
    return this.grid.map(row =>
      row.map(cell => {
        if (!cell) return 0;
        if (cell.player === PLAYERS.WHITE) {
          return cell.type === PIECE_TYPES.HORSE ? 1 : 0;
        } else {
          return cell.type === PIECE_TYPES.HORSE ? -1 : 0;
        }
      })
    );
  }

  print() {
    console.log('  0 1 2 3 4 5 6 7');
    this.grid.forEach((row, i) => {
      const rowStr = row.map(cell => {
        if (!cell) return '.';
        return cell.player === PLAYERS.WHITE ? 'W' : 'B';
      }).join(' ');
      console.log(`${i} ${rowStr}`);
    });
  }
}