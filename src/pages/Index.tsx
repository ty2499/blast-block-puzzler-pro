import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Star, Gift, Lightbulb } from 'lucide-react';

const BlockPuzzleGame = () => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState(() => Array(10).fill(null).map(() => Array(10).fill(0)));
  const [currentPieces, setCurrentPieces] = useState([]);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [coins, setCoins] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showAdModal, setShowAdModal] = useState(false);
  const [blocksPlaced, setBlocksPlaced] = useState(0);
  const [clearedCells, setClearedCells] = useState(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [comboCount, setComboCount] = useState(0);

  // Beautiful color palette: purple, blue, green, yellow, orange, red
  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#F97316', '#EF4444'];

  // Generate proper piece shapes with correct sizes
  const generatePieceShapes = () => {
    const shapes = [
      // 1 cell
      [[1]],
      
      // 2 cells
      [[1, 1]], 
      [[1], [1]], 
      
      // 3 cells - including max vertical
      [[1, 1, 1]], 
      [[1], [1], [1]], // Max 3 vertical blocks
      [[1, 1], [1, 0]], 
      [[1, 0], [1, 1]], 
      
      // 4 cells
      [[1, 1], [1, 1]], // Square
      [[1, 1, 1, 1]], // Line
      [[1, 1, 1], [1, 0, 0]], // L-shape
      [[1, 0, 0], [1, 1, 1]], // Reverse L
      [[0, 1, 0], [1, 1, 1]], // T-shape
      [[1, 1, 0], [0, 1, 1]], // Z-shape
      [[0, 1, 1], [1, 1, 0]], // S-shape
      
      // 5 cells
      [[1, 1, 1, 1, 1]], // Long line
      [[1, 1, 1], [0, 1, 0], [0, 1, 0]], // Plus
      [[1, 0, 1], [1, 1, 1]], // U-shape
      [[1, 1, 1, 1], [1, 0, 0, 0]], // Large L
    ];
    
    return shapes;
  };

  // Generate 3 random pieces
  const generatePieces = () => {
    const pieces = [];
    const availableShapes = generatePieceShapes();
    
    for (let i = 0; i < 3; i++) {
      const shape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      pieces.push({
        id: Date.now() + i + Math.random(),
        shape: shape,
        color: color,
        used: false
      });
    }
    return pieces;
  };

  // Initialize game
  useEffect(() => {
    setCurrentPieces(generatePieces());
    const saved = localStorage.getItem('blockPuzzleCoins');
    if (saved) setCoins(parseInt(saved));
  }, []);

  // Check for complete lines (rows and columns)
  const checkForCompleteLines = (newGrid) => {
    const linesToClear = [];
    
    // Check rows
    for (let row = 0; row < 10; row++) {
      if (newGrid[row].every(cell => cell !== 0)) {
        for (let col = 0; col < 10; col++) {
          linesToClear.push(`${row}-${col}`);
        }
      }
    }
    
    // Check columns
    for (let col = 0; col < 10; col++) {
      if (newGrid.every(row => row[col] !== 0)) {
        for (let row = 0; row < 10; row++) {
          linesToClear.push(`${row}-${col}`);
        }
      }
    }
    
    return Array.from(new Set(linesToClear)); // Remove duplicates
  };

  // Clear completed lines with animation
  const clearLines = async (newGrid) => {
    const linesToClear = checkForCompleteLines(newGrid);
    
    if (linesToClear.length === 0) return newGrid;
    
    setIsClearing(true);
    setClearedCells(new Set(linesToClear));
    
    // Wait for blast animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Calculate cleared blocks and bonus
    const clearedBlocks = linesToClear.length;
    const linesCleared = Math.min(
      new Set(linesToClear.map(pos => pos.split('-')[0])).size + // rows
      new Set(linesToClear.map(pos => pos.split('-')[1])).size   // columns
    , 20); // Max possible lines
    
    // Line clear bonus
    const lineBonus = linesCleared * 100 * level;
    const blockBonus = clearedBlocks * 50;
    const comboBonus = comboCount > 0 ? comboCount * 200 : 0;
    
    setScore(prev => prev + lineBonus + blockBonus + comboBonus);
    setComboCount(prev => prev + 1);
    
    // Clear the lines
    const clearedGrid = newGrid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (linesToClear.includes(`${rowIndex}-${colIndex}`)) {
          return 0;
        }
        return cell;
      })
    );
    
    setClearedCells(new Set());
    setIsClearing(false);
    
    // Check for more lines after clearing
    const nextLinesToClear = checkForCompleteLines(clearedGrid);
    if (nextLinesToClear.length > 0) {
      return await clearLines(clearedGrid);
    } else {
      setComboCount(0);
      return clearedGrid;
    }
  };

  // Check if piece can be placed at specific position
  const canPlacePieceAt = (piece, startRow, startCol) => {
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col] === 1) {
          const newRow = startRow + row;
          const newCol = startCol + col;
          
          if (newRow >= 10 || newCol >= 10 || newRow < 0 || newCol < 0) {
            return false;
          }
          
          if (grid[newRow][newCol] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Find the closest valid position for a piece
  const findClosestValidPosition = (piece, targetRow, targetCol) => {
    let bestPosition = null;
    let minDistance = Infinity;

    // Check all possible positions
    for (let row = 0; row <= 10 - piece.shape.length; row++) {
      for (let col = 0; col <= 10 - piece.shape[0].length; col++) {
        if (canPlacePieceAt(piece, row, col)) {
          // Calculate distance from target position
          const distance = Math.abs(row - targetRow) + Math.abs(col - targetCol);
          if (distance < minDistance) {
            minDistance = distance;
            bestPosition = { row, col };
          }
        }
      }
    }

    return bestPosition;
  };

  // Place piece on grid
  const placePieceAt = async (piece, startRow, startCol) => {
    const newGrid = [...grid];
    let blocksAdded = 0;
    
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col] === 1) {
          newGrid[startRow + row][startCol + col] = piece.color;
          blocksAdded++;
        }
      }
    }
    
    // Mark piece as used
    setCurrentPieces(prev => 
      prev.map(p => p.id === piece.id ? { ...p, used: true } : p)
    );
    
    // Add score for placing piece
    const baseScore = blocksAdded * 10;
    const levelBonus = level * 5;
    setScore(prev => prev + baseScore + levelBonus);
    setBlocksPlaced(prev => prev + blocksAdded);

    // Check for line clears
    const clearedGrid = await clearLines(newGrid);
    setGrid(clearedGrid);

    // Check for level up when grid is cleared
    const totalBlocks = clearedGrid.flat().filter(cell => cell !== 0).length;
    
    // Level up when all blocks are cleared
    if (totalBlocks === 0) {
      setLevelUpAnimation(true);
      setLevel(prev => prev + 1);
      setCoins(prev => {
        const newCoins = prev + 5;
        localStorage.setItem('blockPuzzleCoins', newCoins.toString());
        return newCoins;
      });
      setScore(prev => prev + (level * 1000)); // Level completion bonus
      setTimeout(() => setLevelUpAnimation(false), 2000);
    }
  };

  // Enhanced drag and drop
  const [draggedPiecePosition, setDraggedPiecePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [snapPosition, setSnapPosition] = useState(null);

  // Handle piece drag start
  const handlePieceStart = (e, piece) => {
    if (piece.used) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    
    setDraggedPiece(piece);
    setIsDragging(true);
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top
    });
    setDraggedPiecePosition({ x: clientX, y: clientY });
    e.preventDefault();
  };

  // Handle drag move with smart snapping
  const handleDragMove = (e) => {
    if (!isDragging || !draggedPiece) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setDraggedPiecePosition({ x: clientX, y: clientY });
    
    // Find snap position
    const gridElement = document.querySelector('.game-grid');
    if (gridElement) {
      const gridRect = gridElement.getBoundingClientRect();
      const cellSize = gridRect.width / 10;
      const targetCol = Math.floor((clientX - gridRect.left) / cellSize);
      const targetRow = Math.floor((clientY - gridRect.top) / cellSize);
      
      if (targetRow >= 0 && targetRow < 10 && targetCol >= 0 && targetCol < 10) {
        // Find closest valid position
        const validPosition = findClosestValidPosition(draggedPiece, targetRow, targetCol);
        if (validPosition) {
          setSnapPosition(validPosition);
        } else {
          setSnapPosition(null);
        }
      } else {
        setSnapPosition(null);
      }
    }
    
    e.preventDefault();
  };

  // Handle drag end - snap to closest valid position
  const handleDragEnd = (e) => {
    if (!isDragging || !draggedPiece) return;
    
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    // Check if over grid
    const gridElement = document.querySelector('.game-grid');
    if (gridElement) {
      const gridRect = gridElement.getBoundingClientRect();
      
      if (clientX >= gridRect.left && clientX <= gridRect.right &&
          clientY >= gridRect.top && clientY <= gridRect.bottom) {
        
        const cellSize = gridRect.width / 10;
        const targetCol = Math.floor((clientX - gridRect.left) / cellSize);
        const targetRow = Math.floor((clientY - gridRect.top) / cellSize);
        
        // Find and place at closest valid position
        const validPosition = findClosestValidPosition(draggedPiece, targetRow, targetCol);
        if (validPosition) {
          placePieceAt(draggedPiece, validPosition.row, validPosition.col);
        }
      }
    }
    
    setDraggedPiece(null);
    setIsDragging(false);
    setDraggedPiecePosition({ x: 0, y: 0 });
    setSnapPosition(null);
  };

  // Add event listeners for drag
  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e);
    const handleMouseUp = (e) => handleDragEnd(e);
    const handleTouchMove = (e) => handleDragMove(e);
    const handleTouchEnd = (e) => handleDragEnd(e);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, draggedPiece]);

  // Check if any piece can be placed
  const canAnyPieceBePlaced = () => {
    const availablePieces = currentPieces.filter(p => !p.used);
    for (let piece of availablePieces) {
      for (let row = 0; row <= 10 - piece.shape.length; row++) {
        for (let col = 0; col <= 10 - (piece.shape[0]?.length || 0); col++) {
          if (canPlacePieceAt(piece, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Game state management
  useEffect(() => {
    const availablePieces = currentPieces.filter(p => !p.used);
    
    // Generate new pieces when all are used
    if (availablePieces.length === 0) {
      setTimeout(() => {
        setCurrentPieces(generatePieces());
      }, 300);
      return;
    }
    
    // Check game over only if no pieces can be placed
    if (!canAnyPieceBePlaced()) {
      setGameOver(true);
    }
  }, [currentPieces, grid]);

  // Handle hint button
  const handleHint = () => {
    if (hintsRemaining > 0) {
      setShowAdModal(true);
    }
  };

  // Watch ad for hint
  const watchAd = () => {
    setTimeout(() => {
      setShowAdModal(false);
      setHintsRemaining(prev => prev - 1);
      
      // Find and highlight a possible move
      const availablePieces = currentPieces.filter(p => !p.used);
      for (let piece of availablePieces) {
        for (let row = 0; row <= 10 - piece.shape.length; row++) {
          for (let col = 0; col <= 10 - (piece.shape[0]?.length || 0); col++) {
            if (canPlacePieceAt(piece, row, col)) {
              alert(`Hint: Try placing the ${piece.shape.flat().filter(c => c === 1).length}-block piece near row ${row + 1}, column ${col + 1}!`);
              return;
            }
          }
        }
      }
    }, 3000);
  };

  // Reset game
  const resetGame = () => {
    setGrid(Array(10).fill(null).map(() => Array(10).fill(0)));
    setCurrentPieces(generatePieces());
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setHintsRemaining(3);
    setBlocksPlaced(0);
    setClearedCells(new Set());
    setIsClearing(false);
    setComboCount(0);
    setLevelUpAnimation(false);
  };

  // Check if grid cell should show snap preview
  const shouldShowSnapPreview = (row, col) => {
    if (!snapPosition || !draggedPiece || !isDragging) return false;
    
    const pieceRow = row - snapPosition.row;
    const pieceCol = col - snapPosition.col;
    
    if (pieceRow >= 0 && pieceRow < draggedPiece.shape.length &&
        pieceCol >= 0 && pieceCol < draggedPiece.shape[0].length) {
      return draggedPiece.shape[pieceRow][pieceCol] === 1;
    }
    return false;
  };

  const filledCells = grid.flat().filter(cell => cell !== 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Level Up Animation */}
        {levelUpAnimation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl transform animate-bounce">
              <div className="text-center">
                <div className="text-3xl font-bold">🎉 LEVEL UP! 🎉</div>
                <div className="text-xl mt-2">Level {level}</div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-black/50 to-gray-900/50 backdrop-blur-md rounded-2xl p-6 mb-4 border border-white/20 shadow-2xl">
          <div className="flex justify-between items-center text-white">
            <div className="text-center">
              <div className="text-xs opacity-80">Score</div>
              <div className="font-bold text-lg">{score.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-80">Coins</div>
              <div className="font-bold text-yellow-400 flex items-center gap-1">
                🪙 {coins}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-80">Level</div>
              <div className={`font-bold text-2xl ${levelUpAnimation ? 'animate-pulse text-yellow-400' : 'text-green-400'}`}>
                {level}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-80">Hints</div>
              <div className="font-bold text-green-400">{hintsRemaining}</div>
            </div>
          </div>
          
          {/* Combo indicator */}
          {comboCount > 0 && (
            <div className="mt-2 text-center">
              <div className="text-yellow-400 font-bold animate-pulse">
                🔥 COMBO x{comboCount} 🔥
              </div>
            </div>
          )}
        </div>

        {/* Game Grid */}
        <div className="bg-gradient-to-br from-black/50 to-gray-900/60 backdrop-blur-md rounded-2xl p-6 mb-4 border border-white/20 shadow-2xl">
          <div className="game-grid grid grid-cols-10 gap-2 bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700 shadow-inner">
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isCleared = clearedCells.has(cellKey);
                
                return (
                  <div
                    key={cellKey}
                    className={`w-8 h-8 rounded-lg border-2 transition-all duration-300 ${
                      cell === 0 ? 'bg-gray-700 border-gray-600' : 'border-gray-400'
                    } ${shouldShowSnapPreview(rowIndex, colIndex) ? 'ring-2 ring-green-400' : ''}
                    ${isCleared ? 'animate-ping bg-yellow-400' : ''}`}
                    style={{
                      backgroundColor: cell !== 0 
                        ? isCleared 
                          ? '#FCD34D'
                          : cell 
                        : shouldShowSnapPreview(rowIndex, colIndex) 
                          ? `${draggedPiece?.color}60`
                          : '',
                      boxShadow: cell !== 0 && !isCleared ? 'inset 0 1px 2px rgba(255,255,255,0.2)' : '',
                      border: cell === '#FFFFFF' ? '1px solid #CBD5E0' : '',
                      transform: isCleared ? 'scale(1.2)' : 'scale(1)',
                      zIndex: isCleared ? 10 : 'auto'
                    }}
                  />
                );
              })
            )}
          </div>
          
          {/* Game Info */}
          <div className="mt-3">
            <div className="flex justify-between text-white text-xs mb-2">
              <span>Clear rows & columns to score!</span>
              <span>{filledCells}/100 blocks</span>
            </div>
            <div className="text-center text-white text-xs mb-2">
              Next Level: {Math.max(0, ((Math.floor(score / 5000) + 1) * 5000) - score).toLocaleString()} points
            </div>
          </div>
        </div>

        {/* Current Pieces */}
        <div className="bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-md rounded-xl p-6 mb-4 border border-white/10 shadow-xl">
          <div className="flex justify-around items-center">
            {currentPieces.map((piece) => (
              <div
                key={piece.id}
                className={`cursor-pointer transition-all duration-200 select-none p-2 rounded-lg ${
                  piece.used 
                    ? 'opacity-30' 
                    : 'hover:scale-110 active:scale-95 hover:bg-white/10'
                }`}
                onMouseDown={(e) => handlePieceStart(e, piece)}
                onTouchStart={(e) => handlePieceStart(e, piece)}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                <div className="grid gap-1">
                  {piece.shape.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1">
                      {row.map((cell, colIndex) => (
                        <div
                          key={colIndex}
                          className={`w-4 h-4 rounded-sm ${
                            cell === 1 ? 'shadow-lg' : ''
                          }`}
                          style={{
                            backgroundColor: cell === 1 ? piece.color : 'transparent',
                            boxShadow: cell === 1 ? 'inset 0 1px 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.2)' : '',
                            border: cell === 1 && piece.color === '#FFFFFF' ? '1px solid #CBD5E0' : 'none'
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dragged Piece Overlay */}
        {isDragging && draggedPiece && (
          <div
            className="fixed pointer-events-none z-50 opacity-90"
            style={{
              left: draggedPiecePosition.x - dragOffset.x,
              top: draggedPiecePosition.y - dragOffset.y,
              transform: 'scale(1.2) rotate(3deg)',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))'
            }}
          >
            <div className="grid gap-1">
              {draggedPiece.shape.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((cell, colIndex) => (
                    <div
                      key={colIndex}
                      className={`w-4 h-4 rounded-sm ${
                        cell === 1 ? 'shadow-lg' : ''
                      }`}
                      style={{
                        backgroundColor: cell === 1 ? draggedPiece.color : 'transparent',
                        boxShadow: cell === 1 ? 'inset 0 1px 2px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.4)' : '',
                        border: cell === 1 && draggedPiece.color === '#FFFFFF' ? '2px solid #CBD5E0' : 'none'
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={handleHint}
            disabled={hintsRemaining === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              hintsRemaining > 0
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Hint</span>
          </button>
          
          <button
            onClick={resetGame}
            className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* Ad Modal */}
        {showAdModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
              <h3 className="text-xl font-bold mb-4 text-center">Watch Ad for Hint</h3>
              <div className="bg-gray-200 h-40 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">📺</div>
                  <div className="text-sm text-gray-600">Watching Ad...</div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAdModal(false)}
                  className="flex-1 py-2 bg-gray-500 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={watchAd}
                  className="flex-1 py-2 bg-green-500 text-white rounded-lg font-semibold"
                >
                  Watch Ad
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameOver && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">Game Over!</h3>
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">{score.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Final Score</div>
                <div className="text-yellow-600 font-semibold mt-2 flex items-center justify-center gap-2">
                  🪙 {coins} Coins Earned
                </div>
                <div className="text-sm text-gray-600 mt-2">Level {level} Reached</div>
              </div>
              <button
                onClick={resetGame}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  return <BlockPuzzleGame />;
};

export default Index;
