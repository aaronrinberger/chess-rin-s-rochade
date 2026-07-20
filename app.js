/**
 * app.js - Chess Workspace Application Controller
 * Manages the state, view routing, visual aids, user interactions,
 * and coordinates components (Chessboard, Engine, AudioSynth).
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Utilities and Components
  const audio = new AudioSynth();
  const engine = new ChessEngine();
  
  // App state
  let activeView = 'play';
  let activeGame = new Chess();
  let activeBoard = null;
  let moveHistory = []; // array of { w: string, b: string, wBadge?: string, bBadge?: string }
  let activeEvaluation = 50; // White percentage (0 to 100)

  // Promotion handling state
  let pendingPromoMove = null; // { from, to, callback }
  let botMoveTimeout = null; // Timeout reference for delayed computer moves

  // Initialize Lucide Icons
  lucide.createIcons();

  // Navigation Routing
  const navItems = document.querySelectorAll('.nav-menu .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // Board Theme Selector
  const themeSelect = document.getElementById('board-theme-select');
  if (themeSelect) {
    const savedTheme = localStorage.getItem('chess_board_theme') || 'classic';
    themeSelect.value = savedTheme;
    
    themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      localStorage.setItem('chess_board_theme', theme);
      // Apply theme-walnut class to all containers on the page
      document.querySelectorAll('.chessboard-container').forEach(el => {
        if (theme === 'walnut') {
          el.classList.add('theme-walnut');
        } else {
          el.classList.remove('theme-walnut');
        }
      });
    });
  }

  // Mute / Unmute Button
  const muteBtn = document.getElementById('mute-toggle');
  muteBtn.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    const icon = muteBtn.querySelector('i');
    const label = muteBtn.querySelector('span');
    
    if (isMuted) {
      icon.setAttribute('data-lucide', 'volume-x');
      label.textContent = 'Stumm';
    } else {
      icon.setAttribute('data-lucide', 'volume-2');
      label.textContent = 'Ton an';
    }
    lucide.createIcons();
    audio.init(); // Resume context on first click
  });

  // Switch between SPAs
  function switchView(viewName) {
    activeView = viewName;
    
    // Terminate engine thinking
    engine.terminate();
    
    // Clear pending bot moves
    if (botMoveTimeout) {
      clearTimeout(botMoveTimeout);
      botMoveTimeout = null;
    }
    
    // Update navigation UI
    navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle view containers
    const views = document.querySelectorAll('.view-container');
    views.forEach(v => {
      if (v.id === `view-${viewName}`) {
        v.classList.add('active');
      } else {
        v.classList.remove('active');
      }
    });

    // Reset and initialize the active view module
    if (viewName === 'play') {
      initPlayMode();
    } else if (viewName === 'puzzles') {
      initPuzzlesMode();
    } else if (viewName === 'openings') {
      initOpeningsMode();
    } else if (viewName === 'endgames') {
      initEndgamesMode();
    } else if (viewName === 'analysis') {
      initAnalysisMode();
    } else if (viewName === 'online') {
      initOnlineMode();
    } else if (viewName === 'coordinates') {
      initCoordinatesMode();
    }
  }

  // -------------------------------------------------------------
  // PROMOTION MODAL HANDLERS
  // -------------------------------------------------------------
  const promoModal = document.getElementById('promotion-modal');
  const promoChoices = document.querySelectorAll('.promotion-choice');

  function handlePromotionChoice(pieceType) {
    promoModal.classList.remove('active');
    if (pendingPromoMove) {
      pendingPromoMove.callback(pieceType);
      pendingPromoMove = null;
    }
  }

  promoChoices.forEach(choice => {
    choice.addEventListener('click', () => {
      const piece = choice.dataset.piece;
      handlePromotionChoice(piece);
    });
  });

  /**
   * Checks if a move requires promotion.
   */
  function isPromotionMove(gameInstance, from, to) {
    const piece = gameInstance.get(from);
    if (!piece || piece.type !== 'p') return false;
    
    const rank = to[1];
    return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1');
  }

  /**
   * Prompts the user with a modal to select a promotion piece.
   */
  function promptPromotion(callback) {
    pendingPromoMove = { callback };
    promoModal.classList.add('active');
  }

  // -------------------------------------------------------------
  // PROGRESS DATABASE (localStorage)
  // -------------------------------------------------------------
  function getProgress(key, defaultVal = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function saveProgress(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Speichern fehlgeschlagen: ", e);
    }
  }

  function markPuzzleSolved(id) {
    const list = getProgress('chess_solved_puzzles');
    if (!list.includes(id)) {
      list.push(id);
      saveProgress('chess_solved_puzzles', list);
    }
  }

  function markOpeningMastered(id) {
    const list = getProgress('chess_mastered_openings');
    if (!list.includes(id)) {
      list.push(id);
      saveProgress('chess_mastered_openings', list);
    }
  }

  function markEndgameCompleted(id) {
    const list = getProgress('chess_completed_endgames');
    if (!list.includes(id)) {
      list.push(id);
      saveProgress('chess_completed_endgames', list);
    }
  }

  // -------------------------------------------------------------
  // MODE 1: PLAY VS COMPUTER
  // -------------------------------------------------------------
  let playBotLevel = 3;
  let playBotColor = 'b'; // 'b' means computer plays Black, 'w' means computer plays White, 'both' means player moves both
  let threatMarkersEnabled = false;
  let bestMoveMarkersEnabled = false;
  let hangingPiecesEnabled = false;
  let spaceControlEnabled = false;
  let playThreatArrowsEnabled = false;

  const botLevelSelect = document.getElementById('bot-level-select');
  const playRestartBtn = document.getElementById('play-restart');
  const playFlipBtn = document.getElementById('play-flip');
  const playHistoryList = document.getElementById('play-history-list');
  const playStatusBanner = document.getElementById('play-status-banner');
  const playHintsToggle = document.getElementById('play-hints-toggle');
  const playEngineMovesToggle = document.getElementById('play-engine-moves-toggle');
  const playColorSelect = document.getElementById('play-color-select');
  const playHangingToggle = document.getElementById('play-hanging-toggle');
  const playSpaceToggle = document.getElementById('play-space-toggle');
  const playMoveExplanation = document.getElementById('play-move-explanation');
  const playExplanationText = document.getElementById('play-explanation-text');
  const botLevelContainer = document.getElementById('play-bot-level-container');
  const playThreatArrowsToggle = document.getElementById('play-threat-arrows-toggle');

  // Load levels
  botLevelSelect.querySelectorAll('.level-option').forEach(opt => {
    opt.addEventListener('click', () => {
      botLevelSelect.querySelectorAll('.level-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      playBotLevel = parseInt(opt.dataset.level, 10);
    });
  });

  // Load colors/modes
  playColorSelect.querySelectorAll('.level-option').forEach(opt => {
    opt.addEventListener('click', () => {
      playColorSelect.querySelectorAll('.level-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const val = opt.dataset.color;
      
      if (val === 'w') {
        playBotColor = 'b'; // Computer is Black
        botLevelContainer.style.display = 'block';
      } else if (val === 'b') {
        playBotColor = 'w'; // Computer is White
        botLevelContainer.style.display = 'block';
      } else {
        playBotColor = 'both'; // Player moves both sides
        botLevelContainer.style.display = 'none';
      }
      
      startNewPlayGame();
    });
  });

  playRestartBtn.addEventListener('click', () => {
    startNewPlayGame();
  });

  playFlipBtn.addEventListener('click', () => {
    if (activeBoard) {
      activeBoard.flip();
    }
  });

  playHintsToggle.addEventListener('change', (e) => {
    threatMarkersEnabled = e.target.checked;
    updatePlayAids();
  });

  playThreatArrowsToggle.addEventListener('change', (e) => {
    playThreatArrowsEnabled = e.target.checked;
    updatePlayAids();
  });

  playEngineMovesToggle.addEventListener('change', (e) => {
    bestMoveMarkersEnabled = e.target.checked;
    updatePlayAids();
  });

  playHangingToggle.addEventListener('change', (e) => {
    hangingPiecesEnabled = e.target.checked;
    updatePlayAids();
  });

  playSpaceToggle.addEventListener('change', (e) => {
    spaceControlEnabled = e.target.checked;
    updatePlayAids();
  });

  function initPlayMode() {
    startNewPlayGame();
  }

  function startNewPlayGame() {
    activeGame = new Chess();
    moveHistory = [];
    activeEvaluation = 50;
    playStatusBanner.style.display = 'none';
    playStatusBanner.innerHTML = '';
    
    // Clear pending bot moves
    if (botMoveTimeout) {
      clearTimeout(botMoveTimeout);
      botMoveTimeout = null;
    }
    
    updateEvalBar('play', 50, '0.0');

    const boardOrientation = playBotColor === 'w' ? 'b' : 'w';

    activeBoard = new Chessboard(document.getElementById('play-board'), {
      orientation: boardOrientation,
      game: activeGame,
      onMove: (from, to) => {
        handlePlayMove(from, to);
      }
    });

    renderMoveHistory(playHistoryList);
    updatePlayAids();
    
    if (playBotColor === 'w') {
      triggerBotMove();
    }
  }

  function handlePlayMove(from, to) {
    if (activeGame.game_over()) return;

    const moveExecution = (promoPiece) => {
      const moveOpts = { from, to };
      if (promoPiece) moveOpts.promotion = promoPiece;
      
      const last = activeGame.get(to);
      const isCheckBefore = activeGame.in_check();
      
      const move = activeGame.move(moveOpts);
      if (move) {
        // Sound effects
        if (activeGame.in_check()) {
          audio.playCheck();
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          audio.playCastle();
        } else if (last || move.flags.includes('e')) {
          audio.playCapture();
        } else {
          audio.playMove();
        }

        activeBoard.setLastMove(from, to);
        activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
        activeBoard.render();
        
        addMoveToHistory(move.san);
        renderMoveHistory(playHistoryList);
        
        checkGameStatus(playStatusBanner);
        updatePlayAids();

        if (!activeGame.game_over()) {
          triggerBotMove();
        }
      }
    };

    if (isPromotionMove(activeGame, from, to)) {
      promptPromotion(moveExecution);
    } else {
      moveExecution();
    }
  }

  function triggerBotMove() {
    if (playBotColor === 'both') return; // Pass & play, no bot moves
    if (activeGame.turn() !== playBotColor) return; // Not bot's turn

    // Clear any existing bot move timeout
    if (botMoveTimeout) {
      clearTimeout(botMoveTimeout);
      botMoveTimeout = null;
    }

    const startTime = Date.now();

    // Show computing state or block inputs?
    engine.getBestMove(activeGame.fen(), playBotLevel).then(bestMove => {
      if (!bestMove) return;
      
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 2000 - elapsed);
      
      botMoveTimeout = setTimeout(() => {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promo = bestMove.length > 4 ? bestMove.charAt(4) : undefined;
        
        const last = activeGame.get(to);
        const move = activeGame.move({ from, to, promotion: promo });
        
        if (move) {
          if (activeGame.in_check()) {
            audio.playCheck();
          } else if (move.flags.includes('k') || move.flags.includes('q')) {
            audio.playCastle();
          } else if (last || move.flags.includes('e')) {
            audio.playCapture();
          } else {
            audio.playMove();
          }

          activeBoard.setLastMove(from, to);
          activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
          activeBoard.render();
          
          addMoveToHistory(move.san);
          renderMoveHistory(playHistoryList);
          
          checkGameStatus(playStatusBanner);
          updatePlayAids();
          
          // Calculate evaluation
          triggerPositionEval('play');
        }
      }, delay);
    });
  }

  let currentMultiPv = {};

  function triggerPositionEval(mode) {
    // Reset multi-PV data for this position search
    currentMultiPv = {};
    const topMovesList = document.getElementById(`${mode}-top-moves`);
    if (topMovesList) {
      topMovesList.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Berechne Stellungen...</div>';
    }

    // Set callback to receive MultiPV updates
    engine.pendingCallbacks.multipv = {
      onUpdate: (data) => {
        currentMultiPv[data.multipv] = data;
        renderTopMovesWidget(mode, currentMultiPv);
      }
    };

    engine.evaluatePosition(activeGame.fen()).then(score => {
      // Clear callback once evaluation finishes
      delete engine.pendingCallbacks.multipv;

      if (!score) return;
      
      let evalText = '0.0';
      let percent = 50;
      
      if (score.type === 'cp') {
        const val = score.value / 100;
        evalText = (val >= 0 ? '+' : '') + val.toFixed(1);
        
        // Map evaluation score (centipawns) to a 0-100 percentage.
        // Cap evaluation at +/- 8 pawns advantage.
        const cappedVal = Math.max(-8, Math.min(8, val));
        percent = ((cappedVal + 8) / 16) * 100;
      } else if (score.type === 'mate') {
        evalText = 'M' + Math.abs(score.value);
        percent = score.value > 0 ? 100 : 0;
      }
      
      updateEvalBar(mode, percent, evalText);
      updateWdlBar(mode, score.type, score.value);
    });
  }

  function updateEvalBar(mode, percent, scoreText) {
    const container = document.getElementById(`${mode}-eval-bar`);
    if (!container) return;
    
    const bar = container.querySelector('.eval-bar-white');
    const textW = container.querySelector('#' + mode + '-score-w');
    const textB = container.querySelector('#' + mode + '-score-b');
    
    bar.style.height = `${percent}%`;
    
    if (percent >= 50) {
      textW.textContent = scoreText;
      textB.textContent = '';
    } else {
      textW.textContent = '';
      textB.textContent = scoreText;
    }
  }

  function updateWdlBar(mode, scoreType, scoreValue) {
    const barW = document.getElementById(`${mode}-wdl-w`);
    const barD = document.getElementById(`${mode}-wdl-d`);
    const barB = document.getElementById(`${mode}-wdl-b`);
    const textEl = document.getElementById(`${mode}-wdl-text`);
    if (!barW || !barD || !barB || !textEl) return;

    let cp = 0;
    if (scoreType === 'mate') {
      cp = scoreValue > 0 ? 1000 : -1000;
    } else {
      cp = scoreValue;
    }

    // Determine perspective based on side-to-move
    // Stockfish outputs evaluation scores from the perspective of the side-to-move.
    // If it is White's turn, positive scores favor White. If Black's turn, positive favors Black.
    // Let's normalize ELO calculation to absolute White perspective for absolute White-Draw-Black bar.
    let cpWhite = cp;
    if (activeGame.turn() === 'b') {
      cpWhite = -cp;
    }

    const x = cpWhite / 100;
    const drawRate = Math.round(35 * Math.exp(-0.15 * Math.abs(x)));
    const rem = 100 - drawRate;
    const winRate = Math.round(rem / (1 + Math.exp(-0.6 * x)));
    const lossRate = 100 - drawRate - winRate;

    barW.style.width = `${winRate}%`;
    barW.textContent = winRate >= 12 ? `${winRate}% W` : '';
    barD.style.width = `${drawRate}%`;
    barD.textContent = drawRate >= 12 ? `${drawRate}% R` : '';
    barB.style.width = `${lossRate}%`;
    barB.textContent = lossRate >= 12 ? `${lossRate}% S` : '';

    textEl.textContent = `Weiß: ${winRate}% | Remis: ${drawRate}% | Schwarz: ${lossRate}%`;
  }

  function convertMoveToSan(fen, lanMove) {
    if (!lanMove) return '';
    try {
      const tempChess = new Chess(fen);
      const from = lanMove.substring(0, 2);
      const to = lanMove.substring(2, 4);
      const promo = lanMove.length > 4 ? lanMove.charAt(4) : undefined;
      const m = tempChess.move({ from, to, promotion: promo });
      return m ? m.san : lanMove;
    } catch (e) {
      return lanMove;
    }
  }

  function renderTopMovesWidget(mode, pvData) {
    const container = document.getElementById(`${mode}-top-moves`);
    if (!container) return;

    container.innerHTML = '';
    
    const items = Object.values(pvData).sort((a, b) => a.multipv - b.multipv);
    if (items.length === 0) {
      container.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Berechne Stellungen...</div>';
      return;
    }

    items.forEach(item => {
      const san = convertMoveToSan(activeGame.fen(), item.move);
      let scoreStr = '';
      if (item.scoreType === 'mate') {
        scoreStr = `M${item.scoreValue}`;
      } else {
        const val = item.scoreValue / 100;
        scoreStr = (val >= 0 ? '+' : '') + val.toFixed(1);
      }
      
      // Calculate win-rate from this move's ELO/CP (side-to-move perspective)
      const x = item.scoreValue / 100;
      const drawRate = Math.round(35 * Math.exp(-0.15 * Math.abs(x)));
      const rem = 100 - drawRate;
      const winRate = Math.round(rem / (1 + Math.exp(-0.6 * x)));
      
      const rankColor = item.multipv === 1 ? 'var(--gold)' : 'var(--text-muted)';
      const winPctStr = `${winRate}%`;

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '4px 6px';
      row.style.borderRadius = '4px';
      row.style.backgroundColor = 'var(--bg-hover)';
      row.style.fontSize = '12px';

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; color: ${rankColor}; font-size: 11px;">#${item.multipv}</span>
          <span style="font-family: monospace; font-weight: 600; color: var(--text-main);">${san}</span>
        </div>
        <div style="display: flex; gap: 8px; font-weight: 600;">
          <span style="color: ${item.scoreValue >= 0 ? 'var(--accent)' : 'var(--color-blunder)'};">${scoreStr}</span>
          <span style="color: var(--text-muted); font-size: 11px;">(Sieg: ${winPctStr})</span>
        </div>
      `;
      container.appendChild(row);
    });
  }

  function updatePlayAids() {
    if (!activeBoard) return;
    
    activeBoard.clearDrawings();
    activeBoard.hangingSquares = [];
    activeBoard.spaceControl = {};
    
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    // 1. Threat markers (highlight player's pieces attacked by opponent)
    if (threatMarkersEnabled) {
      const oppColor = activeGame.turn(); // The current player whose turn it is attacks the target squares!
      const playerColor = oppColor === 'w' ? 'b' : 'w';
      
      files.forEach(f => {
        ranks.forEach(r => {
          const sq = f + r;
          const piece = activeGame.get(sq);
          
          if (piece && piece.color === playerColor) {
            if (activeGame.attacked(oppColor, sq)) {
              activeBoard.drawings.circles[sq] = 'red';
            }
          }
        });
      });
    }

    // 2. Hanging (ungedeckte) pieces markers
    if (hangingPiecesEnabled) {
      const oppColor = activeGame.turn() === 'w' ? 'b' : 'w';
      
      files.forEach(f => {
        ranks.forEach(r => {
          const sq = f + r;
          const piece = activeGame.get(sq);
          if (piece) {
            const defended = isPieceDefended(activeGame, sq, piece.color);
            const attacked = activeGame.attacked(oppColor, sq);
            if (!defended && attacked) {
              activeBoard.hangingSquares.push(sq);
            }
          }
        });
      });
    }

    // 3. Space control visualization
    if (spaceControlEnabled) {
      const space = {};
      files.forEach(f => {
        ranks.forEach(r => {
          const sq = f + r;
          const wAttack = activeGame.attacked('w', sq);
          const bAttack = activeGame.attacked('b', sq);
          if (wAttack && !bAttack) {
            space[sq] = 'w';
          } else if (!wAttack && bAttack) {
            space[sq] = 'b';
          } else if (wAttack && bAttack) {
            space[sq] = 'both';
          }
        });
      });
      activeBoard.spaceControl = space;
    }

    // Gegnerische Angriffslinien (drohende Züge)
    if (playThreatArrowsEnabled && !activeGame.game_over()) {
      const tempGame = new Chess(activeGame.fen());
      const tokens = tempGame.fen().split(' ');
      tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
      const oppFen = tokens.join(' ');
      const oppGame = new Chess(oppFen);
      const oppMoves = oppGame.moves({ verbose: true });
      oppMoves.forEach(m => {
        const targetPiece = activeGame.get(m.to);
        if (targetPiece && targetPiece.color === activeGame.turn()) {
          activeBoard.aidArrows.push({ from: m.from, to: m.to, color: 'red' });
        }
      });
    }

    // Render highlights/drawings
    activeBoard.renderHighlights();
    activeBoard.renderDrawings();
    
    // 4. Best engine move markers and explanation
    playMoveExplanation.style.display = 'none';
    if (bestMoveMarkersEnabled && !activeGame.game_over()) {
      engine.getBestMove(activeGame.fen(), 5, true).then(bestMove => {
        if (bestMove && bestMoveMarkersEnabled) {
          const from = bestMove.substring(0, 2);
          const to = bestMove.substring(2, 4);
          activeBoard.aidArrows.push({ from, to, color: 'green' });
          activeBoard.renderDrawings();

          // Find explanation
          const tempChess = new Chess(activeGame.fen());
          const promo = bestMove.length > 4 ? bestMove.charAt(4) : undefined;
          const moveObj = tempChess.move({ from, to, promotion: promo });
          if (moveObj) {
            const explanation = explainMove(activeGame, moveObj.san, bestMove);
            playMoveExplanation.style.display = 'block';
            playExplanationText.textContent = `Bester Zug: ${moveObj.san}. ${explanation}`;
          }
        }
      });
    }
  }

  // -------------------------------------------------------------
  // MODE 2: TACTICS / PUZZLES
  // -------------------------------------------------------------
  let currentPuzzle = null;
  let puzzleMoveIndex = 0;
  let puzzleRating = parseInt(localStorage.getItem('puzzleRating') || '1000', 10);
  let activePuzzleThemeFilter = 'all';
  let activePuzzleEloFilter = 'all';

  const puzzleRatingEl = document.getElementById('puzzle-rating');
  const puzzleTitleEl = document.getElementById('puzzle-title');
  const puzzleDescEl = document.getElementById('puzzle-desc');
  const puzzleFeedbackEl = document.getElementById('puzzle-feedback');
  const puzzlesListEl = document.getElementById('puzzles-list');
  const puzzleHintBtn = document.getElementById('puzzle-hint');
  const puzzleNextBtn = document.getElementById('puzzle-next');
  const puzzleThemeFilter = document.getElementById('puzzle-theme-filter');
  const puzzleEloFilter = document.getElementById('puzzle-elo-filter');

  puzzleRatingEl.textContent = puzzleRating;

  puzzleHintBtn.addEventListener('click', () => {
    if (!currentPuzzle || !activeBoard) return;
    
    // Highlight the starting square of the correct move in blue
    const nextMove = currentPuzzle.moves[puzzleMoveIndex];
    if (nextMove) {
      const from = nextMove.substring(0, 2);
      activeBoard.drawings.circles[from] = 'blue';
      activeBoard.renderDrawings();
    }
  });

  puzzleNextBtn.addEventListener('click', () => {
    loadNextPuzzle();
  });

  if (puzzleThemeFilter) {
    puzzleThemeFilter.addEventListener('change', (e) => {
      activePuzzleThemeFilter = e.target.value;
      renderPuzzleList();
    });
  }

  if (puzzleEloFilter) {
    puzzleEloFilter.addEventListener('change', (e) => {
      activePuzzleEloFilter = e.target.value;
      renderPuzzleList();
    });
  }

  function initPuzzlesMode() {
    renderPuzzleList();
    // Default select first available matching puzzle if any
    const solved = getProgress('chess_solved_puzzles');
    const matched = getFilteredPuzzles();
    if (matched.length > 0) {
      selectPuzzle(matched[0]);
    }
  }

  function getFilteredPuzzles() {
    return puzzles.filter(p => {
      // 1. Theme Filter
      if (activePuzzleThemeFilter !== 'all') {
        const theme = activePuzzleThemeFilter;
        if (theme === 'Mate') {
          const match = p.theme.toLowerCase().includes('mate') || p.theme === 'Back Rank' || p.theme.includes('Sacrifice');
          if (!match) return false;
        } else {
          if (p.theme !== theme) return false;
        }
      }
      
      // 2. ELO Filter
      if (activePuzzleEloFilter !== 'all') {
        const elo = activePuzzleEloFilter;
        if (elo === 'beginner' && p.difficulty >= 1000) return false;
        if (elo === 'intermediate' && (p.difficulty < 1000 || p.difficulty > 1200)) return false;
        if (elo === 'expert' && p.difficulty <= 1200) return false;
      }
      
      return true;
    });
  }

  function renderPuzzleList() {
    puzzlesListEl.innerHTML = '';
    const solved = getProgress('chess_solved_puzzles');
    const filtered = getFilteredPuzzles();

    filtered.forEach((p, idx) => {
      const card = document.createElement('div');
      card.classList.add('training-card');
      if (currentPuzzle && currentPuzzle.id === p.id) {
        card.style.borderColor = 'var(--accent)';
      }
      
      const isSolved = solved.includes(p.id);
      const badgeHTML = isSolved 
        ? `<span style="color: var(--accent); font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> Gelöst</span>`
        : `<span class="badge-tag difficulty-green">${p.difficulty} ELO</span>`;
      
      card.innerHTML = `
        <div class="card-details">
          <h4>Rätsel #${p.id}: ${p.title}</h4>
          <p>${p.theme}</p>
        </div>
        <div class="card-meta">
          ${badgeHTML}
        </div>
      `;
      
      card.addEventListener('click', () => {
        selectPuzzle(p);
      });
      puzzlesListEl.appendChild(card);
    });
    lucide.createIcons();
  }

  function selectPuzzle(puzzle) {
    currentPuzzle = puzzle;
    puzzleMoveIndex = 0;
    
    puzzleFeedbackEl.style.display = 'none';
    puzzleNextBtn.style.display = 'none';
    puzzleHintBtn.style.display = 'inline-flex';
    
    puzzleTitleEl.textContent = puzzle.title;
    puzzleDescEl.textContent = puzzle.description;
    
    activeGame = new Chess(puzzle.fen);
    
    activeBoard = new Chessboard(document.getElementById('puzzles-board'), {
      orientation: activeGame.turn(), // Perspective of the side solving the puzzle
      game: activeGame,
      onMove: (from, to) => {
        handlePuzzleMove(from, to);
      }
    });

    renderPuzzleList();
  }

  function handlePuzzleMove(from, to) {
    const expectedMove = currentPuzzle.moves[puzzleMoveIndex];
    const cleanMove = from + to;
    
    // Check if the user's move matches the start and end coordinates of the expected puzzle move
    const isCorrect = cleanMove === expectedMove.replace(/[+#]/g, '');
    
    if (isCorrect) {
      // Make the move in chess.js
      const actualMove = activeGame.move({ from, to });
      if (actualMove) {
        puzzleMoveIndex++;
        audio.playMove();
        
        activeBoard.setLastMove(from, to);
        activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
        activeBoard.clearDrawings();
        activeBoard.render();

        // Check if there are more moves in the puzzle solution
        if (puzzleMoveIndex < currentPuzzle.moves.length) {
          // Play opponent response automatically
          setTimeout(() => {
            const oppMove = currentPuzzle.moves[puzzleMoveIndex];
            const oppFrom = oppMove.substring(0, 2);
            const oppTo = oppMove.substring(2, 4);
            const actualOppMove = activeGame.move({ from: oppFrom, to: oppTo });
            
            if (actualOppMove) {
              puzzleMoveIndex++;
              audio.playCapture();
              activeBoard.setLastMove(oppFrom, oppTo);
              activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
              activeBoard.render();
            }
          }, 600);
        } else {
          // Puzzle completed successfully!
          audio.playCheck();
          puzzleFeedbackEl.style.display = 'block';
          puzzleFeedbackEl.className = 'game-state-banner banner-win';
          puzzleFeedbackEl.innerHTML = '<i data-lucide="check-circle"></i> Gelöst! Hervorragende Arbeit.';
          
          puzzleNextBtn.style.display = 'inline-flex';
          puzzleHintBtn.style.display = 'none';

          // Update ELO rating
          puzzleRating += 15;
          localStorage.setItem('puzzleRating', puzzleRating);
          puzzleRatingEl.textContent = puzzleRating;
          
          markPuzzleSolved(currentPuzzle.id);
          renderPuzzleList();
          
          lucide.createIcons();
        }
      }
    } else {
      // Wrong move: play error feedback and snap back
      puzzleFeedbackEl.style.display = 'block';
      puzzleFeedbackEl.className = 'game-state-banner banner-loss';
      puzzleFeedbackEl.innerHTML = '<i data-lucide="x-circle"></i> Falscher Zug. Versuche es noch einmal!';
      
      // Deduct rating
      if (puzzleRating > 600) {
        puzzleRating -= 10;
        localStorage.setItem('puzzleRating', puzzleRating);
        puzzleRatingEl.textContent = puzzleRating;
      }
      
      lucide.createIcons();
      
      // Snap piece back by re-rendering
      activeBoard.clearSelection();
    }
  }

  function loadNextPuzzle() {
    const filtered = getFilteredPuzzles();
    if (filtered.length === 0) return;
    const currentIdx = filtered.findIndex(p => p.id === currentPuzzle.id);
    const nextIdx = (currentIdx + 1) % filtered.length;
    selectPuzzle(filtered[nextIdx]);
  }

  // -------------------------------------------------------------
  // MODE 3: OPENINGS TRAINER
  // -------------------------------------------------------------
  let currentOpening = null;
  let openingMoveIndex = 0;
  let openingFilter = 'all';

  const openingsListEl = document.getElementById('openings-list');
  const openingGuideBox = document.getElementById('opening-guide-box');
  const openingFeedbackEl = document.getElementById('opening-feedback');
  const openingResetBtn = document.getElementById('opening-reset');
  const openingEloFilter = document.getElementById('opening-elo-filter');

  openingResetBtn.addEventListener('click', () => {
    if (currentOpening) selectOpening(currentOpening);
  });

  if (openingEloFilter) {
    openingEloFilter.querySelectorAll('.level-option').forEach(opt => {
      opt.addEventListener('click', () => {
        openingEloFilter.querySelectorAll('.level-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        openingFilter = opt.dataset.filter;
        renderOpeningsList();
      });
    });
  }

  function initOpeningsMode() {
    renderOpeningsList();
    if (!currentOpening && openings.length > 0) {
      selectOpening(openings[0]);
    }
  }

  function renderOpeningsList() {
    openingsListEl.innerHTML = '';
    const mastered = getProgress('chess_mastered_openings');
    
    const filtered = openings.filter(o => {
      if (openingFilter === 'all') return true;
      if (openingFilter === 'beginner') return o.elo < 1000;
      if (openingFilter === 'intermediate') return o.elo >= 1000 && o.elo <= 1300;
      if (openingFilter === 'expert') return o.elo > 1300;
      return true;
    });

    filtered.forEach(o => {
      const card = document.createElement('div');
      card.classList.add('training-card');
      if (currentOpening && currentOpening.id === o.id) {
        card.style.borderColor = 'var(--accent)';
      }
      
      const isMastered = mastered.includes(o.id);
      const eloTag = `<span class="badge-tag difficulty-green">${o.elo} ELO</span>`;
      const badgeHTML = isMastered
        ? `<span style="color: var(--accent); font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> Gelernt</span>`
        : eloTag;
      
      card.innerHTML = `
        <div class="card-details">
          <h4>${o.name}</h4>
          <p>${o.description.substring(0, 70)}...</p>
        </div>
        <div class="card-meta">
          ${badgeHTML}
        </div>
      `;
      
      card.addEventListener('click', () => {
        selectOpening(o);
      });
      openingsListEl.appendChild(card);
    });
    lucide.createIcons();
  }

  function selectOpening(opening) {
    currentOpening = opening;
    openingMoveIndex = 0;
    
    openingFeedbackEl.style.display = 'none';
    openingResetBtn.style.display = 'none';
    
    openingGuideBox.style.display = 'block';
    
    const nextMove = opening.moves[openingMoveIndex];
    const hint = nextMove ? `${nextMove.substring(0, 2)} → ${nextMove.substring(2, 4)}` : '';
    
    openingGuideBox.innerHTML = `
      <strong>${opening.name}</strong><br>
      Bewege Weiß für den ersten Zug.<br>
      <span style="color: var(--gold); font-weight: 600; display: block; margin-top: 6px;">Tipp: Spiele ${hint}</span>
    `;
    
    activeGame = new Chess();
    
    activeBoard = new Chessboard(document.getElementById('openings-board'), {
      orientation: 'w',
      game: activeGame,
      onMove: (from, to) => {
        handleOpeningMove(from, to);
      }
    });

    // Draw the visual hint arrow for the first move
    if (nextMove) {
      const fromSq = nextMove.substring(0, 2);
      const toSq = nextMove.substring(2, 4);
      activeBoard.aidArrows.push({ from: fromSq, to: toSq, color: 'blue' });
      activeBoard.renderDrawings();
    }

    renderOpeningsList();
  }

  function handleOpeningMove(from, to) {
    const expectedMove = currentOpening.moves[openingMoveIndex];
    const userMove = from + to;
    
    if (userMove === expectedMove) {
      const move = activeGame.move({ from, to });
      if (move) {
        audio.playMove();
        
        activeBoard.setLastMove(from, to);
        activeBoard.clearDrawings();
        activeBoard.render();
        
        // Show explanation for the player's move
        openingGuideBox.innerHTML = `<strong>Zuletzt gespielt: ${move.san}</strong><br>${currentOpening.explanations[openingMoveIndex]}`;
        openingMoveIndex++;

        // Show reset button now that moves are happening
        openingResetBtn.style.display = 'inline-flex';

        // Check if opening sequence has ended
        if (openingMoveIndex >= currentOpening.moves.length) {
          showOpeningCompletion();
          return;
        }

        // Play opponent response
        setTimeout(() => {
          const oppMoveStr = currentOpening.moves[openingMoveIndex];
          const oppFrom = oppMoveStr.substring(0, 2);
          const oppTo = oppMoveStr.substring(2, 4);
          
          const oppMove = activeGame.move({ from: oppFrom, to: oppTo });
          if (oppMove) {
            audio.playCapture();
            activeBoard.setLastMove(oppFrom, oppTo);
            activeBoard.render();
            
            // Show explanation for the opponent's move
            let guideHTML = `<strong>Gegner spielt: ${oppMove.san}</strong><br>${currentOpening.explanations[openingMoveIndex]}`;
            openingMoveIndex++;
            
            if (openingMoveIndex >= currentOpening.moves.length) {
              showOpeningCompletion();
            } else {
              // It is the player's turn again! Display the next hint!
              const nextPlayerMove = currentOpening.moves[openingMoveIndex];
              const hint = nextPlayerMove ? `${nextPlayerMove.substring(0, 2)} → ${nextPlayerMove.substring(2, 4)}` : '';
              guideHTML += `<br><span style="color: var(--gold); font-weight: 600; display: block; margin-top: 8px;">Dein nächster Zug: ${hint}</span>`;
              openingGuideBox.innerHTML = guideHTML;
              
              // Draw the visual hint arrow
              activeBoard.clearDrawings();
              if (nextPlayerMove) {
                const fromSq = nextPlayerMove.substring(0, 2);
                const toSq = nextPlayerMove.substring(2, 4);
                activeBoard.aidArrows.push({ from: fromSq, to: toSq, color: 'blue' });
                activeBoard.renderDrawings();
              }
            }
          }
        }, 800);
      }
    } else {
      // Wrong opening move
      openingFeedbackEl.style.display = 'block';
      openingFeedbackEl.className = 'game-state-banner banner-loss';
      openingFeedbackEl.innerHTML = '<i data-lucide="help-circle"></i> Falscher Eröffnungszug. Versuche es noch einmal!';
      
      lucide.createIcons();
      activeBoard.clearSelection();
    }
  }

  function showOpeningCompletion() {
    openingFeedbackEl.style.display = 'block';
    openingFeedbackEl.className = 'game-state-banner banner-win';
    openingFeedbackEl.innerHTML = '<i data-lucide="award"></i> Eröffnungslinie erfolgreich gemeistert!';
    markOpeningMastered(currentOpening.id);
    renderOpeningsList();
    lucide.createIcons();
  }


  // -------------------------------------------------------------
  // MODE 4: ENDGAME DRILLS
  // -------------------------------------------------------------
  let currentEndgame = null;
  let endgameMovesCount = 0;

  const endgamesListEl = document.getElementById('endgames-list');
  const endgameInstructionBox = document.getElementById('endgame-instruction-box');
  const endgameFeedbackEl = document.getElementById('endgame-feedback');
  const endgameResetBtn = document.getElementById('endgame-reset');

  endgameResetBtn.addEventListener('click', () => {
    if (currentEndgame) selectEndgame(currentEndgame);
  });

  function initEndgamesMode() {
    renderEndgamesList();
    if (!currentEndgame && endgames.length > 0) {
      selectEndgame(endgames[0]);
    }
  }

  function renderEndgamesList() {
    endgamesListEl.innerHTML = '';
    const completed = getProgress('chess_completed_endgames');
    endgames.forEach(e => {
      const card = document.createElement('div');
      card.classList.add('training-card');
      if (currentEndgame && currentEndgame.id === e.id) {
        card.style.borderColor = 'var(--accent)';
      }
      
      const isCompleted = completed.includes(e.id);
      const badgeHTML = isCompleted
        ? `<span style="color: var(--accent); font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="check-circle-2" style="width:14px; height:14px;"></i> Bestanden</span>`
        : `<span class="badge-tag difficulty-gold">${e.difficulty}</span>`;
      
      card.innerHTML = `
        <div class="card-details">
          <h4>${e.name}</h4>
          <p>${e.description}</p>
        </div>
        <div class="card-meta">
          ${badgeHTML}
        </div>
      `;
      
      card.addEventListener('click', () => {
        selectEndgame(e);
      });
      endgamesListEl.appendChild(card);
    });
    lucide.createIcons();
  }

  function selectEndgame(endgame) {
    currentEndgame = endgame;
    endgameMovesCount = 0;
    
    endgameFeedbackEl.style.display = 'none';
    endgameResetBtn.style.display = 'inline-flex';
    
    endgameInstructionBox.style.display = 'block';
    endgameInstructionBox.innerHTML = `<strong>Ziel:</strong> ${endgame.instructions}<br><small style="color: var(--text-muted);">Züge: 0 / ${endgame.maxMoves}</small>`;
    
    activeGame = new Chess(endgame.fen);
    
    activeBoard = new Chessboard(document.getElementById('endgames-board'), {
      orientation: 'w',
      game: activeGame,
      onMove: (from, to) => {
        handleEndgameMove(from, to);
      }
    });

    renderEndgamesList();
  }

  function handleEndgameMove(from, to) {
    if (activeGame.game_over()) return;

    const moveExecution = (promoPiece) => {
      const moveOpts = { from, to };
      if (promoPiece) moveOpts.promotion = promoPiece;
      
      const last = activeGame.get(to);
      const move = activeGame.move(moveOpts);
      
      if (move) {
        endgameMovesCount++;
        
        if (activeGame.in_check()) {
          audio.playCheck();
        } else if (last) {
          audio.playCapture();
        } else {
          audio.playMove();
        }

        activeBoard.setLastMove(from, to);
        activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
        activeBoard.render();
        
        updateEndgameStatus();

        if (activeGame.game_over()) {
          checkEndgameCompletion();
        } else if (endgameMovesCount >= currentEndgame.maxMoves) {
          showEndgameFail('Limit an Zügen überschritten!');
        } else {
          // Play opponent bot move
          triggerEndgameBotMove();
        }
      }
    };

    if (isPromotionMove(activeGame, from, to)) {
      promptPromotion(moveExecution);
    } else {
      moveExecution();
    }
  }

  function triggerEndgameBotMove() {
    engine.getBestMove(activeGame.fen(), 4).then(bestMove => {
      if (!bestMove) return;
      
      const from = bestMove.substring(0, 2);
      const to = bestMove.substring(2, 4);
      const promo = bestMove.length > 4 ? bestMove.charAt(4) : undefined;
      
      const last = activeGame.get(to);
      const move = activeGame.move({ from, to, promotion: promo });
      
      if (move) {
        if (activeGame.in_check()) {
          audio.playCheck();
        } else if (last) {
          audio.playCapture();
        } else {
          audio.playMove();
        }

        activeBoard.setLastMove(from, to);
        activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
        activeBoard.render();
        
        updateEndgameStatus();
        
        if (activeGame.game_over()) {
          checkEndgameCompletion();
        }
      }
    });
  }

  function updateEndgameStatus() {
    endgameInstructionBox.innerHTML = `<strong>Ziel:</strong> ${currentEndgame.instructions}<br><small style="color: var(--text-muted);">Züge: ${endgameMovesCount} / ${currentEndgame.maxMoves}</small>`;
  }

  function checkEndgameCompletion() {
    if (activeGame.in_checkmate()) {
      // Black is mated
      audio.playGameOver();
      endgameFeedbackEl.style.display = 'block';
      endgameFeedbackEl.className = 'game-state-banner banner-win';
      endgameFeedbackEl.innerHTML = `<i data-lucide="award"></i> Mattgesetzt in ${endgameMovesCount} Zügen! Ausgezeichnet.`;
      markEndgameCompleted(currentEndgame.id);
      renderEndgamesList();
    } else {
      showEndgameFail('Stellung endete in einem Unentschieden oder Patt.');
    }
    lucide.createIcons();
  }

  function showEndgameFail(msg) {
    audio.playGameOver();
    endgameFeedbackEl.style.display = 'block';
    endgameFeedbackEl.className = 'game-state-banner banner-loss';
    endgameFeedbackEl.innerHTML = `<i data-lucide="x-circle"></i> Fehlgeschlagen: ${msg}`;
    lucide.createIcons();
  }


  // -------------------------------------------------------------
  // MODE 5: ANALYSIS BOARD & REVIEW
  // -------------------------------------------------------------
  const analysisHistoryList = document.getElementById('analysis-history-list');
  const analysisResetBtn = document.getElementById('analysis-reset');
  const analysisFlipBtn = document.getElementById('analysis-flip');
  const analysisFenInput = document.getElementById('analysis-fen-input');
  const analysisLoadFenBtn = document.getElementById('analysis-load-fen');
  const analysisExplanationEl = document.getElementById('analysis-move-explanation');
  const explanationTitleEl = document.getElementById('analysis-explanation-title');
  const explanationDescEl = document.getElementById('analysis-explanation-desc');

  analysisResetBtn.addEventListener('click', () => {
    startNewAnalysisGame();
  });

  analysisFlipBtn.addEventListener('click', () => {
    if (activeBoard) activeBoard.flip();
  });

  analysisLoadFenBtn.addEventListener('click', () => {
    const fen = analysisFenInput.value.trim();
    if (fen) {
      try {
        const tempGame = new Chess(fen); // validate FEN
        activeGame = tempGame;
        moveHistory = [];
        activeBoard.game = activeGame;
        activeBoard.render();
        renderMoveHistory(analysisHistoryList);
        triggerPositionEval('analysis');
      } catch (err) {
        alert('Ungültiges FEN-Format!');
      }
    }
  });

  function initAnalysisMode() {
    startNewAnalysisGame();
  }

  function startNewAnalysisGame() {
    activeGame = new Chess();
    moveHistory = [];
    activeEvaluation = 50;
    analysisFenInput.value = '';
    analysisExplanationEl.style.display = 'none';
    
    updateEvalBar('analysis', 50, '0.0');

    activeBoard = new Chessboard(document.getElementById('analysis-board'), {
      orientation: 'w',
      game: activeGame,
      onMove: (from, to) => {
        handleAnalysisMove(from, to);
      }
    });

    renderMoveHistory(analysisHistoryList);
  }

  function handleAnalysisMove(from, to) {
    const fenBefore = activeGame.fen();
    
    const moveExecution = (promoPiece) => {
      const moveOpts = { from, to };
      if (promoPiece) moveOpts.promotion = promoPiece;
      
      const last = activeGame.get(to);
      
      // Perform move
      const move = activeGame.move(moveOpts);
      if (move) {
        if (activeGame.in_check()) {
          audio.playCheck();
        } else if (last) {
          audio.playCapture();
        } else {
          audio.playMove();
        }

        activeBoard.setLastMove(from, to);
        activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
        activeBoard.render();

        addMoveToHistory(move.san);
        renderMoveHistory(analysisHistoryList);

        // Perform analysis evaluation and classification
        evaluateAndClassifyMove(fenBefore, move.san);
      }
    };

    if (isPromotionMove(activeGame, from, to)) {
      promptPromotion(moveExecution);
    } else {
      moveExecution();
    }
  }

  /**
   * Compares the evaluation before and after the move to classify move quality
   */
  async function evaluateAndClassifyMove(fenBefore, playedSan) {
    const playerColor = activeGame.turn() === 'w' ? 'b' : 'w'; // color that just moved
    
    // 1. Get best move for FEN before
    const bestMoveStr = await engine.getBestMove(fenBefore, 4);
    const scoreBefore = await engine.evaluatePosition(fenBefore);
    const scoreAfter = await engine.evaluatePosition(activeGame.fen());

    // Update the live evaluation bar
    let evalText = '0.0';
    let percent = 50;
    if (scoreAfter.type === 'cp') {
      const val = scoreAfter.value / 100;
      evalText = (val >= 0 ? '+' : '') + val.toFixed(1);
      const cappedVal = Math.max(-8, Math.min(8, val));
      percent = ((cappedVal + 8) / 16) * 100;
    } else if (scoreAfter.type === 'mate') {
      evalText = 'M' + Math.abs(scoreAfter.value);
      percent = scoreAfter.value > 0 ? 100 : 0;
    }
    updateEvalBar('analysis', percent, evalText);

    // 2. Classify move quality
    let scoreBeforeVal = scoreBefore.value;
    let scoreAfterVal = scoreAfter.value;

    // Standardize perspective
    // centipawn scores are positive for white, negative for black
    if (playerColor === 'b') {
      scoreBeforeVal = -scoreBeforeVal;
      scoreAfterVal = -scoreAfterVal;
    }

    const valDiff = scoreAfterVal - scoreBeforeVal;

    let classification = 'good'; // default
    let badgeText = '';
    let badgeClass = '';
    let explanationTitle = '';
    let explanationDesc = '';

    const playedMoveClean = playedSan.replace(/[+#]/g, '');

    // Check if played move matches the engine's suggested best move
    const engineGame = new Chess(fenBefore);
    let bestSan = '';
    if (bestMoveStr) {
      const bFrom = bestMoveStr.substring(0, 2);
      const bTo = bestMoveStr.substring(2, 4);
      const bPromo = bestMoveStr.length > 4 ? bestMoveStr.charAt(4) : undefined;
      const bMove = engineGame.move({ from: bFrom, to: bTo, promotion: bPromo });
      if (bMove) bestSan = bMove.san.replace(/[+#]/g, '');
    }

    if (playedMoveClean === bestSan) {
      classification = 'best';
      badgeText = '🌟';
      badgeClass = 'badge-best';
      explanationTitle = '🌟 Bester Zug';
      explanationDesc = 'Du hast den besten Zug in dieser Stellung gefunden! Perfekt gespielt.';
    } else if (valDiff >= -15) {
      classification = 'excellent';
      badgeText = '✅';
      badgeClass = 'badge-excellent';
      explanationTitle = '✅ Exzellenter Zug';
      explanationDesc = 'Ein sehr starker Zug, der deine Stellung stabilisiert oder ausbaut.';
    } else if (valDiff >= -40) {
      classification = 'good';
      badgeText = '✔️';
      badgeClass = 'badge-good';
      explanationTitle = '✔️ Guter Zug';
      explanationDesc = 'Ein solider Zug, der deine Pläne fortsetzt.';
    } else if (valDiff >= -120) {
      classification = 'mistake';
      badgeText = '❓';
      badgeClass = 'badge-mistake';
      explanationTitle = '❓ Ungenauigkeit / Fehler';
      explanationDesc = `Es gab bessere Alternativen. Zum Beispiel wäre ${bestSan ? bestSan : 'ein anderer Aufbau'} stärker gewesen.`;
    } else {
      classification = 'blunder';
      badgeText = '❌';
      badgeClass = 'badge-blunder';
      explanationTitle = '❌ Grober Schnitzer (Blunder)';
      explanationDesc = `Ein schwerer Fehler! Du hast einen deutlichen Vorteil vergeben. Besser wäre ${bestSan ? bestSan : 'ein defensiverer Zug'} gewesen.`;
    }

    // Attach classification badges to the last move in history list
    const lastRow = moveHistory[moveHistory.length - 1];
    if (lastRow) {
      if (playerColor === 'w') {
        lastRow.wBadge = `<span class="move-badge ${badgeClass}">${badgeText}</span>`;
      } else {
        lastRow.bBadge = `<span class="move-badge ${badgeClass}">${badgeText}</span>`;
      }
    }
    
    renderMoveHistory(analysisHistoryList);

    // Show analysis panel description
    analysisExplanationEl.style.display = 'block';
    explanationTitleEl.innerHTML = explanationTitle;
    explanationDescEl.textContent = explanationDesc;

    // Track mistakes for the Retry Mistakes wizard
    if (classification === 'mistake' || classification === 'blunder') {
      analysisMistakes.push({
        fenBefore,
        bestMove: bestMoveStr,
        playedMove: playedSan,
        moveIndex: activeGame.history().length - 1
      });
      document.getElementById('analysis-retry-btn').style.display = 'inline-flex';
    }

    // Update Live Opening Explorer
    updateOpeningExplorer();
  }


  // -------------------------------------------------------------
  // SHARED CHESS UTILITIES & PRESENTATION HELPERS
  // -------------------------------------------------------------
  
  function addMoveToHistory(san) {
    if (moveHistory.length === 0 || moveHistory[moveHistory.length - 1].b !== '') {
      moveHistory.push({
        w: san,
        b: '',
        wBadge: '',
        bBadge: ''
      });
    } else {
      moveHistory[moveHistory.length - 1].b = san;
    }
  }

  function renderMoveHistory(container) {
    container.innerHTML = '';
    moveHistory.forEach((row, index) => {
      const rowEl = document.createElement('div');
      rowEl.classList.add('history-row');
      
      rowEl.innerHTML = `
        <span class="history-num">${index + 1}.</span>
        <span class="history-move">
          ${row.w} ${row.wBadge || ''}
        </span>
        <span class="history-move">
          ${row.b} ${row.bBadge || ''}
        </span>
      `;
      
      container.appendChild(rowEl);
    });
    
    // Auto scroll history list to bottom
    container.scrollTop = container.scrollHeight;
  }

  function getKingSquare(gameInstance, color) {
    const board = gameInstance.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
          return files[c] + ranks[r];
        }
      }
    }
    return null;
  }

  function checkGameStatus(bannerElement) {
    if (activeGame.game_over()) {
      audio.playGameOver();
      bannerElement.style.display = 'block';
      
      if (activeGame.in_checkmate()) {
        const loser = activeGame.turn() === 'w' ? 'Weiß' : 'Schwarz';
        const winner = activeGame.turn() === 'w' ? 'Schwarz' : 'Weiß';
        bannerElement.className = 'game-state-banner banner-win';
        bannerElement.innerHTML = `<i data-lucide="award"></i> Schachmatt! ${winner} gewinnt.`;
      } else if (activeGame.in_stalemate()) {
        bannerElement.className = 'game-state-banner banner-draw';
        bannerElement.innerHTML = `<i data-lucide="help-circle"></i> Remis! Pattstellung.`;
      } else if (activeGame.in_threefold_repetition()) {
        bannerElement.className = 'game-state-banner banner-draw';
        bannerElement.innerHTML = `<i data-lucide="help-circle"></i> Remis durch Zugwiederholung.`;
      } else if (activeGame.insufficient_material()) {
        bannerElement.className = 'game-state-banner banner-draw';
        bannerElement.innerHTML = `<i data-lucide="help-circle"></i> Remis! Ungenügendes Material.`;
      } else {
        bannerElement.className = 'game-state-banner banner-draw';
        bannerElement.innerHTML = `<i data-lucide="help-circle"></i> Remis!`;
      }
      lucide.createIcons();
    }
  }

  /**
   * Helper to check if a piece is defended by its own color
   */
  function isPieceDefended(gameInstance, square, color) {
    const piece = gameInstance.get(square);
    if (!piece) return false;
    
    // Temporarily remove piece to see if the square remains defended
    gameInstance.remove(square);
    const isAttacked = gameInstance.attacked(color, square);
    gameInstance.put(piece, square); // Restore
    
    return isAttacked;
  }

  /**
   * Explain a move dynamically in German
   */
  function explainMove(gameInstance, moveSan, moveCoordinates) {
    const from = moveCoordinates.substring(0, 2);
    const to = moveCoordinates.substring(2, 4);
    const piece = gameInstance.get(from);
    if (!piece) return "Verbessert die Gesamtposition.";

    const pieceNames = {
      p: "Bauer",
      n: "Springer",
      b: "Läufer",
      r: "Turm",
      q: "Dame",
      k: "König"
    };

    const targetPiece = gameInstance.get(to);
    const isCapture = !!targetPiece;
    const pieceName = pieceNames[piece.type];

    if (moveSan.includes('O-O-O')) {
      return "Lange Rochade: Schützt den König und bringt den Damenturm zur Spielfeldmitte.";
    }
    if (moveSan.includes('O-O')) {
      return "Kurze Rochade: Schützt den König in der Ecke und bringt den Königsturm ins Spiel.";
    }
    if (moveSan.includes('+')) {
      return `Schach! Der ${pieceName} auf ${to} greift den gegnerischen König direkt an.`;
    }
    if (moveSan.includes('#')) {
      return `Schachmatt! Der ${pieceName} gewinnt das Spiel.`;
    }
    if (isCapture) {
      const targetName = pieceNames[targetPiece.type];
      return `Der ${pieceName} schlägt den gegnerischen ${targetName} auf ${to} und gewinnt Material.`;
    }
    
    // Position/Strategy Heuristics
    if (piece.type === 'p') {
      if (to === 'e4' || to === 'd4' || to === 'e5' || to === 'd5') {
        return `Zentrumsbeanspruchung: Besetzt ein zentrales Schlüsselfeld (${to}) und blockiert gegnerischen Raum.`;
      }
      return `Der Bauer rückt nach ${to} vor, um Raum zu gewinnen.`;
    }
    if (piece.type === 'n') {
      return `Entwicklung: Bringt den Springer nach ${to}, um das Zentrum zu belagern.`;
    }
    if (piece.type === 'b') {
      return `Entwicklung: Bringt den Läufer auf eine aktive Diagonale.`;
    }
    if (piece.type === 'r') {
      return `Turmaktivierung: Bringt den Turm auf die aktive ${to[0]}-Linie.`;
    }
    if (piece.type === 'q') {
      return `Damenaktivierung: Schaltet die Dame ins Spielgeschehen ein.`;
    }
    if (piece.type === 'k') {
      return `Königssicherheit: Bringt den König in Sicherheit oder verbessert seine Aktivität.`;
    }
    
    return `Zieht den ${pieceName} nach ${to}.`;
  }

  // =============================================================
  // FEATURE 1: LIVE OPENING EXPLORER (MEISTER-DATENBANK)
  // =============================================================
  const openingExplorerDb = {
    "start": { name: "Ausgangsstellung", games: 154020, w: 39, d: 33, b: 28 },
    "e2e4": { name: "Königsbauerneröffnung (1. e4)", games: 68420, w: 41, d: 29, b: 30 },
    "e2e4 e7e5": { name: "Offenes Spiel (1... e5)", games: 28940, w: 38, d: 32, b: 30 },
    "e2e4 e7e5 g1f3": { name: "Königsspringerspiel", games: 22100, w: 39, d: 33, b: 28 },
    "e2e4 e7e5 g1f3 b8c6": { name: "Zweispringerspiel im Nachzuge", games: 16800, w: 38, d: 34, b: 28 },
    "e2e4 e7e5 g1f3 b8c6 f1b5": { name: "Spanische Partie (Ruy Lopez)", games: 11400, w: 40, d: 35, b: 25 },
    "e2e4 c7c5": { name: "Sizilianische Verteidigung", games: 21980, w: 42, d: 24, b: 34 },
    "e2e4 c7c5 g1f3": { name: "Sizilianisch: Offene Variante", games: 14500, w: 44, d: 25, b: 31 },
    "e2e4 c6": { name: "Caro-Kann-Verteidigung", games: 7420, w: 38, d: 36, b: 26 },
    "e2e4 e7e6": { name: "Französische Verteidigung", games: 6810, w: 40, d: 30, b: 30 },
    "d2d4": { name: "Damenbauerneröffnung (1. d4)", games: 48900, w: 42, d: 32, b: 26 },
    "d2d4 d7d5": { name: "Geschlossene Partie (1... d5)", games: 25400, w: 40, d: 34, b: 26 },
    "d2d4 d7d5 c2c4": { name: "Damengambit (2. c4)", games: 18200, w: 43, d: 33, b: 24 }
  };

  function updateOpeningExplorer() {
    const history = activeGame.history({ verbose: true });
    const coordPath = history.map(m => m.from + m.to).join(' ');
    
    const dbEntry = openingExplorerDb[coordPath] || (history.length === 0 ? openingExplorerDb["start"] : null);
    
    const bar = document.getElementById('analysis-explorer-bar');
    const nameEl = document.getElementById('analysis-explorer-name');
    const statsEl = document.getElementById('analysis-explorer-stats');
    
    if (dbEntry) {
      nameEl.textContent = dbEntry.name;
      statsEl.textContent = `Aus ${dbEntry.games.toLocaleString('de-DE')} gespielten Meisterpartien`;
      
      const barW = document.getElementById('explorer-bar-w');
      const barD = document.getElementById('explorer-bar-d');
      const barB = document.getElementById('explorer-bar-b');
      
      barW.style.width = `${dbEntry.w}%`;
      barW.textContent = `${dbEntry.w}% W`;
      barD.style.width = `${dbEntry.d}%`;
      barD.textContent = `${dbEntry.d}% R`;
      barB.style.width = `${dbEntry.b}%`;
      barB.textContent = `${dbEntry.b}% S`;
      
      bar.style.display = 'flex';
    } else {
      nameEl.textContent = "Eigene / Unbekannte Variante";
      statsEl.textContent = "Keine exakten Partien in der Meisterdatenbank gefunden.";
      
      const barW = document.getElementById('explorer-bar-w');
      const barD = document.getElementById('explorer-bar-d');
      const barB = document.getElementById('explorer-bar-b');
      
      barW.style.width = '33.3%';
      barW.textContent = '';
      barD.style.width = '33.3%';
      barD.textContent = '';
      barB.style.width = '33.4%';
      barB.textContent = '';
    }
  }

  // =============================================================
  // FEATURE 2: KOORDINATEN-TRAINER
  // =============================================================
  let coordHighscore = parseInt(localStorage.getItem('chess_coord_highscore') || '0', 10);
  let coordActive = false;
  let coordTimerVal = 30;
  let coordScoreVal = 0;
  let coordTargetSq = '';
  let coordBoardObj = null;
  let coordInterval = null;

  const coordHighscoreEl = document.getElementById('coord-highscore');
  const coordTargetEl = document.getElementById('coord-target');
  const coordTimerEl = document.getElementById('coord-timer');
  const coordScoreEl = document.getElementById('coord-score');
  const coordStartBtn = document.getElementById('coord-start');

  coordHighscoreEl.textContent = coordHighscore;

  coordStartBtn.addEventListener('click', () => {
    if (coordActive) return;
    startCoordinatesGame();
  });

  function initCoordinatesMode() {
    // Reset state
    coordActive = false;
    if (coordInterval) clearInterval(coordInterval);
    coordScoreVal = 0;
    coordTimerVal = 30;
    
    coordTargetEl.textContent = '--';
    coordScoreEl.textContent = 'Punkte: 0';
    coordTimerEl.textContent = 'Zeit verbleibend: 30s';
    
    coordHighscore = parseInt(localStorage.getItem('chess_coord_highscore') || '0', 10);
    coordHighscoreEl.textContent = coordHighscore;
    
    coordStartBtn.textContent = 'Trainer Starten';
    coordStartBtn.disabled = false;
    
    // Render empty board
    const emptyGame = new Chess();
    emptyGame.clear();
    
    coordBoardObj = new Chessboard(document.getElementById('coord-board'), {
      orientation: 'w',
      game: emptyGame
    });
  }

  function startCoordinatesGame() {
    coordActive = true;
    coordScoreVal = 0;
    coordTimerVal = 30;
    
    coordScoreEl.textContent = 'Punkte: 0';
    coordTimerEl.textContent = 'Zeit verbleibend: 30s';
    coordStartBtn.textContent = 'Spiel läuft...';
    coordStartBtn.disabled = true;
    
    nextCoordinateTarget();
    
    coordBoardObj.onClick = (sq) => {
      if (!coordActive) return;
      
      if (sq === coordTargetSq) {
        // Correct square
        coordScoreVal++;
        coordScoreEl.textContent = `Punkte: ${coordScoreVal}`;
        audio.playMove();
        
        // Success flash
        const sqEl = document.querySelector(`#coord-board [data-square="${sq}"]`);
        if (sqEl) {
          sqEl.style.backgroundColor = 'rgba(118, 150, 86, 0.6)';
          setTimeout(() => {
            sqEl.style.backgroundColor = '';
          }, 150);
        }
        
        nextCoordinateTarget();
      } else {
        // Penalty for wrong square
        audio.playCheck(); // plays check sound as feedback
        
        const sqEl = document.querySelector(`#coord-board [data-square="${sq}"]`);
        if (sqEl) {
          sqEl.style.backgroundColor = 'rgba(235, 64, 52, 0.6)';
          setTimeout(() => {
            sqEl.style.backgroundColor = '';
          }, 150);
        }
        coordTimerVal = Math.max(0, coordTimerVal - 2); // 2s penalty
        coordTimerEl.textContent = `Zeit verbleibend: ${coordTimerVal}s`;
      }
    };
    
    coordInterval = setInterval(() => {
      coordTimerVal--;
      coordTimerEl.textContent = `Zeit verbleibend: ${coordTimerVal}s`;
      
      if (coordTimerVal <= 0) {
        // End Coordinates Game
        clearInterval(coordInterval);
        coordActive = false;
        coordBoardObj.onClick = null;
        
        audio.playGameOver();
        coordStartBtn.textContent = 'Trainer Starten';
        coordStartBtn.disabled = false;
        coordTargetEl.textContent = '--';
        
        if (coordScoreVal > coordHighscore) {
          coordHighscore = coordScoreVal;
          localStorage.setItem('chess_coord_highscore', coordScoreVal);
          coordHighscoreEl.textContent = coordScoreVal;
          alert(`Neuer Highscore! Du hast ${coordScoreVal} Felder getroffen! 🎉`);
        } else {
          alert(`Zeit abgelaufen! Du hast ${coordScoreVal} Felder gefunden.`);
        }
      }
    }, 1000);
  }

  function nextCoordinateTarget() {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    let nextSq = coordTargetSq;
    while (nextSq === coordTargetSq) {
      const f = files[Math.floor(Math.random() * 8)];
      const r = ranks[Math.floor(Math.random() * 8)];
      nextSq = f + r;
    }
    
    coordTargetSq = nextSq;
    coordTargetEl.textContent = coordTargetSq;
  }

  // =============================================================
  // FEATURE 3: SANDBOX EDIT-MODUS
  // =============================================================
  let isEditMode = false;
  let activeEditPiece = null; // { type: 'q', color: 'w' }

  const editToggleBtn = document.getElementById('analysis-edit-toggle');
  const editorPalette = document.getElementById('analysis-editor-palette');
  const editorWhitePieces = document.getElementById('editor-white-pieces');
  const editorBlackPieces = document.getElementById('editor-black-pieces');
  const editorClearBtn = document.getElementById('editor-clear-board');
  const editorDoneBtn = document.getElementById('editor-done');

  // Populate editor palettes
  const pieceCodes = ['k', 'q', 'r', 'b', 'n', 'p'];
  const pieceNamesDe = { k: 'König', q: 'Dame', r: 'Turm', b: 'Läufer', n: 'Springer', p: 'Bauer' };
  
  function populateEditorPalette() {
    editorWhitePieces.innerHTML = '';
    editorBlackPieces.innerHTML = '';
    
    pieceCodes.forEach(code => {
      // White pieces
      const btnW = document.createElement('button');
      btnW.classList.add('editor-choice');
      const imgCode = 'w' + code.toUpperCase();
      btnW.style.backgroundImage = `url(https://upload.wikimedia.org/wikipedia/commons/${getPieceSvgPath(imgCode)})`;
      btnW.title = `Weißer ${pieceNamesDe[code]}`;
      btnW.addEventListener('click', () => selectEditorPiece(code, 'w', btnW));
      editorWhitePieces.appendChild(btnW);
      
      // Black pieces
      const btnB = document.createElement('button');
      btnB.classList.add('editor-choice');
      const imgCodeB = 'b' + code.toUpperCase();
      btnB.style.backgroundImage = `url(https://upload.wikimedia.org/wikipedia/commons/${getPieceSvgPath(imgCodeB)})`;
      btnB.title = `Schwarzer ${pieceNamesDe[code]}`;
      btnB.addEventListener('click', () => selectEditorPiece(code, 'b', btnB));
      editorBlackPieces.appendChild(btnB);
    });
  }

  function getPieceSvgPath(code) {
    const paths = {
      wK: '4/42/Chess_klt45.svg',
      wQ: '1/15/Chess_qlt45.svg',
      wR: '7/72/Chess_rlt45.svg',
      wB: 'b/b1/Chess_blt45.svg',
      wN: '7/70/Chess_nlt45.svg',
      wP: 'c/c7/Chess_plt45.svg',
      bK: 'f/f0/Chess_kdt45.svg',
      bQ: '4/47/Chess_qdt45.svg',
      bR: 'f/ff/Chess_rdt45.svg',
      bB: '9/98/Chess_bdt45.svg',
      bN: 'e/ef/Chess_ndt45.svg',
      bP: 'c/c7/Chess_pdt45.svg'
    };
    return paths[code];
  }

  function selectEditorPiece(type, color, btnEl) {
    document.querySelectorAll('.editor-choice').forEach(b => b.classList.remove('active-piece'));
    
    if (activeEditPiece && activeEditPiece.type === type && activeEditPiece.color === color) {
      activeEditPiece = null;
    } else {
      activeEditPiece = { type, color };
      btnEl.classList.add('active-piece');
    }
  }

  editToggleBtn.addEventListener('click', () => {
    toggleEditorMode();
  });

  editorDoneBtn.addEventListener('click', () => {
    toggleEditorMode();
  });

  editorClearBtn.addEventListener('click', () => {
    activeGame.clear();
    activeBoard.render();
  });

  function toggleEditorMode() {
    if (activeView !== 'analysis') return;
    
    isEditMode = !isEditMode;
    if (isEditMode) {
      populateEditorPalette();
      editorPalette.style.display = 'flex';
      editToggleBtn.innerHTML = '<i data-lucide="check"></i> Fertig';
      editToggleBtn.classList.add('btn-primary');
      
      engine.terminate();
      
      activeBoard.onClick = (sq) => {
        if (activeEditPiece) {
          activeGame.put(activeEditPiece, sq);
        } else {
          activeGame.remove(sq);
        }
        activeBoard.render();
      };
    } else {
      editorPalette.style.display = 'none';
      editToggleBtn.innerHTML = '<i data-lucide="edit-3"></i> Stellung editieren';
      editToggleBtn.classList.remove('btn-primary');
      
      activeBoard.onClick = null;
      activeEditPiece = null;
      
      triggerPositionEval('analysis');
      updateOpeningExplorer();
    }
    lucide.createIcons();
  }

  // =============================================================
  // FEATURE 4: FEHLER-KORREKTUR (RETRY MISTAKES WIZARD)
  // =============================================================
  let isRetryMode = false;
  let analysisMistakes = [];
  let retryCurrentIndex = 0;

  const retryBtn = document.getElementById('analysis-retry-btn');
  const retryPanel = document.getElementById('analysis-retry-panel');
  const retryText = document.getElementById('analysis-retry-text');
  const retryNextBtn = document.getElementById('analysis-retry-next');

  retryBtn.addEventListener('click', () => {
    if (analysisMistakes.length > 0) {
      startRetryWizard();
    }
  });

  retryNextBtn.addEventListener('click', () => {
    retryCurrentIndex++;
    if (retryCurrentIndex < analysisMistakes.length) {
      loadRetryMistakeIndex(retryCurrentIndex);
    } else {
      endRetryWizard(true);
    }
  });

  function startRetryWizard() {
    isRetryMode = true;
    retryCurrentIndex = 0;
    
    retryPanel.style.display = 'flex';
    retryBtn.style.display = 'none';
    editToggleBtn.style.display = 'none';
    document.getElementById('analysis-reset').style.display = 'none';
    document.getElementById('analysis-flip').style.display = 'none';
    
    loadRetryMistakeIndex(0);
  }

  function loadRetryMistakeIndex(index) {
    const item = analysisMistakes[index];
    retryNextBtn.style.display = 'none';
    
    activeGame = new Chess(item.fenBefore);
    activeBoard.game = activeGame;
    activeBoard.orientation = activeGame.turn();
    activeBoard.clearSelection();
    activeBoard.clearDrawings();
    activeBoard.render();
    
    retryText.innerHTML = `<strong>Fehler #${index + 1}:</strong> In dieser Stellung hast du <span style="color: var(--color-blunder); font-weight: 700;">${item.playedMove}</span> gespielt.<br>Finde stattdessen den besten Zug!`;
  }

  function endRetryWizard(completedAll = false) {
    isRetryMode = false;
    retryPanel.style.display = 'none';
    editToggleBtn.style.display = 'inline-flex';
    document.getElementById('analysis-reset').style.display = 'inline-flex';
    document.getElementById('analysis-flip').style.display = 'inline-flex';
    
    if (completedAll) {
      alert("Hervorragend! Du hast alle Fehler korrigiert und die besten Fortsetzungen gefunden! 🎉");
      analysisMistakes = [];
    } else {
      triggerPositionEval('analysis');
    }
    
    initAnalysisMode();
  }

  // =============================================================
  // FEATURE 5: WEBRTC P2P MULTIPLAYER (ONLINE-DUELL)
  // =============================================================
  let peer = null;
  let conn = null;
  let myPeerId = '';
  let isHost = false;
  let onlineMyColor = 'w';
  
  let onlineHintsEnabled = false;
  let onlineEngineMovesEnabled = false;
  let onlineSyncDrawingsEnabled = true;

  const onlineStatusEl = document.getElementById('online-status');
  const onlineMyIdEl = document.getElementById('online-my-id');
  const onlineShareLinkEl = document.getElementById('online-share-link');
  const onlineTargetIdEl = document.getElementById('online-target-id');
  const onlineConnectBtn = document.getElementById('online-connect-btn');
  const onlineCopyIdBtn = document.getElementById('online-copy-id-btn');
  const onlineCopyLinkBtn = document.getElementById('online-copy-link-btn');
  const onlineHistoryList = document.getElementById('online-history-list');
  const onlineStatusBanner = document.getElementById('online-status-banner');
  const onlineRestartBtn = document.getElementById('online-restart');
  const onlineAnalysisBtn = document.getElementById('online-analysis-btn');

  const onlineHintsToggle = document.getElementById('online-hints-toggle');
  const onlineEngineMovesToggle = document.getElementById('online-engine-moves-toggle');
  const onlineSyncDrawings = document.getElementById('online-sync-drawings');

  onlineHintsToggle.addEventListener('change', (e) => {
    onlineHintsEnabled = e.target.checked;
    updateOnlinePlayAids();
  });
  onlineEngineMovesToggle.addEventListener('change', (e) => {
    onlineEngineMovesEnabled = e.target.checked;
    updateOnlinePlayAids();
  });
  onlineSyncDrawings.addEventListener('change', (e) => {
    onlineSyncDrawingsEnabled = e.target.checked;
  });

  onlineCopyIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(myPeerId);
    alert('Deine Einladungs-ID wurde kopiert!');
  });
  onlineCopyLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(onlineShareLinkEl.value);
    alert('Einladungs-Link kopiert! Sende ihn an deinen Bruder, um das Spiel zu starten.');
  });

  onlineConnectBtn.addEventListener('click', () => {
    const tid = onlineTargetIdEl.value.trim();
    if (tid) {
      connectToPeer(tid);
    }
  });

  onlineRestartBtn.addEventListener('click', () => {
    if (conn && conn.open) {
      conn.send({ type: 'rematch_request' });
      onlineStatusBanner.style.display = 'block';
      onlineStatusBanner.className = 'game-state-banner banner-win';
      onlineStatusBanner.textContent = 'Revanche-Anfrage gesendet...';
    }
  });

  onlineAnalysisBtn.addEventListener('click', () => {
    switchView('analysis');
    
    activeGame = new Chess();
    moveHistory.forEach(row => {
      if (row.w) activeGame.move(row.w);
      if (row.b) activeGame.move(row.b);
    });
    
    initAnalysisMode();
  });

  function initOnlineMode() {
    if (peer) return;
    
    onlineStatusEl.textContent = 'Verbinde mit Peer-Server...';
    peer = new Peer();
    
    peer.on('open', (id) => {
      myPeerId = id;
      onlineMyIdEl.textContent = id;
      const url = `${window.location.origin}${window.location.pathname}?join=${id}`;
      onlineShareLinkEl.value = url;
      onlineStatusEl.textContent = 'Bereit für Verbindung';
    });
    
    peer.on('connection', (connection) => {
      conn = connection;
      isHost = true;
      onlineMyColor = 'w';
      setupConnection();
    });
    
    peer.on('error', (err) => {
      console.error(err);
      onlineStatusEl.innerHTML = `<span style="color: var(--color-blunder);">Server-Verbindungsfehler</span>`;
    });

    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('join');
    if (joinId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      connectToPeer(joinId);
    }
  }

  function connectToPeer(targetId) {
    onlineStatusEl.textContent = `Verbinde mit Gegner...`;
    conn = peer.connect(targetId);
    isHost = false;
    onlineMyColor = 'b';
    setupConnection();
  }

  function setupConnection() {
    conn.on('open', () => {
      onlineStatusEl.innerHTML = `<span style="color: var(--accent); font-weight: 700;">✓ Spiel aktiv</span>`;
      document.getElementById('online-setup-box').style.display = 'none';
      startNewOnlineGame();
    });
    
    conn.on('data', (data) => {
      handleIncomingOnlineData(data);
    });
    
    conn.on('close', () => {
      onlineStatusEl.innerHTML = `<span style="color: var(--color-blunder);">Verbindung getrennt</span>`;
      document.getElementById('online-setup-box').style.display = 'flex';
      onlineRestartBtn.style.display = 'none';
      onlineAnalysisBtn.style.display = 'none';
    });
  }

  function startNewOnlineGame() {
    activeGame = new Chess();
    moveHistory = [];
    onlineStatusBanner.style.display = 'none';
    onlineRestartBtn.style.display = 'none';
    onlineAnalysisBtn.style.display = 'none';
    
    updateEvalBar('online', 50, '0.0');
    
    activeBoard = new Chessboard(document.getElementById('online-board'), {
      orientation: onlineMyColor,
      game: activeGame,
      onMove: (from, to) => {
        handleOnlineMove(from, to);
      }
    });

    activeBoard.onDrawingsChanged = (drawings) => {
      if (onlineSyncDrawingsEnabled && conn && conn.open) {
        conn.send({
          type: 'drawings_sync',
          drawings
        });
      }
    };

    renderMoveHistory(onlineHistoryList);
    updateOnlinePlayAids();
  }

  function handleOnlineMove(from, to) {
    if (activeGame.game_over()) return;
    
    const currentTurn = activeGame.turn();
    if (currentTurn !== onlineMyColor) {
      activeBoard.clearSelection();
      return;
    }

    const moveExecution = (promoPiece) => {
      const moveOpts = { from, to };
      if (promoPiece) moveOpts.promotion = promoPiece;
      
      const last = activeGame.get(to);
      const move = activeGame.move(moveOpts);
      
      if (move) {
        if (activeGame.in_check()) {
          audio.playCheck();
        } else if (last) {
          audio.playCapture();
        } else {
          audio.playMove();
        }
        
        activeBoard.setLastMove(from, to);
        activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
        activeBoard.render();
        
        addMoveToHistory(move.san);
        renderMoveHistory(onlineHistoryList);
        
        if (conn && conn.open) {
          conn.send({
            type: 'move',
            from,
            to,
            promotion: promoPiece
          });
        }
        
        checkOnlineGameStatus();
        updateOnlinePlayAids();
        triggerPositionEval('online');
      }
    };

    if (isPromotionMove(activeGame, from, to)) {
      promptPromotion(moveExecution);
    } else {
      moveExecution();
    }
  }

  function handleIncomingOnlineData(data) {
    if (data.type === 'move') {
      const last = activeGame.get(data.to);
      const move = activeGame.move({
        from: data.from,
        to: data.to,
        promotion: data.promotion
      });
      
      if (move) {
        if (activeGame.in_check()) {
          audio.playCheck();
        } else if (last) {
          audio.playCapture();
        } else {
          audio.playMove();
        }
        
        activeBoard.setLastMove(data.from, data.to);
        activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
        activeBoard.render();
        
        addMoveToHistory(move.san);
        renderMoveHistory(onlineHistoryList);
        
        checkOnlineGameStatus();
        updateOnlinePlayAids();
        triggerPositionEval('online');
      }
    }
    else if (data.type === 'drawings_sync') {
      if (onlineSyncDrawingsEnabled && activeBoard) {
        activeBoard.drawings = data.drawings;
        activeBoard.renderDrawings();
      }
    }
    else if (data.type === 'rematch_request') {
      const accept = confirm('Dein Bruder fordert Revanche! Akzeptieren?');
      if (accept) {
        conn.send({ type: 'rematch_accept' });
        startNewOnlineGame();
      }
    }
    else if (data.type === 'rematch_accept') {
      startNewOnlineGame();
    }
  }

  function checkOnlineGameStatus() {
    if (activeGame.game_over()) {
      audio.playGameOver();
      onlineStatusBanner.style.display = 'block';
      
      if (activeGame.in_checkmate()) {
        const winner = activeGame.turn() === 'w' ? 'Schwarz' : 'Weiß';
        onlineStatusBanner.className = 'game-state-banner banner-win';
        onlineStatusBanner.innerHTML = `<i data-lucide="award"></i> Matt! ${winner} gewinnt.`;
      } else {
        onlineStatusBanner.className = 'game-state-banner banner-draw';
        onlineStatusBanner.innerHTML = `<i data-lucide="help-circle"></i> Spielende durch Remis/Patt.`;
      }
      
      onlineRestartBtn.style.display = 'inline-flex';
      onlineAnalysisBtn.style.display = 'inline-flex';
      lucide.createIcons();
    }
  }

  function updateOnlinePlayAids() {
    if (!activeBoard) return;
    
    activeBoard.clearDrawings();
    
    if (onlineHintsEnabled) {
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
      const oppColor = activeGame.turn();
      const myCol = oppColor === 'w' ? 'b' : 'w';
      
      files.forEach(f => {
        ranks.forEach(r => {
          const sq = f + r;
          const piece = activeGame.get(sq);
          if (piece && piece.color === myCol) {
            if (activeGame.attacked(oppColor, sq)) {
              activeBoard.drawings.circles[sq] = 'red';
            }
          }
        });
      });
    }

    if (onlineEngineMovesEnabled && !activeGame.game_over()) {
      engine.getBestMove(activeGame.fen(), 4, true).then(bestMove => {
        if (bestMove && onlineEngineMovesEnabled) {
          const from = bestMove.substring(0, 2);
          const to = bestMove.substring(2, 4);
          activeBoard.aidArrows.push({ from, to, color: 'green' });
          activeBoard.renderDrawings();
        }
      });
    }
    
    activeBoard.renderHighlights();
    activeBoard.renderDrawings();
  }

  // =============================================================
  // KEYBOARD MOVE INPUT HANDLERS (KONSOLEN-EINGABE)
  // =============================================================
  const playKeyboardInput = document.getElementById('play-keyboard-input');
  const playKeyboardSubmit = document.getElementById('play-keyboard-submit');
  const playKeyboardFeedback = document.getElementById('play-keyboard-feedback');

  function submitPlayKeyboardMove() {
    playKeyboardFeedback.style.display = 'none';
    const text = playKeyboardInput.value.trim();
    if (!text) return;

    const myTurn = activeGame.turn();
    if (playBotColor !== 'both' && myTurn === playBotColor) {
      playKeyboardFeedback.textContent = "Der Computer ist am Zug!";
      playKeyboardFeedback.style.display = 'block';
      return;
    }

    let move = null;
    try {
      move = activeGame.move(text);
    } catch(e) {}

    if (!move && text.length >= 4) {
      const from = text.substring(0, 2);
      const to = text.substring(2, 4);
      const promo = text.length > 4 ? text.charAt(4) : undefined;
      try {
        move = activeGame.move({ from, to, promotion: promo });
      } catch(e) {}
    }

    if (move) {
      playKeyboardInput.value = '';
      audio.playMove();
      activeBoard.setLastMove(move.from, move.to);
      activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
      activeBoard.render();
      
      addMoveToHistory(move.san);
      renderMoveHistory(playHistoryList);
      checkGameStatus(playStatusBanner);
      updatePlayAids();
      triggerPositionEval('play');

      if (playBotColor !== 'both' && !activeGame.game_over()) {
        setTimeout(triggerBotMove, 600);
      }
    } else {
      playKeyboardFeedback.textContent = "Ungültiger Zug! Versuche e.g. e4, Nf3, e2e4";
      playKeyboardFeedback.style.display = 'block';
    }
  }

  playKeyboardSubmit.addEventListener('click', submitPlayKeyboardMove);
  playKeyboardInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitPlayKeyboardMove();
  });

  const analysisKeyboardInput = document.getElementById('analysis-keyboard-input');
  const analysisKeyboardSubmit = document.getElementById('analysis-keyboard-submit');
  const analysisKeyboardFeedback = document.getElementById('analysis-keyboard-feedback');

  function submitAnalysisKeyboardMove() {
    analysisKeyboardFeedback.style.display = 'none';
    const text = analysisKeyboardInput.value.trim();
    if (!text) return;

    if (isRetryMode) {
      analysisKeyboardFeedback.textContent = "Zug über das Brett ziehen, um Fehler zu korrigieren!";
      analysisKeyboardFeedback.style.display = 'block';
      return;
    }

    let move = null;
    const fenBefore = activeGame.fen();
    try {
      move = activeGame.move(text);
    } catch(e) {}

    if (!move && text.length >= 4) {
      const from = text.substring(0, 2);
      const to = text.substring(2, 4);
      const promo = text.length > 4 ? text.charAt(4) : undefined;
      try {
        move = activeGame.move({ from, to, promotion: promo });
      } catch(e) {}
    }

    if (move) {
      analysisKeyboardInput.value = '';
      audio.playMove();
      activeBoard.setLastMove(move.from, move.to);
      activeBoard.setCheckSquare(activeGame.in_check() ? getKingSquare(activeGame, activeGame.turn()) : null);
      activeBoard.render();
      
      addMoveToHistory(move.san);
      renderMoveHistory(analysisHistoryList);
      
      evaluateAndClassifyMove(fenBefore, move.san);
    } else {
      analysisKeyboardFeedback.textContent = "Ungültiger Zug! Versuche e.g. e4, Nf3, e2e4";
      analysisKeyboardFeedback.style.display = 'block';
    }
  }

  analysisKeyboardSubmit.addEventListener('click', submitAnalysisKeyboardMove);
  analysisKeyboardInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAnalysisKeyboardMove();
  });

  // Kickstart default view
  switchView('play');
});
