"""
SIMPLE & FAST - Training Data Generation
Lightweight Minimax for speed - generates data FAST
Quality: Good enough for initial training
"""

import tensorflow as tf
import numpy as np
import pickle
import json
import random
import time
import gc
from datetime import datetime

print("=" * 60)
print("🎮 Thai Checkers - FAST Training Data Generation")
print("Simple Minimax - Optimized for Speed")
print("=" * 60)

# ==================== GAME LOGIC ====================
class ThaiCheckersGame:
    def __init__(self):
        self.reset()

    def reset(self):
        self.board = np.zeros((8, 8), dtype=np.int8)

        # Player 1 pieces (bottom)
        positions_p1 = [(0,1), (0,3), (0,5), (0,7),
                        (1,0), (1,2), (1,4), (1,6)]
        for r, c in positions_p1:
            self.board[r, c] = 1

        # Player 2 pieces (top)
        positions_p2 = [(6,1), (6,3), (6,5), (6,7),
                        (7,0), (7,2), (7,4), (7,6)]
        for r, c in positions_p2:
            self.board[r, c] = -1

        self.current_player = 1
        self.move_count = 0

    def get_valid_moves(self):
        moves = []
        captures = []

        for r in range(8):
            for c in range(8):
                piece = self.board[r, c]
                if piece * self.current_player <= 0:
                    continue

                piece_moves, piece_captures = self._get_piece_moves(r, c, piece)
                moves.extend(piece_moves)
                captures.extend(piece_captures)

        if captures:
            return captures
        return moves

    def _get_piece_moves(self, r, c, piece):
        moves = []
        captures = []
        is_king = abs(piece) == 2

        if is_king:
            directions = [(1,1), (1,-1), (-1,1), (-1,-1)]
        else:
            if self.current_player == 1:
                directions = [(1,1), (1,-1)]
            else:
                directions = [(-1,1), (-1,-1)]

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < 8 and 0 <= nc < 8 and self.board[nr, nc] == 0:
                moves.append(((r, c), (nr, nc)))

            if 0 <= nr < 8 and 0 <= nc < 8:
                target = self.board[nr, nc]
                if target != 0 and target * self.current_player < 0:
                    jr, jc = nr + dr, nc + dc
                    if 0 <= jr < 8 and 0 <= jc < 8 and self.board[jr, jc] == 0:
                        captures.append(((r, c), (jr, jc)))

        return moves, captures

    def make_move(self, move):
        (fr, fc), (tr, tc) = move
        piece = self.board[fr, fc]

        self.board[tr, tc] = piece
        self.board[fr, fc] = 0

        if abs(tr - fr) > 1:
            mr, mc = (fr + tr) // 2, (fc + tc) // 2
            self.board[mr, mc] = 0

        if self.current_player == 1 and tr == 7 and piece == 1:
            self.board[tr, tc] = 2
        elif self.current_player == -1 and tr == 0 and piece == -1:
            self.board[tr, tc] = -2

        self.move_count += 1
        self.current_player *= -1

    def is_game_over(self):
        if not self.get_valid_moves():
            return True

        p1_pieces = np.sum(self.board > 0)
        p2_pieces = np.sum(self.board < 0)

        if p1_pieces == 0 or p2_pieces == 0:
            return True

        if self.move_count > 100:
            return True

        return False

    def get_winner(self):
        p1_pieces = np.sum(self.board > 0)
        p2_pieces = np.sum(self.board < 0)

        if p1_pieces == 0:
            return -1
        elif p2_pieces == 0:
            return 1
        elif not self.get_valid_moves():
            return -self.current_player
        else:
            return 0

    def copy(self):
        new_game = ThaiCheckersGame()
        new_game.board = self.board.copy()
        new_game.current_player = self.current_player
        new_game.move_count = self.move_count
        return new_game

# ==================== SIMPLE FAST MINIMAX ====================
class SimpleFastMinimax:
    """
    Lightweight Minimax - Optimized for SPEED
    Based on original engine but with improvements
    """

    def __init__(self, depth=4, player=1):
        self.max_depth = depth
        self.player = player
        self.nodes_evaluated = 0

    def evaluate_position(self, game):
        """Fast evaluation - similar to original engine"""
        score = 0

        for r in range(8):
            for c in range(8):
                piece = game.board[r, c]
                if piece == 0:
                    continue

                # Material value
                if abs(piece) == 1:  # Man
                    value = 100
                    # Advancement (quadratic like original)
                    if piece > 0:  # Player 1
                        value += (7 - r) * (7 - r) * 2
                    else:  # Player 2
                        value += r * r * 2
                else:  # King
                    value = 200
                    # Small edge penalty
                    if r == 0 or r == 7 or c == 0 or c == 7:
                        value -= 10

                # Center control
                center_dist = abs(r - 3.5) + abs(c - 3.5)
                value += (7 - center_dist) * 3

                if piece * self.player > 0:
                    score += value
                else:
                    score -= value

        # Small random for diversity
        score += (random.random() - 0.5) * 4
        return score

    def get_best_move(self, game):
        """Simple minimax with alpha-beta"""
        self.nodes_evaluated = 0

        moves = game.get_valid_moves()
        if not moves:
            return None
        if len(moves) == 1:
            return moves[0]

        best_move = moves[0]
        best_score = -float('inf')
        alpha = -float('inf')
        beta = float('inf')

        # Order captures first
        captures = [m for m in moves if abs(m[0][0] - m[1][0]) > 1]
        quiets = [m for m in moves if abs(m[0][0] - m[1][0]) <= 1]
        ordered_moves = captures + quiets

        for move in ordered_moves:
            game_copy = game.copy()
            game_copy.make_move(move)

            score = self.minimax(game_copy, self.max_depth - 1, alpha, beta, False)

            if score > best_score:
                best_score = score
                best_move = move

            alpha = max(alpha, best_score)
            if beta <= alpha:
                break

        return best_move

    def minimax(self, game, depth, alpha, beta, maximizing):
        """Fast minimax - no transposition table for speed"""
        self.nodes_evaluated += 1

        # Safety check: prevent infinite loops
        if self.nodes_evaluated > 100000:
            return self.evaluate_position(game)

        if depth == 0 or game.is_game_over():
            return self.evaluate_position(game)

        moves = game.get_valid_moves()
        if not moves:
            return -10000 if maximizing else 10000

        # Simple capture ordering
        captures = [m for m in moves if abs(m[0][0] - m[1][0]) > 1]
        quiets = [m for m in moves if abs(m[0][0] - m[1][0]) <= 1]
        ordered_moves = captures + quiets

        if maximizing:
            max_eval = -float('inf')
            for move in ordered_moves:
                game_copy = game.copy()
                game_copy.make_move(move)
                eval_score = self.minimax(game_copy, depth - 1, alpha, beta, False)
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in ordered_moves:
                game_copy = game.copy()
                game_copy.make_move(move)
                eval_score = self.minimax(game_copy, depth - 1, alpha, beta, True)
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval

# ==================== DATA PROCESSING ====================
def board_to_tensor(board, current_player):
    tensor = np.zeros((8, 8, 6), dtype=np.float32)

    for r in range(8):
        for c in range(8):
            piece = board[r, c]
            if piece == 0:
                continue

            if current_player == 1:
                if piece == 1:
                    tensor[r, c, 0] = 1
                elif piece == 2:
                    tensor[r, c, 1] = 1
                elif piece == -1:
                    tensor[r, c, 2] = 1
                elif piece == -2:
                    tensor[r, c, 3] = 1
            else:
                if piece == -1:
                    tensor[r, c, 0] = 1
                elif piece == -2:
                    tensor[r, c, 1] = 1
                elif piece == 1:
                    tensor[r, c, 2] = 1
                elif piece == 2:
                    tensor[r, c, 3] = 1

    tensor[:, :, 5] = 1 if current_player == 1 else 0
    return tensor

def move_to_policy(move):
    policy = np.zeros(4096, dtype=np.float32)
    (fr, fc), (tr, tc) = move
    from_idx = fr * 8 + fc
    to_idx = tr * 8 + tc
    move_idx = from_idx * 64 + to_idx
    policy[move_idx] = 1.0
    return policy

# ==================== BATCH GENERATION ====================
def generate_single_batch(batch_num, games_per_batch=2000):
    """Generate one batch - FAST version"""

    print(f"\n🎲 Generating Batch {batch_num+1}")
    print(f"   Target: {games_per_batch} games")

    X_batch = []
    y_policy_batch = []
    y_value_batch = []

    start_time = time.time()

    for game_num in range(games_per_batch):
        if (game_num + 1) % 100 == 0:  # More frequent updates
            elapsed = time.time() - start_time
            rate = (game_num + 1) / elapsed
            print(f"   Progress: {game_num + 1}/{games_per_batch} games ({elapsed:.1f}s, {rate:.1f} games/s)")

        # Debug first game
        if game_num == 0:
            print("   Starting first game...")

        game = ThaiCheckersGame()
        game_positions = []

        # Use simple fast AI - depth 2 (very fast!)
        ai1 = SimpleFastMinimax(depth=2, player=1)
        ai2 = SimpleFastMinimax(depth=2, player=-1)

        # Random opening
        if random.random() < 0.3:
            moves = game.get_valid_moves()
            if moves:
                game.make_move(random.choice(moves))

        # Play game with safety checks
        stuck_count = 0
        last_board_hash = None

        while not game.is_game_over() and game.move_count < 60:
            state = game.board.copy()
            valid_moves = game.get_valid_moves()

            if not valid_moves:
                break

            # Get AI move with timeout detection
            if game.current_player == 1:
                move = ai1.get_best_move(game)
            else:
                move = ai2.get_best_move(game)

            if not move:
                break

            # Check if stuck in same position
            board_hash = hash(game.board.tobytes())
            if board_hash == last_board_hash:
                stuck_count += 1
                if stuck_count > 3:
                    break
            else:
                stuck_count = 0
            last_board_hash = board_hash

            game_positions.append({
                'board': state,
                'player': game.current_player,
                'move': move
            })
            game.make_move(move)

        winner = game.get_winner()

        # Debug every 10 games at start
        if game_num < 10:
            print(f"   Game {game_num+1} complete: {len(game_positions)} positions, winner={winner}")
        elif game_num == 10:
            print(f"   Games 1-10 complete! Continuing...")

        # Sample positions
        if len(game_positions) > 15:
            game_positions = random.sample(game_positions, 15)

        for pos in game_positions:
            X_batch.append(board_to_tensor(pos['board'], pos['player']))
            y_policy_batch.append(move_to_policy(pos['move']))

            if winner == 0:
                value = 0
            elif winner == pos['player']:
                value = 1
            else:
                value = -1
            y_value_batch.append(value)

    # Save batch
    batch_data = {
        'X': np.array(X_batch),
        'y_policy': np.array(y_policy_batch),
        'y_value': np.array(y_value_batch),
        'games': games_per_batch,
        'positions': len(X_batch)
    }

    filename = f'/content/thai_batch_{batch_num:03d}.pkl'

    with open(filename, 'wb') as f:
        pickle.dump(batch_data, f)

    batch_time = time.time() - start_time
    rate = games_per_batch / batch_time
    print(f"   ✅ Batch {batch_num+1} complete!")
    print(f"   📁 Saved: {filename}")
    print(f"   📊 Positions: {len(X_batch)}")
    print(f"   ⏱️ Time: {batch_time:.1f}s ({rate:.1f} games/s)")

    del X_batch, y_policy_batch, y_value_batch, batch_data
    gc.collect()

    return filename

# ==================== MAIN EXECUTION ====================
def main():
    print("\n🚀 Starting FAST Batch Generation")
    print("=" * 60)

    # Configuration - FAST generation with depth 2
    NUM_BATCHES = 5
    GAMES_PER_BATCH = 2000
    # Total: 10,000 games (depth 2 = very fast!)

    print(f"📋 Configuration:")
    print(f"   Total batches: {NUM_BATCHES}")
    print(f"   Games per batch: {GAMES_PER_BATCH}")
    print(f"   Total games: {NUM_BATCHES * GAMES_PER_BATCH}")
    print(f"   AI: SimpleFastMinimax (depth 2)")
    print(f"   Evaluation: Lightweight (material + advancement + center)")
    print(f"   Features: Alpha-Beta pruning only (no transposition)")
    print(f"   Target: 200-500 games/second")
    print(f"   ETA: ~5-10 minutes for 10,000 games")

    batch_files = []
    total_start = time.time()

    for batch_num in range(NUM_BATCHES):
        filename = generate_single_batch(batch_num, GAMES_PER_BATCH)
        batch_files.append(filename)

        completed = batch_num + 1
        remaining = NUM_BATCHES - completed
        elapsed_total = time.time() - total_start

        print(f"\n📈 Progress: {completed}/{NUM_BATCHES} batches complete")
        if remaining > 0:
            eta = (elapsed_total / completed) * remaining
            print(f"   ⏰ ETA: {eta/60:.1f} minutes remaining")

    # Save batch info
    batch_info = {
        'files': batch_files,
        'total_batches': NUM_BATCHES,
        'games_per_batch': GAMES_PER_BATCH,
        'total_games': NUM_BATCHES * GAMES_PER_BATCH,
        'ai_type': 'SimpleFastMinimax',
        'ai_depth': 2,
        'ai_features': ['Alpha-Beta Pruning', 'Capture Ordering'],
        'created_at': datetime.now().isoformat(),
        'generation_time_seconds': time.time() - total_start
    }

    with open('/content/thai_batches_info.json', 'w') as f:
        json.dump(batch_info, f, indent=2)

    total_time = time.time() - total_start
    rate = (NUM_BATCHES * GAMES_PER_BATCH) / total_time

    print("\n" + "=" * 60)
    print("🎉 FAST GENERATION COMPLETE!")
    print("=" * 60)
    print(f"✅ Generated {NUM_BATCHES} batch files")
    print(f"📊 Total games: {NUM_BATCHES * GAMES_PER_BATCH}")
    print(f"⏱️ Total time: {total_time/60:.1f} minutes")
    print(f"⚡ Speed: {rate:.1f} games/second")
    print(f"🧠 AI: Simple but effective (good for initial training)")
    print(f"📁 Files created:")
    for i, file in enumerate(batch_files):
        print(f"   {i+1}. {file}")
    print(f"   {NUM_BATCHES+1}. thai_batches_info.json")
    print("\n📥 Download all files from Files panel!")
    print("🎯 Ready for training!")
    print("=" * 60)

# ==================== AUTO-RUN ====================
if __name__ == "__main__":
    print("🔍 GPU check (not needed for data generation)...")
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✅ GPU available: {gpus[0]}")
    else:
        print("⚠️  No GPU (OK - we only need CPU for Minimax)")

    main()