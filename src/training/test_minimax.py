"""Quick test to see if SimpleFastMinimax works"""

import numpy as np
import time

class ThaiCheckersGame:
    def __init__(self):
        self.reset()

    def reset(self):
        self.board = np.zeros((8, 8), dtype=np.int8)
        positions_p1 = [(0,1), (0,3), (0,5), (0,7), (1,0), (1,2), (1,4), (1,6)]
        for r, c in positions_p1:
            self.board[r, c] = 1
        positions_p2 = [(6,1), (6,3), (6,5), (6,7), (7,0), (7,2), (7,4), (7,6)]
        for r, c in positions_p2:
            self.board[r, c] = -1
        self.current_player = 1
        self.move_count = 0

    def get_valid_moves(self):
        moves = []
        for r in range(8):
            for c in range(8):
                piece = self.board[r, c]
                if piece * self.current_player > 0:
                    # Simple man moves
                    if self.current_player == 1:
                        directions = [(1,1), (1,-1)]
                    else:
                        directions = [(-1,1), (-1,-1)]

                    for dr, dc in directions:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < 8 and 0 <= nc < 8 and self.board[nr, nc] == 0:
                            moves.append(((r, c), (nr, nc)))
        return moves

    def make_move(self, move):
        (fr, fc), (tr, tc) = move
        piece = self.board[fr, fc]
        self.board[tr, tc] = piece
        self.board[fr, fc] = 0
        self.current_player *= -1
        self.move_count += 1

    def is_game_over(self):
        return len(self.get_valid_moves()) == 0 or self.move_count > 20

    def copy(self):
        new_game = ThaiCheckersGame()
        new_game.board = self.board.copy()
        new_game.current_player = self.current_player
        new_game.move_count = self.move_count
        return new_game

class SimpleMinimax:
    def __init__(self, depth=2):
        self.max_depth = depth
        self.nodes = 0

    def evaluate(self, game):
        score = 0
        for r in range(8):
            for c in range(8):
                if game.board[r, c] == 1:
                    score += 100
                elif game.board[r, c] == -1:
                    score -= 100
        return score

    def minimax(self, game, depth, alpha, beta, maximizing):
        self.nodes += 1
        if depth == 0 or game.is_game_over():
            return self.evaluate(game)

        moves = game.get_valid_moves()
        if not moves:
            return -10000 if maximizing else 10000

        if maximizing:
            max_eval = -float('inf')
            for move in moves:
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
            for move in moves:
                game_copy = game.copy()
                game_copy.make_move(move)
                eval_score = self.minimax(game_copy, depth - 1, alpha, beta, True)
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval

    def get_best_move(self, game):
        moves = game.get_valid_moves()
        if not moves:
            return None

        best_move = moves[0]
        best_score = -float('inf')
        alpha = -float('inf')
        beta = float('inf')

        for move in moves:
            game_copy = game.copy()
            game_copy.make_move(move)
            score = self.minimax(game_copy, self.max_depth - 1, alpha, beta, False)
            if score > best_score:
                best_score = score
                best_move = move
            alpha = max(alpha, best_score)

        return best_move

# Test
print("Testing SimpleMinimax...")
print("-" * 50)

game = ThaiCheckersGame()
ai = SimpleMinimax(depth=3)

print(f"Initial board:")
print(game.board)
print(f"Current player: {game.current_player}")

start = time.time()
move = ai.get_best_move(game)
elapsed = time.time() - start

print(f"\nAI chose move: {move}")
print(f"Time: {elapsed:.3f}s")
print(f"Nodes evaluated: {ai.nodes}")

if move:
    game.make_move(move)
    print(f"\nAfter move:")
    print(game.board)
    print(f"Current player: {game.current_player}")
    print("\n✅ Test PASSED - AI is working!")
else:
    print("\n❌ Test FAILED - No move returned")