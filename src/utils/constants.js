export const BOARD_SIZE = 8;

export const PLAYERS = {
  WHITE: 'white',
  BLACK: 'black'
};

export const PIECE_TYPES = {
  MAN: 'man',      // ตัวหมากธรรมดา
  KING: 'king',    // ฮอส (ตัวที่เลื่อนขั้นแล้ว)
  EMPTY: null
};

// ตำแหน่งเริ่มต้นของหมากฮอส 8 ตัวต่อฝ่าย
export const INITIAL_POSITIONS = {
  [PLAYERS.BLACK]: [
    { row: 0, col: 1 }, { row: 0, col: 3 }, { row: 0, col: 5 }, { row: 0, col: 7 },
    { row: 1, col: 0 }, { row: 1, col: 2 }, { row: 1, col: 4 }, { row: 1, col: 6 }
  ],
  [PLAYERS.WHITE]: [
    { row: 6, col: 1 }, { row: 6, col: 3 }, { row: 6, col: 5 }, { row: 6, col: 7 },
    { row: 7, col: 0 }, { row: 7, col: 2 }, { row: 7, col: 4 }, { row: 7, col: 6 }
  ]
};

// ทิศทางการเดินของตัวหมากธรรมดา
export const MAN_MOVE_DIRECTIONS = {
  [PLAYERS.WHITE]: [
    [-1, -1], [-1, 1]  // ขาวเดินขึ้น (ทแยงซ้าย, ทแยงขวา)
  ],
  [PLAYERS.BLACK]: [
    [1, -1], [1, 1]    // ดำเดินลง (ทแยงซ้าย, ทแยงขวา)
  ]
};

// ทิศทางการเดินของฮอส (เดินได้ทุกทิศ)
export const KING_MOVE_DIRECTIONS = [
  [-1, -1], [-1, 1],  // ขึ้น-ซ้าย, ขึ้น-ขวา
  [1, -1], [1, 1]     // ลง-ซ้าย, ลง-ขวา
];

export const GAME_STATUS = {
  PLAYING: 'playing',
  WHITE_WIN: 'white_win',
  BLACK_WIN: 'black_win',
  DRAW: 'draw'
};

export const AI_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert'
};

// แถวที่จะเลื่อนขั้นเป็นฮอส
export const PROMOTION_ROW = {
  [PLAYERS.WHITE]: 0,  // ขาวต้องไปแถว 0
  [PLAYERS.BLACK]: 7   // ดำต้องไปแถว 7
};