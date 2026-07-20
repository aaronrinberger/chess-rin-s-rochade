/**
 * Chessboard.js - Custom Interactive Chessboard Component
 * Renders an 8x8 chess grid with smooth drag-and-drop, valid move previews,
 * check/last move highlights, and a right-click drawing canvas for arrows/circles.
 */
class Chessboard {
  /**
   * @param {HTMLElement} container - The element to render the board inside
   * @param {Object} options - Configuration options
   * @param {string} options.orientation - 'w' (White) or 'b' (Black) perspective
   * @param {Function} options.onMove - Callback when player makes a valid move (e.g., (from, to) => {})
   * @param {Object} options.game - Chess.js instance
   */
  constructor(container, options = {}) {
    this.container = container;
    this.orientation = options.orientation || 'w';
    this.playerColor = options.playerColor || null; // null = allow whoever's turn it is
    this.onMove = options.onMove || (() => {});
    this.game = options.game;
    
    this.selectedSquare = null;
    this.validMoves = [];
    this.lastMove = null; // { from, to }
    this.checkSquare = null;
    this.hangingSquares = [];
    this.spaceControl = {};
    
    // Right-click drawing layers
    this.drawings = {
      circles: {}, // square -> color
      arrows: []   // array of { from, to, color }
    };
    this.tempArrow = null; // { from, to, color }
    this.aidArrows = []; // assistance/learning aid arrows (opponent threats, engine hints)
    this.isRightDragging = false;
    this.rightStartSquare = null;
    
    // Drag and drop tracking
    this.isDragging = false;
    this.draggedPiece = null;
    this.draggedFromSquare = null;
    this.dragGhost = null;

    // Standard high-quality vector chess piece images (Wikimedia Commons)
    this.pieceUrls = {
      'wP': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
      'wN': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
      'wB': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
      'wR': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
      'wQ': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
      'wK': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
      'bP': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
      'bN': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
      'bB': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
      'bR': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
      'bQ': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
      'bK': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
    };

    // Color definitions for drawings (colors matching Chess.com)
    this.colors = {
      green: '#3ba146',
      red: '#eb4034',
      blue: '#3b86a1',
      orange: '#f59b22'
    };

    this.initDOM();
    this.bindEvents();
    this.render();
  }

  initDOM() {
    this.container.innerHTML = '';
    this.container.classList.add('chessboard-container');
    
    // Apply board design theme from localStorage automatically
    const savedTheme = localStorage.getItem('chess_board_theme') || 'classic';
    if (savedTheme === 'walnut') {
      this.container.classList.add('theme-walnut');
    } else {
      this.container.classList.remove('theme-walnut');
    }
    
    // Create the board grid
    this.boardEl = document.createElement('div');
    this.boardEl.classList.add('chessboard-grid');
    this.container.appendChild(this.boardEl);

    // Create the SVG drawing canvas layer
    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgEl.classList.add('chessboard-svg-overlay');
    this.svgEl.setAttribute('viewBox', '0 0 100 100');
    
    // Add markers for arrowheads
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    Object.keys(this.colors).forEach(colorName => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `arrowhead-${colorName}`);
      marker.setAttribute('markerWidth', '4');
      marker.setAttribute('markerHeight', '4');
      marker.setAttribute('refX', '2');
      marker.setAttribute('refY', '2');
      marker.setAttribute('orient', 'auto');
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '0 0, 4 2, 0 4');
      polygon.setAttribute('fill', this.colors[colorName]);
      polygon.setAttribute('opacity', '0.75');
      
      marker.appendChild(polygon);
      defs.appendChild(marker);
    });
    this.svgEl.appendChild(defs);
    this.boardEl.appendChild(this.svgEl);
  }

  setOrientation(orient) {
    if (this.orientation !== orient) {
      this.orientation = orient;
      this.clearSelection();
      this.render();
    }
  }

  flip() {
    this.setOrientation(this.orientation === 'w' ? 'b' : 'w');
  }

  getSquareFromCoord(clientX, clientY) {
    const rect = this.boardEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

    let col = Math.floor((x / rect.width) * 8);
    let row = Math.floor((y / rect.height) * 8);

    if (this.orientation === 'b') {
      col = 7 - col;
      row = 7 - row;
    } else {
      row = 7 - row; // White orientation: 8th row is top
    }

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    if (col >= 0 && col < 8 && row >= 0 && row < 8) {
      return files[col] + ranks[row];
    }
    return null;
  }

  getSquareCenterPercent(square) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    let col = files.indexOf(square[0]);
    let row = ranks.indexOf(square[1]);

    if (this.orientation === 'b') {
      col = 7 - col;
      row = 7 - row;
    } else {
      row = 7 - row;
    }

    return {
      x: (col + 0.5) * 12.5,
      y: (row + 0.5) * 12.5
    };
  }

  bindEvents() {
    // Disable right click context menu on the board
    this.boardEl.addEventListener('contextmenu', e => e.preventDefault());

    this.boardEl.addEventListener('pointerdown', e => {
      // Left Click: Drag piece or select
      if (e.button === 0) {
        this.clearDrawings();
        const sq = this.getSquareFromCoord(e.clientX, e.clientY);
        if (!sq) return;

        if (this.onClick) {
          this.onClick(sq);
          return;
        }

        const piece = this.game.get(sq);
        // Allow dragging only own pieces when playerColor is set (online mode),
        // otherwise allow whoever's turn it is (local/analysis modes).
        const allowedColor = this.playerColor || this.game.turn();
        if (piece && piece.color === allowedColor && piece.color === this.game.turn()) {
          this.isDragging = true;
          this.draggedFromSquare = sq;
          this.draggedPiece = piece;
          this.selectedSquare = sq;
          
          // Fetch possible moves
          this.validMoves = this.game.moves({ square: sq, verbose: true });
          
          this.createDragGhost(piece, e.clientX, e.clientY);
          this.renderHighlights();
        } else {
          this.clearSelection();
        }
      }
      
      // Right Click: Drawing arrows / circles
      else if (e.button === 2) {
        const sq = this.getSquareFromCoord(e.clientX, e.clientY);
        if (sq) {
          this.isRightDragging = true;
          this.rightStartSquare = sq;
        }
      }
    });

    window.addEventListener('pointermove', e => {
      if (this.isDragging && this.dragGhost) {
        this.updateDragGhost(e.clientX, e.clientY);
      }
      else if (this.isRightDragging && this.rightStartSquare) {
        const currentSq = this.getSquareFromCoord(e.clientX, e.clientY);
        if (currentSq && currentSq !== this.rightStartSquare) {
          const color = this.getDrawingColorFromEvent(e);
          this.tempArrow = { from: this.rightStartSquare, to: currentSq, color };
          this.renderDrawings();
        } else {
          this.tempArrow = null;
          this.renderDrawings();
        }
      }
    });

    window.addEventListener('pointerup', e => {
      // Left click release
      if (e.button === 0 && this.isDragging) {
        this.isDragging = false;
        this.removeDragGhost();
        
        const targetSq = this.getSquareFromCoord(e.clientX, e.clientY);
        if (targetSq && targetSq !== this.draggedFromSquare && this.validMoves.some(m => m.to === targetSq)) {
          // Trigger move
          this.onMove(this.draggedFromSquare, targetSq);
        } else {
          // Snap back
          this.clearSelection();
        }
      }
      
      // Right click release
      else if (e.button === 2 && this.isRightDragging) {
        this.isRightDragging = false;
        const currentSq = this.getSquareFromCoord(e.clientX, e.clientY);
        
        if (currentSq) {
          const color = this.getDrawingColorFromEvent(e);
          if (currentSq === this.rightStartSquare) {
            // Toggle circle
            if (this.drawings.circles[currentSq] === color) {
              delete this.drawings.circles[currentSq];
            } else {
              this.drawings.circles[currentSq] = color;
            }
          } else {
            // Add/Toggle Arrow
            const arrowIndex = this.drawings.arrows.findIndex(
              a => a.from === this.rightStartSquare && a.to === currentSq
            );
            if (arrowIndex !== -1) {
              if (this.drawings.arrows[arrowIndex].color === color) {
                this.drawings.arrows.splice(arrowIndex, 1);
              } else {
                this.drawings.arrows[arrowIndex].color = color;
              }
            } else {
              this.drawings.arrows.push({
                from: this.rightStartSquare,
                to: currentSq,
                color
              });
            }
          }
        }
        
        this.tempArrow = null;
        this.rightStartSquare = null;
        this.renderDrawings();
        if (this.onDrawingsChanged) {
          this.onDrawingsChanged(this.drawings);
        }
      }
    });
  }

  getDrawingColorFromEvent(e) {
    if (e.shiftKey) return 'red';
    if (e.altKey) return 'blue';
    if (e.ctrlKey) return 'orange';
    return 'green'; // Default
  }

  clearSelection() {
    this.selectedSquare = null;
    this.validMoves = [];
    this.renderHighlights();
  }

  clearDrawings() {
    this.drawings.circles = {};
    this.drawings.arrows = [];
    this.aidArrows = [];
    this.tempArrow = null;
    this.renderDrawings();
    if (this.onDrawingsChanged) {
      this.onDrawingsChanged(this.drawings);
    }
  }

  createDragGhost(piece, clientX, clientY) {
    this.removeDragGhost();
    
    const ghost = document.createElement('div');
    ghost.classList.add('chessboard-drag-ghost');
    
    const code = piece.color + piece.type.toUpperCase();
    ghost.style.backgroundImage = `url(${this.pieceUrls[code]})`;
    
    // Size it relative to board square size
    const sqEl = this.boardEl.querySelector('.board-square');
    if (sqEl) {
      const rect = sqEl.getBoundingClientRect();
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
    }
    
    document.body.appendChild(ghost);
    this.dragGhost = ghost;
    this.updateDragGhost(clientX, clientY);
  }

  updateDragGhost(clientX, clientY) {
    if (this.dragGhost) {
      this.dragGhost.style.left = `${clientX - this.dragGhost.clientWidth / 2}px`;
      this.dragGhost.style.top = `${clientY - this.dragGhost.clientHeight / 2}px`;
    }
  }

  removeDragGhost() {
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  setLastMove(from, to) {
    this.lastMove = { from, to };
    this.renderHighlights();
  }

  setCheckSquare(sq) {
    this.checkSquare = sq;
    this.renderHighlights();
  }

  render() {
    // Clear all except SVG overlay defs
    const squares = this.boardEl.querySelectorAll('.board-square');
    squares.forEach(s => s.remove());

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    // If White: start from rank 8, col a (top left).
    // If Black: start from rank 1, col h (top left).
    const rankOrder = this.orientation === 'w' ? [...ranks].reverse() : ranks;
    const fileOrder = this.orientation === 'w' ? files : [...files].reverse();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sqName = fileOrder[c] + rankOrder[r];
        const isDark = (c + r) % 2 === 1;

        const sqEl = document.createElement('div');
        sqEl.classList.add('board-square');
        sqEl.classList.add(isDark ? 'dark-sq' : 'light-sq');
        sqEl.dataset.square = sqName;
        sqEl.style.gridArea = `${r + 1} / ${c + 1}`;

        // Add coordinate numbers on left edge
        if (c === 0) {
          const coordNum = document.createElement('span');
          coordNum.classList.add('board-coord', 'coord-num');
          coordNum.textContent = rankOrder[r];
          sqEl.appendChild(coordNum);
        }

        // Add coordinate letters on bottom edge
        if (r === 7) {
          const coordLetter = document.createElement('span');
          coordLetter.classList.add('board-coord', 'coord-letter');
          coordLetter.textContent = fileOrder[c];
          sqEl.appendChild(coordLetter);
        }

        // Get piece from chess.js
        const piece = this.game.get(sqName);
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.classList.add('chess-piece');
          const code = piece.color + piece.type.toUpperCase();
          pieceEl.style.backgroundImage = `url(${this.pieceUrls[code]})`;
          sqEl.appendChild(pieceEl);
        }

        this.boardEl.appendChild(sqEl);
      }
    }

    this.renderHighlights();
    this.renderDrawings();
  }

  renderHighlights() {
    const squares = this.boardEl.querySelectorAll('.board-square');
    
    squares.forEach(sqEl => {
      const sqName = sqEl.dataset.square;
      
      // Clean up previous highlights
      sqEl.classList.remove(
        'selected-sq', 'last-move-sq', 'check-sq', 'valid-dest-sq', 'valid-capture-sq',
        'hanging-sq', 'space-control-w', 'space-control-b', 'space-control-both'
      );
      
      // Clear valid move dots
      const dot = sqEl.querySelector('.valid-move-indicator');
      if (dot) dot.remove();

      // Check square highlight (red glow)
      if (sqName === this.checkSquare) {
        sqEl.classList.add('check-sq');
      }

      // Hanging square highlight
      if (this.hangingSquares && this.hangingSquares.includes(sqName)) {
        sqEl.classList.add('hanging-sq');
      }

      // Space control highlight
      if (this.spaceControl && this.spaceControl[sqName]) {
        sqEl.classList.add(`space-control-${this.spaceControl[sqName]}`);
      }

      // Selected square highlight
      if (sqName === this.selectedSquare) {
        sqEl.classList.add('selected-sq');
      }

      // Last move highlight
      if (this.lastMove && (sqName === this.lastMove.from || sqName === this.lastMove.to)) {
        sqEl.classList.add('last-move-sq');
      }

      // Valid move highlighting
      const validMove = this.validMoves.find(m => m.to === sqName);
      if (validMove && (!this.isDragging || this.draggedFromSquare !== sqName)) {
        const indicator = document.createElement('div');
        indicator.classList.add('valid-move-indicator');
        
        if (validMove.captured) {
          sqEl.classList.add('valid-capture-sq');
        } else {
          sqEl.classList.add('valid-dest-sq');
          indicator.classList.add('move-dot');
        }
        
        sqEl.appendChild(indicator);
      }
    });
  }

  renderDrawings() {
    // Keep only defs
    const children = Array.from(this.svgEl.childNodes);
    children.forEach(node => {
      if (node.tagName !== 'defs') {
        this.svgEl.removeChild(node);
      }
    });

    // Draw circles
    Object.entries(this.drawings.circles).forEach(([sq, colorName]) => {
      const center = this.getSquareCenterPercent(sq);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', center.x);
      circle.setAttribute('cy', center.y);
      circle.setAttribute('r', '5'); // Radius: 5% of board
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', this.colors[colorName]);
      circle.setAttribute('stroke-width', '0.8');
      circle.setAttribute('opacity', '0.75');
      this.svgEl.appendChild(circle);
    });

    // Draw permanent arrows
    this.drawings.arrows.forEach(arrow => {
      this.drawArrowElement(arrow.from, arrow.to, arrow.color);
    });

    // Draw aid/assistance arrows (opponent threats, engine suggestions)
    if (this.aidArrows) {
      this.aidArrows.forEach(arrow => {
        this.drawArrowElement(arrow.from, arrow.to, arrow.color);
      });
    }

    // Draw active temporary drag arrow
    if (this.tempArrow) {
      this.drawArrowElement(this.tempArrow.from, this.tempArrow.to, this.tempArrow.color, true);
    }
  }

  drawArrowElement(from, to, colorName, isTemp = false) {
    const start = this.getSquareCenterPercent(from);
    const end = this.getSquareCenterPercent(to);
    
    // Compute direction vector
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return;

    // Shorten arrow slightly so it does not cover the target square center too much
    const shortenOffset = 3.5; // percent of board
    const endX = end.x - (dx / len) * shortenOffset;
    const endY = end.y - (dy / len) * shortenOffset;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', this.colors[colorName]);
    line.setAttribute('stroke-width', '1.6');
    line.setAttribute('opacity', isTemp ? '0.5' : '0.75');
    line.setAttribute('marker-end', `url(#arrowhead-${colorName})`);
    
    this.svgEl.appendChild(line);
  }
}

// Export for browser
window.Chessboard = Chessboard;
