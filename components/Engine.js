/**
 * Engine.js - Stockfish and Heuristic Minimax Chess Engine Wrapper
 * Manages calculations in the background. If Stockfish (via CDN) fails to load,
 * the class transparently falls back to a custom local Minimax solver.
 */
class ChessEngine {
  constructor() {
    this.stockfishUrl = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
    this.isStockfishReady = false;
    this.pendingCallbacks = {};
    
    this.botWorker = null;
    this.evalWorker = null;
    this.hintWorker = null;
    
    this.fallbackEngine = new LocalMinimaxEngine();
    
    this.initStockfish();
  }

  async initStockfish() {
    try {
      // Fetch Stockfish script content and load as Blob URL to bypass same-origin Worker limits
      const response = await fetch(this.stockfishUrl);
      if (!response.ok) throw new Error('Stockfish fetch failed');
      const scriptCode = await response.text();
      
      // Inject locateFile configuration to force Emscripten to fetch the WASM binary from the CDN
      const locateFileSnippet = `self.Module = { locateFile: function(path) { if (path.endsWith('.wasm')) { return 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/' + path; } return path; } };\n`;
      const blob = new Blob([locateFileSnippet + scriptCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.botWorker = new Worker(workerUrl);
      this.evalWorker = new Worker(workerUrl);
      this.hintWorker = new Worker(workerUrl);
      
      this.botWorker.onmessage = (event) => this.handleWorkerMessage('bot', event.data);
      this.evalWorker.onmessage = (event) => this.handleWorkerMessage('eval', event.data);
      this.hintWorker.onmessage = (event) => this.handleWorkerMessage('hint', event.data);
      
      // Initialize UCI mode
      this.botWorker.postMessage('uci');
      
      this.evalWorker.postMessage('uci');
      this.evalWorker.postMessage('setoption name MultiPV value 3');
      
      this.hintWorker.postMessage('uci');
      
      this.isStockfishReady = true;
      console.log('Stockfish.js initialized successfully with three separate workers.');
    } catch (error) {
      console.warn('Could not initialize Stockfish Web Workers. Falling back to local Minimax engine.', error);
      this.isStockfishReady = false;
    }
  }

  handleWorkerMessage(workerType, line) {
    // console.log(`Stockfish [${workerType}]:`, line);
    
    // Parse MultiPV lines
    if (workerType === 'eval' && line.includes('info') && line.includes('multipv')) {
      const parts = line.split(' ');
      const mpvIndex = parts.indexOf('multipv');
      const scoreIndex = parts.indexOf('score');
      const pvIndex = parts.indexOf('pv');
      
      if (mpvIndex !== -1 && scoreIndex !== -1 && pvIndex !== -1) {
        const mpvNum = parseInt(parts[mpvIndex + 1], 10);
        const scoreType = parts[scoreIndex + 1];
        const scoreValue = parseInt(parts[scoreIndex + 2], 10);
        const pvMove = parts[pvIndex + 1];
        
        if (this.pendingCallbacks.multipv) {
          this.pendingCallbacks.multipv.onUpdate({
            multipv: mpvNum,
            scoreType,
            scoreValue,
            move: pvMove
          });
        }
      }
    }
    
    // Parse evaluation score
    if (workerType === 'eval' && line.includes('info') && line.includes('score')) {
      let scoreType = 'cp';
      let scoreValue = 0;
      
      const parts = line.split(' ');
      const scoreIndex = parts.indexOf('score');
      if (scoreIndex !== -1) {
        scoreType = parts[scoreIndex + 1]; // 'cp' or 'mate'
        scoreValue = parseInt(parts[scoreIndex + 2], 10);
      }
      
      // Check if there is an evaluation callback waiting
      if (this.pendingCallbacks.eval) {
        this.pendingCallbacks.eval.onUpdate({ type: scoreType, value: scoreValue });
      }
    }
    
    // Parse best move
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const move = parts[1];
      
      if (workerType === 'bot') {
        if (this.pendingCallbacks.botMove) {
          this.pendingCallbacks.botMove.resolve(move);
          delete this.pendingCallbacks.botMove;
        }
      } else if (workerType === 'hint') {
        if (this.pendingCallbacks.hintMove) {
          this.pendingCallbacks.hintMove.resolve(move);
          delete this.pendingCallbacks.hintMove;
        }
      } else if (workerType === 'eval') {
        if (this.pendingCallbacks.eval) {
          this.pendingCallbacks.eval.resolve();
          delete this.pendingCallbacks.eval;
        }
      }
    }
  }

  /**
   * Evaluates the current position.
   * @param {string} fen - FEN string of the position
   * @param {number} depth - Search depth
   * @returns {Promise<{scoreType: string, scoreValue: number}>}
   */
  evaluatePosition(fen, depth = 10) {
    if (!this.isStockfishReady) {
      // Fallback
      return Promise.resolve(this.fallbackEngine.evaluateFen(fen));
    }

    return new Promise((resolve) => {
      let latestScore = { type: 'cp', value: 0 };
      
      this.pendingCallbacks.eval = {
        onUpdate: (score) => {
          latestScore = score;
        },
        resolve: () => resolve(latestScore)
      };

      this.evalWorker.postMessage('stop');
      this.evalWorker.postMessage(`position fen ${fen}`);
      this.evalWorker.postMessage(`go depth ${depth}`);
    });
  }

  /**
   * Returns the best move for a given position and difficulty level.
   * Levels 1 to 5 correspond to different chess strengths (800 to 2200 ELO).
   * @param {string} fen - FEN string of the position
   * @param {number} level - Bot difficulty (1 to 5)
   * @param {boolean} isHint - Whether this is a visual engine hint or the actual bot moving
   * @returns {Promise<string>}
   */
  getBestMove(fen, level = 3, isHint = false) {
    // Determine depth and random play variance based on bot level
    const depthMap = { 1: 1, 2: 3, 3: 5, 4: 8, 5: 12 };
    const depth = depthMap[level] || 5;

    // Level 1-2 often play random moves if Stockfish isn't used
    if (!this.isStockfishReady) {
      const fallbackDepth = Math.min(depth, 3); // Cap depth at 3 to prevent browser freezing
      return Promise.resolve(this.fallbackEngine.getBestMove(fen, fallbackDepth, level));
    }

    return new Promise((resolve) => {
      // For level 1 (easy), sometimes play sub-optimal or random moves to feel human
      if (level === 1 && Math.random() < 0.35) {
        const game = new Chess(fen);
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
          const randMove = moves[Math.floor(Math.random() * moves.length)];
          resolve(randMove.from + randMove.to);
          return;
        }
      }

      // For level 2, occasionally make minor mistakes
      if (level === 2 && Math.random() < 0.2) {
        const game = new Chess(fen);
        const moves = game.moves({ verbose: true });
        if (moves.length > 0) {
          const randMove = moves[Math.floor(Math.random() * moves.length)];
          resolve(randMove.from + randMove.to);
          return;
        }
      }

      const worker = isHint ? this.hintWorker : this.botWorker;
      const callbackKey = isHint ? 'hintMove' : 'botMove';

      this.pendingCallbacks[callbackKey] = { resolve };
      
      worker.postMessage('stop');
      worker.postMessage(`position fen ${fen}`);
      
      // Stockfish skill level adjustment (UCI option)
      const skillLevel = (level - 1) * 5; // Level 1 -> Skill 0, Level 5 -> Skill 20
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      worker.postMessage(`go depth ${depth}`);
    });
  }

  terminate() {
    if (this.botWorker) this.botWorker.postMessage('stop');
    if (this.evalWorker) this.evalWorker.postMessage('stop');
    if (this.hintWorker) this.hintWorker.postMessage('stop');
    this.pendingCallbacks = {};
  }
}

/**
 * LocalMinimaxEngine
 * A fully self-contained chess solver using Minimax search and Alpha-Beta pruning.
 * Used as a zero-dependency fallback for offline play or CDN failure.
 */
class LocalMinimaxEngine {
  constructor() {
    // Piece-Square tables to guide positional play
    // Evaluates positional advantages for White (mirrored for Black)
    this.pst = {
      p: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
      ],
      n: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
      ],
      b: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
      ],
      r: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [0,  0,  0,  5,  5,  0,  0,  0]
      ],
      q: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-5,  0,  5,  5,  5,  5,  0, -5],
        [0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  5,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
      ],
      k: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [20, 20,  0,  0,  0,  0, 20, 20],
        [20, 30, 10,  0,  0, 10, 30, 20]
      ]
    };
  }

  evaluateFen(fen) {
    const game = new Chess(fen);
    const score = this.evaluateBoard(game);
    // Standardize to white perspective centipawns
    return { type: 'cp', value: score };
  }

  evaluateBoard(game) {
    let totalScore = 0;
    const board = game.board();

    const pieceValues = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000
    };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const type = piece.type;
          const color = piece.color;
          let val = pieceValues[type];

          // Positional bonus
          const pValue = this.pst[type];
          let bonus = 0;
          if (pValue) {
            // White values are parsed top-to-bottom, Black is mirrored vertically
            const rowIdx = color === 'w' ? (7 - r) : r;
            const colIdx = color === 'w' ? c : (7 - c);
            bonus = pValue[rowIdx][colIdx];
          }

          const scoreContribution = val + bonus;
          if (color === 'w') {
            totalScore += scoreContribution;
          } else {
            totalScore -= scoreContribution;
          }
        }
      }
    }

    return totalScore;
  }

  getBestMove(fen, depth = 3, level = 3) {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) return null;
    
    // Level 1-2 randomness fallback
    if (level === 1 && Math.random() < 0.4) {
      const randMove = moves[Math.floor(Math.random() * moves.length)];
      return randMove.from + randMove.to;
    }

    let bestMove = null;
    let bestValue = game.turn() === 'w' ? -Infinity : Infinity;

    // Simple sorting to optimize pruning (captures first)
    moves.sort((a, b) => {
      const scoreA = a.captured ? 10 : 0;
      const scoreB = b.captured ? 10 : 0;
      return scoreB - scoreA;
    });

    for (const move of moves) {
      game.move(move);
      const value = this.minimax(game, depth - 1, -Infinity, Infinity, game.turn() === 'w');
      game.undo();

      if (game.turn() === 'w') {
        if (value > bestValue) {
          bestValue = value;
          bestMove = move.from + move.to;
        }
      } else {
        if (value < bestValue) {
          bestValue = value;
          bestMove = move.from + move.to;
        }
      }
    }

    return bestMove;
  }

  minimax(game, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
      return this.evaluateBoard(game);
    }

    const moves = game.moves({ verbose: true });

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        game.move(move);
        const evaluation = this.minimax(game, depth - 1, alpha, beta, false);
        game.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Prune
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        game.move(move);
        const evaluation = this.minimax(game, depth - 1, alpha, beta, true);
        game.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Prune
      }
      return minEval;
    }
  }
}

// Export for browser
window.ChessEngine = ChessEngine;
