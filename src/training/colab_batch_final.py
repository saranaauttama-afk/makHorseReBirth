"""
FINAL COLAB SCRIPT - Generate Training Data in Batches
Copy and paste this entire script into Colab
Uses advanced MinimaxAI with Quiescence Search
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
print("🎮 Thai Checkers - Batch Training Data Generation")
print("Advanced MinimaxAI with Quiescence Search")
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
        """Create deep copy of game state"""
        new_game = ThaiCheckersGame()
        new_game.board = self.board.copy()
        new_game.current_player = self.current_player
        new_game.move_count = self.move_count
        return new_game

# ==================== EVALUATION FUNCTION ====================
class EvaluationFunction:
    """Advanced evaluation function matching the JS version"""

    WEIGHTS = {
        'PIECE_VALUE': 100,
        'KING_VALUE': 300,
        'CENTER_CONTROL': 5,
        'MOBILITY': 15,
        'BACK_ROW_BONUS': 10,
        'ATTACK_THREAT': 25,
        'ENDGAME_BONUS': 50,
        'CORNER_PENALTY': -15,
        'EDGE_PENALTY': -8,
        'ADVANCEMENT': 12,
        'KING_CENTRALIZATION': 20,
        'PIECE_UNDER_ATTACK': -80,
        'TEMPO': 3
    }

    @staticmethod
    def evaluate(game, player):
        """Evaluate position from player's perspective"""
        if game.is_game_over():
            winner = game.get_winner()
            if winner == player:
                return 5000
            elif winner != 0:
                return -5000
            return 0

        score = 0
        score += EvaluationFunction.evaluate_material(game, player)
        score += EvaluationFunction.evaluate_position(game, player)
        score += EvaluationFunction.evaluate_advancement(game, player)
        score += EvaluationFunction.evaluate_king_position(game, player)

        # Lightweight threat detection (only check if pieces under immediate attack)
        original_player = game.current_player
        game.current_player = -player
        opp_captures = [m for m in game.get_valid_moves() if abs(m[0][0] - m[1][0]) > 1]
        for move in opp_captures:
            (fr, fc), (tr, tc) = move
            mr, mc = (fr + tr) // 2, (fc + tc) // 2
            captured_piece = game.board[mr, mc]
            if captured_piece * player > 0:
                score += EvaluationFunction.WEIGHTS['PIECE_UNDER_ATTACK']
        game.current_player = original_player

        score += EvaluationFunction.evaluate_endgame(game, player)

        # Small random factor for diversity and tie-breaking
        score += (random.random() - 0.5) * 4

        return score

    @staticmethod
    def evaluate_material(game, player):
        score = 0
        for r in range(8):
            for c in range(8):
                piece = game.board[r, c]
                if piece == 0:
                    continue

                value = EvaluationFunction.WEIGHTS['KING_VALUE'] if abs(piece) == 2 else EvaluationFunction.WEIGHTS['PIECE_VALUE']

                if piece * player > 0:
                    score += value
                else:
                    score -= value

        return score

    @staticmethod
    def evaluate_position(game, player):
        score = 0
        for r in range(8):
            for c in range(8):
                piece = game.board[r, c]
                if piece == 0 or piece * player <= 0:
                    continue

                if abs(piece) == 1:  # Man
                    center_distance = abs(r - 3.5) + abs(c - 3.5)
                    score += (7 - center_distance) * EvaluationFunction.WEIGHTS['CENTER_CONTROL']

                    score += EvaluationFunction.get_edge_penalty(r, c)

                    if (player == 1 and r == 0) or (player == -1 and r == 7):
                        score += EvaluationFunction.WEIGHTS['BACK_ROW_BONUS']

        return score

    @staticmethod
    def get_edge_penalty(r, c):
        penalty = 0
        if r == 0 or r == 7:
            penalty += EvaluationFunction.WEIGHTS['EDGE_PENALTY']
        if c == 0 or c == 7:
            penalty += EvaluationFunction.WEIGHTS['EDGE_PENALTY']
        if (r == 0 or r == 7) and (c == 0 or c == 7):
            penalty += EvaluationFunction.WEIGHTS['CORNER_PENALTY']
        return penalty

    @staticmethod
    def evaluate_mobility(game, player):
        original_player = game.current_player

        game.current_player = player
        my_moves = len(game.get_valid_moves())

        game.current_player = -player
        opp_moves = len(game.get_valid_moves())

        game.current_player = original_player

        return (my_moves - opp_moves) * EvaluationFunction.WEIGHTS['MOBILITY']

    @staticmethod
    def evaluate_threats(game, player):
        score = 0
        original_player = game.current_player

        game.current_player = player
        my_moves = game.get_valid_moves()
        my_captures = [m for m in my_moves if abs(m[0][0] - m[1][0]) > 1]
        score += len(my_captures) * EvaluationFunction.WEIGHTS['ATTACK_THREAT']

        game.current_player = -player
        opp_captures = [m for m in game.get_valid_moves() if abs(m[0][0] - m[1][0]) > 1]

        for move in opp_captures:
            (fr, fc), (tr, tc) = move
            mr, mc = (fr + tr) // 2, (fc + tc) // 2
            captured_piece = game.board[mr, mc]

            if captured_piece * player > 0:
                score += EvaluationFunction.WEIGHTS['PIECE_UNDER_ATTACK']
                if abs(captured_piece) == 2:
                    score += EvaluationFunction.WEIGHTS['PIECE_UNDER_ATTACK']

        game.current_player = original_player
        return score

    @staticmethod
    def evaluate_endgame(game, player):
        total_pieces = np.sum(game.board != 0)
        if total_pieces > 4:
            return 0

        my_pieces = np.sum(game.board * player > 0)
        opp_pieces = np.sum(game.board * player < 0)

        if my_pieces > opp_pieces:
            score = EvaluationFunction.WEIGHTS['ENDGAME_BONUS'] * (my_pieces - opp_pieces)

            my_positions = [(r, c) for r in range(8) for c in range(8) if game.board[r, c] * player > 0]
            opp_positions = [(r, c) for r in range(8) for c in range(8) if game.board[r, c] * player < 0]

            for my_r, my_c in my_positions:
                for opp_r, opp_c in opp_positions:
                    distance = abs(my_r - opp_r) + abs(my_c - opp_c)
                    score -= distance * 1.5

            return score

        return 0

    @staticmethod
    def evaluate_advancement(game, player):
        score = 0
        for r in range(8):
            for c in range(8):
                piece = game.board[r, c]
                if piece == 0 or abs(piece) == 2:
                    continue

                if piece * player > 0:
                    if player == 1:
                        score += (7 - r) * EvaluationFunction.WEIGHTS['ADVANCEMENT']
                    else:
                        score += r * EvaluationFunction.WEIGHTS['ADVANCEMENT']

        return score

    @staticmethod
    def evaluate_king_position(game, player):
        score = 0
        total_pieces = np.sum(game.board != 0)

        for r in range(8):
            for c in range(8):
                piece = game.board[r, c]
                if abs(piece) == 2 and piece * player > 0:
                    if total_pieces <= 6:
                        center_distance = abs(r - 3.5) + abs(c - 3.5)
                        score += (7 - center_distance) * EvaluationFunction.WEIGHTS['KING_CENTRALIZATION']

                    score += EvaluationFunction.get_edge_penalty(r, c)

        return score

    @staticmethod
    def evaluate_tempo(game, player):
        if game.current_player == player:
            return EvaluationFunction.WEIGHTS['TEMPO']
        return 0

# ==================== ADVANCED MINIMAX AI ====================
class MinimaxAIQuiescence:
    """
    Advanced Minimax AI with Quiescence Search
    Matches the JavaScript MinimaxAIQuiescence implementation
    """

    def __init__(self, depth=4, player=1):
        self.max_depth = depth
        self.player = player
        self.opponent = -player
        self.nodes_evaluated = 0
        self.transposition_table = {}
        self.move_ordering = True
        self.max_quiescence_depth = 4
        self.FORCED_CAPTURE_BONUS = 90
        self.RECAPTURE_BONUS = 45

    def reset_search_state(self):
        self.nodes_evaluated = 0
        self.transposition_table.clear()

    def get_best_move(self, game):
        """Get best move using minimax with alpha-beta pruning"""
        self.reset_search_state()

        moves = game.get_valid_moves()
        if not moves:
            return None
        if len(moves) == 1:
            return moves[0]

        best_move = moves[0]
        best_score = -float('inf')
        alpha = -float('inf')
        beta = float('inf')

        ordered_moves = self.order_moves(moves, game)

        for move in ordered_moves:
            game_copy = game.copy()
            game_copy.make_move(move)

            extension = self.get_search_extension(move, game_copy)
            score = self.minimax(
                game_copy,
                max(0, self.max_depth - 1 + extension),
                alpha,
                beta,
                False
            )

            if score > best_score:
                best_score = score
                best_move = move

            alpha = max(alpha, best_score)

        return best_move

    def minimax(self, game, depth, alpha, beta, maximizing_player):
        """Minimax with alpha-beta pruning and transposition table"""
        self.nodes_evaluated += 1

        if game.is_game_over():
            return EvaluationFunction.evaluate(game, self.player)

        board_key = self.get_board_key(game, depth, maximizing_player)
        cached = self.transposition_table.get(board_key)

        if cached and cached['depth'] >= depth:
            if cached['type'] == 'exact':
                return cached['score']
            if cached['type'] == 'lower' and cached['score'] >= beta:
                return cached['score']
            if cached['type'] == 'upper' and cached['score'] <= alpha:
                return cached['score']

        if depth == 0:
            score = self.quiescence_search(game, alpha, beta, maximizing_player, 0)
            self.transposition_table[board_key] = {'score': score, 'depth': depth, 'type': 'exact'}
            return score

        current_player = self.player if maximizing_player else self.opponent
        game.current_player = current_player
        moves = game.get_valid_moves()

        if not moves:
            score = -10000 if maximizing_player else 10000
            self.transposition_table[board_key] = {'score': score, 'depth': depth, 'type': 'exact'}
            return score

        ordered_moves = self.order_moves(moves, game) if self.move_ordering else moves
        best_score = -float('inf') if maximizing_player else float('inf')

        for move in ordered_moves:
            game_copy = game.copy()
            game_copy.make_move(move)

            extension = self.get_search_extension(move, game_copy)
            score = self.minimax(
                game_copy,
                max(0, depth - 1 + extension),
                alpha,
                beta,
                not maximizing_player
            )

            if maximizing_player:
                best_score = max(best_score, score)
                alpha = max(alpha, score)
            else:
                best_score = min(best_score, score)
                beta = min(beta, score)

            if beta <= alpha:
                break

        tt_type = 'exact'
        if best_score <= alpha:
            tt_type = 'upper'
        elif best_score >= beta:
            tt_type = 'lower'

        self.transposition_table[board_key] = {'score': best_score, 'depth': depth, 'type': tt_type}
        return best_score

    def quiescence_search(self, game, alpha, beta, maximizing_player, q_depth):
        """Search capture sequences until position is quiet"""
        self.nodes_evaluated += 1

        if q_depth >= self.max_quiescence_depth:
            return EvaluationFunction.evaluate(game, self.player)

        stand_pat = EvaluationFunction.evaluate(game, self.player)

        if maximizing_player:
            if stand_pat >= beta:
                return beta
            alpha = max(alpha, stand_pat)
        else:
            if stand_pat <= alpha:
                return alpha
            beta = min(beta, stand_pat)

        current_player = self.player if maximizing_player else self.opponent
        game.current_player = current_player
        capture_moves = self.filter_capture_moves(game.get_valid_moves())

        if not capture_moves:
            return stand_pat

        ordered_captures = self.order_captures_by_value(capture_moves, game)

        if maximizing_player:
            max_eval = stand_pat

            for move in ordered_captures:
                owned_gain = self.get_captured_piece_value(move, game)

                if stand_pat + owned_gain + 100 < alpha:
                    continue

                game_copy = game.copy()
                game_copy.make_move(move)

                eval_score = self.quiescence_search(game_copy, alpha, beta, False, q_depth + 1)
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)

                if alpha >= beta:
                    break

            return max_eval
        else:
            min_eval = stand_pat

            for move in ordered_captures:
                owned_gain = self.get_captured_piece_value(move, game)

                if stand_pat - owned_gain - 100 > beta:
                    continue

                game_copy = game.copy()
                game_copy.make_move(move)

                eval_score = self.quiescence_search(game_copy, alpha, beta, True, q_depth + 1)
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)

                if alpha >= beta:
                    break

            return min_eval

    def order_moves(self, moves, game):
        """Order moves with captures first"""
        captures = []
        quiet_moves = []

        for move in moves:
            (fr, fc), (tr, tc) = move
            if abs(tr - fr) > 1 or abs(tc - fc) > 1:
                captures.append(move)
            else:
                quiet_moves.append(move)

        ordered_captures = self.order_captures_by_value(captures, game)
        ordered_quiet = self.order_quiet_moves(quiet_moves, game)

        return ordered_captures + ordered_quiet

    def order_quiet_moves(self, moves, game):
        """Order quiet moves by positional score"""
        scored_moves = []

        for move in moves:
            (fr, fc), (tr, tc) = move
            score = 0

            center_distance = abs(tr - 3.5) + abs(tc - 3.5)
            score += (7 - center_distance) * 8

            piece = game.board[fr, fc]
            if piece > 0:
                score += (fr - tr) * 16
            else:
                score += (tr - fr) * 16

            if abs(piece) == 2:
                score += 25

            scored_moves.append((move, score))

        scored_moves.sort(key=lambda x: x[1], reverse=True)
        return [move for move, _ in scored_moves]

    def filter_capture_moves(self, moves):
        """Filter only capture moves"""
        return [m for m in moves if abs(m[0][0] - m[1][0]) > 1 or abs(m[0][1] - m[1][1]) > 1]

    def order_captures_by_value(self, moves, game):
        """Order captures by captured piece value"""
        scored_moves = []

        for move in moves:
            value = self.get_captured_piece_value(move, game)
            scored_moves.append((move, value))

        scored_moves.sort(key=lambda x: x[1], reverse=True)
        return [move for move, _ in scored_moves]

    def get_captured_piece_value(self, move, game):
        """Get value of captured piece"""
        (fr, fc), (tr, tc) = move

        if abs(tr - fr) <= 1 and abs(tc - fc) <= 1:
            return 0

        mr, mc = (fr + tr) // 2, (fc + tc) // 2
        captured_piece = game.board[mr, mc]

        if captured_piece == 0:
            return 0

        return 300 if abs(captured_piece) == 2 else 100

    def get_search_extension(self, move, child_game):
        """Determine if search should be extended"""
        if abs(move[0][0] - move[1][0]) > 1:
            return 1

        opp_moves = child_game.get_valid_moves()
        if len(opp_moves) <= 1:
            return 1

        forced_captures = all(abs(m[0][0] - m[1][0]) > 1 for m in opp_moves)
        if not forced_captures:
            return 0

        for opp_move in opp_moves:
            if self.count_recaptures(child_game, opp_move) > 0:
                return 1

        return 0

    def count_recaptures(self, parent_game, opponent_move):
        """Count possible recaptures"""
        game_copy = parent_game.copy()
        game_copy.make_move(opponent_move)

        our_moves = game_copy.get_valid_moves()
        count = 0

        for move in our_moves:
            if self.move_captures_square(move, opponent_move[1][0], opponent_move[1][1]):
                count += 1

        return count

    def move_captures_square(self, move, target_row, target_col):
        """Check if move captures target square"""
        (fr, fc), (tr, tc) = move

        if abs(tr - fr) <= 1:
            return False

        mr, mc = (fr + tr) // 2, (fc + tc) // 2
        return mr == target_row and mc == target_col

    def get_board_key(self, game, depth, maximizing_player):
        """Generate key for transposition table"""
        player_to_move = self.player if maximizing_player else self.opponent
        return (game.board.tobytes(), player_to_move, depth, maximizing_player)

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
    """Generate one batch of games and save immediately"""

    print(f"\n🎲 Generating Batch {batch_num+1}")
    print(f"   Target: {games_per_batch} games")

    X_batch = []
    y_policy_batch = []
    y_value_batch = []

    start_time = time.time()

    for game_num in range(games_per_batch):
        if (game_num + 1) % 250 == 0:
            elapsed = time.time() - start_time
            print(f"   Progress: {game_num + 1}/{games_per_batch} games ({elapsed:.1f}s)")

        # Create game with diverse AI depths
        game = ThaiCheckersGame()
        game_positions = []

        # Use depth 4 with lightweight evaluation (balanced speed/quality)
        depth1 = 4
        depth2 = 4
        ai1 = MinimaxAIQuiescence(depth=depth1, player=1)
        ai2 = MinimaxAIQuiescence(depth=depth2, player=-1)

        # Random opening variation
        if random.random() < 0.3:
            moves = game.get_valid_moves()
            if moves:
                game.make_move(random.choice(moves))

        # Play game (limit 60 moves to prevent very long games)
        while not game.is_game_over() and game.move_count < 60:
            state = game.board.copy()
            valid_moves = game.get_valid_moves()

            if not valid_moves:
                break

            # Get AI move
            if game.current_player == 1:
                move = ai1.get_best_move(game)
            else:
                move = ai2.get_best_move(game)

            if move:
                game_positions.append({
                    'board': state,
                    'player': game.current_player,
                    'move': move
                })
                game.make_move(move)

        # Process game outcome
        winner = game.get_winner()

        # Sample positions (max 15 per game)
        if len(game_positions) > 15:
            game_positions = random.sample(game_positions, 15)

        for pos in game_positions:
            X_batch.append(board_to_tensor(pos['board'], pos['player']))
            y_policy_batch.append(move_to_policy(pos['move']))

            # Value based on outcome
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
    print(f"   ✅ Batch {batch_num+1} complete!")
    print(f"   📁 Saved: {filename}")
    print(f"   📊 Positions: {len(X_batch)}")
    print(f"   ⏱️ Time: {batch_time:.1f}s")

    del X_batch, y_policy_batch, y_value_batch, batch_data
    gc.collect()

    return filename

# ==================== MAIN EXECUTION ====================
def main():
    """Main batch generation pipeline"""

    print("\n🚀 Starting Batch Generation Pipeline")
    print("=" * 60)

    # Configuration
    NUM_BATCHES = 3         # 3 batches
    GAMES_PER_BATCH = 1500  # 1500 games per batch
    # Total: 4,500 games (depth 3 = fast, quality data with quiescence)

    print(f"📋 Configuration:")
    print(f"   Total batches: {NUM_BATCHES}")
    print(f"   Games per batch: {GAMES_PER_BATCH}")
    print(f"   Total games: {NUM_BATCHES * GAMES_PER_BATCH}")
    print(f"   AI: MinimaxAIQuiescence (depth 4)")
    print(f"   Evaluation: Lightweight (material, position, threats, advancement)")
    print(f"   Features: Quiescence Search, Alpha-Beta, Transposition Table")
    print(f"   Note: Depth 4 + Quiescence ≈ Depth 6-8 effective")
    print(f"   Balance: Speed vs Quality")

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
        'ai_type': 'MinimaxAIQuiescence',
        'ai_features': ['Quiescence Search', 'Alpha-Beta Pruning', 'Transposition Table', 'Move Ordering'],
        'created_at': datetime.now().isoformat(),
        'generation_time_seconds': time.time() - total_start
    }

    with open('/content/thai_batches_info.json', 'w') as f:
        json.dump(batch_info, f, indent=2)

    total_time = time.time() - total_start
    print("\n" + "=" * 60)
    print("🎉 BATCH GENERATION COMPLETE!")
    print("=" * 60)
    print(f"✅ Generated {NUM_BATCHES} batch files")
    print(f"📊 Total games: {NUM_BATCHES * GAMES_PER_BATCH}")
    print(f"⏱️ Total time: {total_time/60:.1f} minutes")
    print(f"🧠 AI: Advanced MinimaxAI with Quiescence Search")
    print(f"📁 Files created:")
    for i, file in enumerate(batch_files):
        print(f"   {i+1}. {file}")
    print(f"   {NUM_BATCHES+1}. thai_batches_info.json")
    print("\n📥 Download all files from Files panel!")
    print("=" * 60)

# ==================== AUTO-RUN ====================
if __name__ == "__main__":
    print("🔍 Checking GPU availability...")
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✅ GPU available: {gpus[0]}")
    else:
        print("⚠️  No GPU found - will use CPU")

    main()