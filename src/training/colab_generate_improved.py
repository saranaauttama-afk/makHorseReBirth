import sys
import json
import pickle
import numpy as np
from datetime import datetime

print("=" * 60)
print("Thai Checkers - IMPROVED Data Generation")
print("Using Minimax Depth 5 + Better Evaluation")
print("=" * 60)

sys.path.append('/content')

BOARD_SIZE = 8
PLAYERS = {'WHITE': 'white', 'BLACK': 'black'}
PIECE_TYPES = {'MAN': 'man', 'KING': 'king'}

class SimpleBoard:
    def __init__(self):
        self.grid = [[None]*8 for _ in range(8)]
        self.init_board()

    def init_board(self):
        white_positions = [(5,0),(5,2),(5,4),(5,6),(6,1),(6,3),(6,5),(6,7),(7,0),(7,2),(7,4),(7,6)]
        black_positions = [(0,1),(0,3),(0,5),(0,7),(1,0),(1,2),(1,4),(1,6),(2,1),(2,3),(2,5),(2,7)]

        for r, c in white_positions:
            self.grid[r][c] = {'player': 'white', 'type': 'man'}
        for r, c in black_positions:
            self.grid[r][c] = {'player': 'black', 'type': 'man'}

    def get_piece(self, r, c):
        if 0 <= r < 8 and 0 <= c < 8:
            return self.grid[r][c]
        return None

    def copy(self):
        new_board = SimpleBoard.__new__(SimpleBoard)
        new_board.grid = [row[:] for row in self.grid]
        return new_board

def get_valid_moves(board, player):
    moves = []
    captures = []

    for r in range(8):
        for c in range(8):
            piece = board.get_piece(r, c)
            if piece and piece['player'] == player:
                piece_captures = get_captures(board, r, c, piece)
                if piece_captures:
                    captures.extend(piece_captures)
                else:
                    piece_moves = get_normal_moves(board, r, c, piece)
                    moves.extend(piece_moves)

    return captures if captures else moves

def get_captures(board, r, c, piece):
    captures = []
    dirs = [(-1,-1),(-1,1),(1,-1),(1,1)] if piece['type'] == 'king' else \
           ([(-1,-1),(-1,1)] if piece['player'] == 'white' else [(1,-1),(1,1)])

    for dr, dc in dirs:
        enemy_r, enemy_c = r + dr, c + dc
        land_r, land_c = r + 2*dr, c + 2*dc

        if 0 <= land_r < 8 and 0 <= land_c < 8:
            enemy = board.get_piece(enemy_r, enemy_c)
            landing = board.get_piece(land_r, land_c)

            if enemy and enemy['player'] != piece['player'] and not landing:
                captures.append({
                    'from': (r,c),
                    'to': (land_r, land_c),
                    'captured': [(enemy_r, enemy_c)]
                })

    return captures

def get_normal_moves(board, r, c, piece):
    moves = []
    dirs = [(-1,-1),(-1,1),(1,-1),(1,1)] if piece['type'] == 'king' else \
           ([(-1,-1),(-1,1)] if piece['player'] == 'white' else [(1,-1),(1,1)])

    for dr, dc in dirs:
        new_r, new_c = r + dr, c + dc
        if 0 <= new_r < 8 and 0 <= new_c < 8:
            if not board.get_piece(new_r, new_c):
                moves.append({
                    'from': (r,c),
                    'to': (new_r, new_c),
                    'captured': []
                })

    return moves

def make_move(board, move):
    fr, fc = move['from']
    tr, tc = move['to']

    piece = board.grid[fr][fc]
    board.grid[tr][tc] = piece
    board.grid[fr][fc] = None

    for cap_r, cap_c in move['captured']:
        board.grid[cap_r][cap_c] = None

    if piece['type'] == 'man':
        if (piece['player'] == 'white' and tr == 0) or \
           (piece['player'] == 'black' and tr == 7):
            piece['type'] = 'king'

def evaluate_board(board, player):
    score = 0
    opponent = 'black' if player == 'white' else 'white'

    for r in range(8):
        for c in range(8):
            piece = board.get_piece(r, c)
            if not piece:
                continue

            piece_value = 30 if piece['type'] == 'king' else 10

            advancement = r if piece['player'] == 'white' else (7 - r)
            piece_value += advancement * 1.5

            center_bonus = (3 - abs(3.5 - r)) + (3 - abs(3.5 - c))
            piece_value += center_bonus * 0.5

            if piece['player'] == player:
                score += piece_value
            else:
                score -= piece_value

    return score

def minimax(board, depth, alpha, beta, maximizing, player):
    if depth == 0:
        return evaluate_board(board, player), None

    moves = get_valid_moves(board, player if maximizing else ('black' if player == 'white' else 'white'))

    if not moves:
        return (-10000 if maximizing else 10000), None

    best_move = None

    if maximizing:
        max_eval = -float('inf')
        for move in moves:
            new_board = board.copy()
            make_move(new_board, move)
            eval_score, _ = minimax(new_board, depth-1, alpha, beta, False, player)

            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move

            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break

        return max_eval, best_move
    else:
        min_eval = float('inf')
        for move in moves:
            new_board = board.copy()
            make_move(new_board, move)
            eval_score, _ = minimax(new_board, depth-1, alpha, beta, True, player)

            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move

            beta = min(beta, eval_score)
            if beta <= alpha:
                break

        return min_eval, best_move

def board_to_tensor(board, current_player):
    tensor = np.zeros((8, 8, 6), dtype=np.float32)

    for r in range(8):
        for c in range(8):
            piece = board.get_piece(r, c)
            if piece:
                if piece['player'] == current_player:
                    if piece['type'] == 'man':
                        tensor[r][c][0] = 1.0
                    else:
                        tensor[r][c][1] = 1.0
                else:
                    if piece['type'] == 'man':
                        tensor[r][c][2] = 1.0
                    else:
                        tensor[r][c][3] = 1.0

    return tensor

def move_to_policy(move):
    policy = np.zeros(4096, dtype=np.float32)
    fr, fc = move['from']
    tr, tc = move['to']
    idx = fr * 512 + fc * 64 + tr * 8 + tc
    policy[idx] = 1.0
    return policy

def play_game():
    board = SimpleBoard()
    current_player = 'white'
    game_data = []
    moves_count = 0
    max_moves = 100

    while moves_count < max_moves:
        moves = get_valid_moves(board, current_player)

        if not moves:
            winner = 'black' if current_player == 'white' else 'white'
            break

        _, best_move = minimax(board, 5, -float('inf'), float('inf'), True, current_player)

        if not best_move:
            winner = 'black' if current_player == 'white' else 'white'
            break

        state = board_to_tensor(board, current_player)
        policy = move_to_policy(best_move)

        game_data.append({
            'state': state,
            'policy': policy,
            'player': current_player
        })

        make_move(board, best_move)

        current_player = 'black' if current_player == 'white' else 'white'
        moves_count += 1
    else:
        white_score = sum(1 for r in range(8) for c in range(8)
                         if board.get_piece(r,c) and board.get_piece(r,c)['player'] == 'white')
        black_score = sum(1 for r in range(8) for c in range(8)
                         if board.get_piece(r,c) and board.get_piece(r,c)['player'] == 'black')
        winner = 'white' if white_score > black_score else 'black'

    for data in game_data:
        if data['player'] == winner:
            data['value'] = 1.0
        elif data['player'] != winner:
            data['value'] = -1.0
        else:
            data['value'] = 0.0

    return game_data

print("\n🎮 Generating training data with DEPTH 5...")
print("This will create much better quality games!\n")

all_states = []
all_policies = []
all_values = []

num_games = 5000
batch_size = 1000

for batch_num in range(num_games // batch_size):
    batch_states = []
    batch_policies = []
    batch_values = []

    print(f"\n📦 Batch {batch_num + 1}/{num_games // batch_size}")

    for i in range(batch_size):
        if (i + 1) % 100 == 0:
            print(f"   Game {i + 1}/{batch_size}...")

        game_data = play_game()

        for data in game_data:
            batch_states.append(data['state'])
            batch_policies.append(data['policy'])
            batch_values.append(data['value'])

    filename = f'thai_batch_improved_{batch_num:03d}.pkl'
    with open(filename, 'wb') as f:
        pickle.dump({
            'states': batch_states,
            'policies': batch_policies,
            'values': batch_values
        }, f)

    print(f"   ✅ Saved {filename} with {len(batch_states)} positions")

print("\n" + "=" * 60)
print("✅ Data Generation Complete!")
print(f"📊 Total: {num_games} games")
print("🎯 Quality: Minimax Depth 5 (much stronger!)")
print("=" * 60)