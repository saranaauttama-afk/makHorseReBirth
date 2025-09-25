#!/usr/bin/env python3
"""
🎯 MacBook Training Data Generator
Generates high-quality Thai Checkers training data using Minimax self-play
"""

import os
import sys
import json
import time
import random
import numpy as np
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import multiprocessing as mp

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

class ThaiCheckersBoard:
    """Simplified Thai Checkers board representation for Python"""

    def __init__(self):
        self.board = self.create_initial_board()
        self.current_player = 1  # 1 = White, -1 = Black

    def create_initial_board(self):
        """Create initial Thai Checkers position"""
        board = [[0 for _ in range(8)] for _ in range(8)]

        # White pieces (top)
        for row in range(2):
            for col in range(8):
                if (row + col) % 2 == 1:  # Dark squares only
                    board[row][col] = 1

        # Black pieces (bottom)
        for row in range(6, 8):
            for col in range(8):
                if (row + col) % 2 == 1:  # Dark squares only
                    board[row][col] = -1

        return board

    def get_valid_moves(self, player):
        """Get all valid moves for player"""
        moves = []

        # First check for mandatory captures
        capture_moves = self.get_capture_moves(player)
        if capture_moves:
            return capture_moves

        # Regular moves if no captures available
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if (piece > 0 and player > 0) or (piece < 0 and player < 0):
                    moves.extend(self.get_piece_moves(row, col, piece))

        return moves

    def get_capture_moves(self, player):
        """Get all capture moves for player"""
        captures = []

        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if (piece > 0 and player > 0) or (piece < 0 and player < 0):
                    piece_captures = self.get_piece_captures(row, col, piece)
                    captures.extend(piece_captures)

        return captures

    def get_piece_moves(self, row, col, piece):
        """Get regular moves for a piece"""
        moves = []
        is_king = abs(piece) == 2

        # Movement directions
        if piece > 0 or is_king:  # White or king
            directions = [(1, -1), (1, 1)]
            if is_king:
                directions.extend([(-1, -1), (-1, 1)])
        else:  # Black
            directions = [(-1, -1), (-1, 1)]

        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
            if 0 <= new_row < 8 and 0 <= new_col < 8 and self.board[new_row][new_col] == 0:
                moves.append({
                    'from': {'row': row, 'col': col},
                    'to': {'row': new_row, 'col': new_col},
                    'type': 'move'
                })

        return moves

    def get_piece_captures(self, row, col, piece):
        """Get capture moves for a piece"""
        captures = []
        is_king = abs(piece) == 2

        # Capture directions
        if piece > 0 or is_king:  # White or king
            directions = [(1, -1), (1, 1)]
            if is_king:
                directions.extend([(-1, -1), (-1, 1)])
        else:  # Black
            directions = [(-1, -1), (-1, 1)]

        for dr, dc in directions:
            enemy_row, enemy_col = row + dr, col + dc
            landing_row, landing_col = row + 2*dr, col + 2*dc

            if (0 <= enemy_row < 8 and 0 <= enemy_col < 8 and
                0 <= landing_row < 8 and 0 <= landing_col < 8):

                enemy_piece = self.board[enemy_row][enemy_col]
                landing_square = self.board[landing_row][landing_col]

                # Check if enemy piece exists and landing square is empty
                if (enemy_piece != 0 and landing_square == 0 and
                    ((piece > 0 and enemy_piece < 0) or (piece < 0 and enemy_piece > 0))):

                    captures.append({
                        'from': {'row': row, 'col': col},
                        'to': {'row': landing_row, 'col': landing_col},
                        'captured': {'row': enemy_row, 'col': enemy_col},
                        'type': 'capture'
                    })

        return captures

    def make_move(self, move):
        """Execute a move and return success status"""
        from_pos = move['from']
        to_pos = move['to']

        piece = self.board[from_pos['row']][from_pos['col']]
        if piece == 0:
            return False

        # Move piece
        self.board[to_pos['row']][to_pos['col']] = piece
        self.board[from_pos['row']][from_pos['col']] = 0

        # Handle capture
        if move['type'] == 'capture':
            captured_pos = move['captured']
            self.board[captured_pos['row']][captured_pos['col']] = 0

        # King promotion
        if abs(piece) == 1:  # Regular piece
            if (piece > 0 and to_pos['row'] == 7) or (piece < 0 and to_pos['row'] == 0):
                self.board[to_pos['row']][to_pos['col']] = piece * 2  # Promote to king

        # Switch players
        self.current_player = -self.current_player
        return True

    def evaluate_position(self, player):
        """Simple position evaluation"""
        score = 0

        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece != 0:
                    piece_value = 100 if abs(piece) == 1 else 150
                    if piece > 0:
                        score += piece_value
                        if player > 0:  # Bonus for advancement
                            score += row * 5
                    else:
                        score -= piece_value
                        if player < 0:  # Bonus for advancement
                            score += (7 - row) * 5

        return score if player > 0 else -score

    def is_game_over(self):
        """Check if game is over"""
        white_moves = len(self.get_valid_moves(1))
        black_moves = len(self.get_valid_moves(-1))

        white_pieces = sum(1 for row in self.board for piece in row if piece > 0)
        black_pieces = sum(1 for row in self.board for piece in row if piece < 0)

        if white_pieces == 0:
            return 'black_win'
        elif black_pieces == 0:
            return 'white_win'
        elif white_moves == 0:
            return 'black_win'
        elif black_moves == 0:
            return 'white_win'
        else:
            return None

class MinimaxPlayer:
    """Minimax player for generating training data"""

    def __init__(self, depth=4):
        self.depth = depth

    def get_move(self, board):
        """Get best move using minimax"""
        valid_moves = board.get_valid_moves(board.current_player)
        if not valid_moves:
            return None

        best_move = None
        best_score = float('-inf')

        for move in valid_moves:
            # Make temporary move
            board_copy = self.copy_board(board)
            board_copy.make_move(move)

            # Evaluate
            score = self.minimax(board_copy, self.depth - 1, float('-inf'), float('inf'), False, board.current_player)

            if score > best_score:
                best_score = score
                best_move = move

        return best_move

    def minimax(self, board, depth, alpha, beta, maximizing, original_player):
        """Minimax with alpha-beta pruning"""
        if depth == 0 or board.is_game_over():
            return board.evaluate_position(original_player)

        valid_moves = board.get_valid_moves(board.current_player)
        if not valid_moves:
            return board.evaluate_position(original_player)

        if maximizing:
            max_eval = float('-inf')
            for move in valid_moves:
                board_copy = self.copy_board(board)
                board_copy.make_move(move)
                eval_score = self.minimax(board_copy, depth - 1, alpha, beta, False, original_player)
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in valid_moves:
                board_copy = self.copy_board(board)
                board_copy.make_move(move)
                eval_score = self.minimax(board_copy, depth - 1, alpha, beta, True, original_player)
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval

    def copy_board(self, board):
        """Create a deep copy of the board"""
        new_board = ThaiCheckersBoard()
        new_board.board = [row[:] for row in board.board]
        new_board.current_player = board.current_player
        return new_board

def play_training_game(game_id, minimax_depths=[3, 4, 5]):
    """Play one training game and return positions"""
    print(f"🎮 Playing game {game_id}...")

    board = ThaiCheckersBoard()
    positions = []
    move_count = 0
    max_moves = 150  # Prevent infinite games

    # Randomize AI strength for variety
    white_depth = random.choice(minimax_depths)
    black_depth = random.choice(minimax_depths)

    white_player = MinimaxPlayer(white_depth)
    black_player = MinimaxPlayer(black_depth)

    while not board.is_game_over() and move_count < max_moves:
        current_player = white_player if board.current_player > 0 else black_player
        move = current_player.get_move(board)

        if not move:
            break

        # Record position before move
        position = {
            'gameId': game_id,
            'moveNumber': move_count,
            'boardState': [row[:] for row in board.board],
            'currentPlayer': board.current_player,
            'move': move,
            'value': board.evaluate_position(board.current_player) / 1000.0  # Normalize
        }
        positions.append(position)

        # Make move
        board.make_move(move)
        move_count += 1

    # Assign final game values
    game_result = board.is_game_over()
    final_value = 1.0 if game_result == 'white_win' else (-1.0 if game_result == 'black_win' else 0.0)

    # Backpropagate final result (simplified)
    for i, pos in enumerate(positions):
        # Decay final result based on distance from end
        decay_factor = 0.95 ** (len(positions) - i)
        player_multiplier = 1 if pos['currentPlayer'] > 0 else -1
        pos['value'] = final_value * player_multiplier * decay_factor

    print(f"✅ Game {game_id} complete: {len(positions)} positions")
    return positions

def generate_training_data(total_games=10000, num_workers=None):
    """Generate training data using multiple processes"""
    print(f"🚀 Generating {total_games} training games...")

    if num_workers is None:
        num_workers = min(mp.cpu_count(), 8)  # Don't overwhelm the system

    print(f"🔧 Using {num_workers} worker processes")

    start_time = time.time()
    all_positions = []

    # Process games in batches to manage memory
    batch_size = min(1000, total_games)
    num_batches = (total_games + batch_size - 1) // batch_size

    for batch_num in range(num_batches):
        batch_start = batch_num * batch_size
        batch_end = min(batch_start + batch_size, total_games)
        batch_games = batch_end - batch_start

        print(f"\n📦 Processing batch {batch_num + 1}/{num_batches} ({batch_games} games)")

        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            # Submit batch jobs
            futures = []
            for game_id in range(batch_start, batch_end):
                future = executor.submit(play_training_game, game_id)
                futures.append(future)

            # Collect results
            batch_positions = []
            for future in futures:
                try:
                    positions = future.result()
                    batch_positions.extend(positions)
                except Exception as e:
                    print(f"⚠️ Game failed: {e}")

        all_positions.extend(batch_positions)

        # Progress update
        elapsed = time.time() - start_time
        games_completed = batch_end
        rate = games_completed / elapsed
        eta = (total_games - games_completed) / rate if rate > 0 else 0

        print(f"📊 Progress: {games_completed}/{total_games} games ({rate:.1f} games/sec)")
        print(f"⏰ ETA: {eta/60:.1f} minutes, Total positions: {len(all_positions)}")

    total_time = time.time() - start_time

    print(f"\n✅ Data generation complete!")
    print(f"📊 Statistics:")
    print(f"   Games played: {total_games}")
    print(f"   Total positions: {len(all_positions)}")
    print(f"   Generation time: {total_time/60:.1f} minutes")
    print(f"   Average positions per game: {len(all_positions)/total_games:.1f}")

    return all_positions

def save_training_data(positions, filename='training_data.json'):
    """Save training data to JSON file"""
    print(f"💾 Saving training data to {filename}...")

    # Organize data
    training_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_positions': len(positions),
            'total_games': len(set(pos['gameId'] for pos in positions)),
            'format_version': '1.0'
        },
        'positions': positions,
        'games': list(set(pos['gameId'] for pos in positions))
    }

    # Save to file
    with open(filename, 'w') as f:
        json.dump(training_data, f, indent=2)

    file_size = os.path.getsize(filename) / (1024 * 1024)  # MB
    print(f"✅ Training data saved: {file_size:.1f} MB")

def main():
    """Main data generation function"""
    print("🎯 MacBook Training Data Generator")
    print("=================================")

    # Configuration
    config = {
        'total_games': 10000,
        'num_workers': min(mp.cpu_count(), 8),
        'output_file': 'training_data.json'
    }

    print(f"📋 Configuration:")
    for key, value in config.items():
        print(f"   {key}: {value}")

    # Generate data
    start_time = time.time()
    positions = generate_training_data(
        total_games=config['total_games'],
        num_workers=config['num_workers']
    )

    # Save data
    save_training_data(positions, config['output_file'])

    total_time = time.time() - start_time
    print(f"\n🎉 Complete! Total time: {total_time/60:.1f} minutes")

    print(f"\n🎯 Next steps:")
    print("1. Run: python src/training/train_macbook.py")
    print("2. Monitor training progress")
    print("3. Deploy trained model to app")

if __name__ == '__main__':
    main()