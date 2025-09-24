export const BOARD_SIZE = 8;

export const PLAYERS = {
  WHITE: 'white',
  BLACK: 'black'
};

export const PIECE_TYPES = {
  HORSE: 'horse',
  EMPTY: null
};

export const INITIAL_POSITIONS = {
  [PLAYERS.WHITE]: [
    { row: 7, col: 1 },
    { row: 7, col: 6 }
  ],
  [PLAYERS.BLACK]: [
    { row: 0, col: 1 },
    { row: 0, col: 6 }
  ]
};

export const HORSE_MOVES = [
  [-2, -1], [-2, 1],
  [-1, -2], [-1, 2],
  [1, -2], [1, 2],
  [2, -1], [2, 1]
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