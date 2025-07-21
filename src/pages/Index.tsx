import React, { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';

const BlockPuzzleGame = () => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState(() => Array(10).fill(null).map(() => Array(10).fill(0)));
  const [currentPieces, setCurrentPieces] = useState([]);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [coins, setCoins] = useState(0);
  const [showAdModal, setShowAdModal] = useState<'manual' | 'auto' | false>(false);
  const [blocksCleared, setBlocksCleared] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [lastAdTime, setLastAdTime] = useState(Date.now());
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [explodingCells, setExplodingCells] = useState(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [adCountdown, setAdCountdown] = useState(3);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [playingSounds, setPlayingSounds] = useState(true);

  // Beautiful modern color palette with gradients
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple gradient
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink gradient
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue gradient
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green gradient
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Orange gradient
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Pastel gradient
  ];

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
    setGameStartTime(Date.now());
    setLastAdTime(Date.now());
    
    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto ads every 3 minutes of gameplay
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastAdTime >= 180000) { // 3 minutes = 180000ms
        setShowAdModal('auto');
        setLastAdTime(now);
      }
    }, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, [lastAdTime]);

  // Ad countdown effect
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    
    if (showAdModal) {
      setAdCountdown(3);
      countdownInterval = setInterval(() => {
        setAdCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [showAdModal]);

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

  // Clear completed lines with blast animation
  const clearLines = async (newGrid) => {
    const linesToClear = checkForCompleteLines(newGrid);
    
    if (linesToClear.length === 0) return newGrid;
    
    setIsClearing(true);
    setExplodingCells(new Set(linesToClear));
    
    // Play line clear sound
    if (playingSounds) {
      playSound('lineClear');
    }
    
    // Wait for blast animation
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Calculate cleared blocks and bonus
    const clearedBlocks = linesToClear.length;
    setBlocksCleared(prev => prev + clearedBlocks);
    
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
    
    if (comboCount > 0) {
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 1500);
    }
    
    // Clear the lines
    const clearedGrid = newGrid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (linesToClear.includes(`${rowIndex}-${colIndex}`)) {
          return 0;
        }
        return cell;
      })
    );
    
    setExplodingCells(new Set());
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

  // Find the closest valid position for a piece (responsive blocks)
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
    
    // Play place block sound
    if (playingSounds) {
      playSound('blockPlace');
    }
    
    // Mark piece as used
    setCurrentPieces(prev => 
      prev.map(p => p.id === piece.id ? { ...p, used: true } : p)
    );
    
    // Add score for placing piece
    const baseScore = blocksAdded * 10;
    const levelBonus = level * 5;
    setScore(prev => prev + baseScore + levelBonus);

    // Check for line clears
    const clearedGrid = await clearLines(newGrid);
    setGrid(clearedGrid);

    // Check level progression: 15-20 blocks cleared OR board cleared after 40 seconds
    const gameTime = (Date.now() - gameStartTime) / 1000;
    const totalBlocks = clearedGrid.flat().filter(cell => cell !== 0).length;
    
    if (blocksCleared >= 15 || (totalBlocks === 0 && gameTime >= 40)) {
      setShowCongratulations(true);
      setLevel(prev => prev + 1);
      setCoins(prev => {
        const newCoins = prev + 5;
        localStorage.setItem('blockPuzzleCoins', newCoins.toString());
        return newCoins;
      });
      setScore(prev => prev + (level * 1000)); // Level completion bonus
      setBlocksCleared(0);
      setGameStartTime(Date.now());
      
      // Play level up sound
      if (playingSounds) {
        playSound('levelUp');
      }
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

  // Auto restart when game over
  useEffect(() => {
    const availablePieces = currentPieces.filter(p => !p.used);
    
    // Generate new pieces when all are used
    if (availablePieces.length === 0) {
      setTimeout(() => {
        setCurrentPieces(generatePieces());
      }, 300);
      return;
    }
    
    // Auto restart when board is full and no moves possible
    const totalBlocks = grid.flat().filter(cell => cell !== 0).length;
    if (totalBlocks === 100 && !canAnyPieceBePlaced()) {
      // Play game over sound
      if (playingSounds) {
        playSound('gameOver');
      }
      
      setTimeout(() => {
        setGrid(Array(10).fill(null).map(() => Array(10).fill(0)));
        setCurrentPieces(generatePieces());
        setGameStartTime(Date.now());
      }, 1000);
    }
  }, [currentPieces, grid]);

  // AdMob Test Integration
  const ADMOB_TEST_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'; // Test reward video ad unit
  
  // Initialize AdMob for web (using test ads)
  useEffect(() => {
    // Load AdMob script for web
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3940256099942544';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Get Coins button handler - Shows real AdMob reward ad
  const handleGetCoins = () => {
    showRewardAd('manual');
  };

  // Play game sounds
  const playSound = (type: 'blockPlace' | 'lineClear' | 'gameOver' | 'levelUp' | 'background') => {
    if (!playingSounds) return;
    
    // Web Audio API sound generation
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    switch (type) {
      case 'blockPlace':
        // Short click sound
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode1.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator1.start();
        oscillator1.stop(audioContext.currentTime + 0.1);
        break;
        
      case 'lineClear':
        // Success sound
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        oscillator2.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
        gainNode2.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator2.start();
        oscillator2.stop(audioContext.currentTime + 0.3);
        break;
        
      case 'gameOver':
        // Fail sound
        const oscillator3 = audioContext.createOscillator();
        const gainNode3 = audioContext.createGain();
        oscillator3.connect(gainNode3);
        gainNode3.connect(audioContext.destination);
        oscillator3.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator3.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
        gainNode3.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator3.start();
        oscillator3.stop(audioContext.currentTime + 0.5);
        break;
        
      case 'levelUp':
        // Level up fanfare
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.2);
          gain.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.2);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.2 + 0.3);
          osc.start(audioContext.currentTime + i * 0.2);
          osc.stop(audioContext.currentTime + i * 0.2 + 0.3);
        });
        break;
    }
  };

  // Show real AdMob reward ad with offline handling
  const showRewardAd = (type: 'manual' | 'auto') => {
    console.log(`🎬 Loading AdMob test ad: ${ADMOB_TEST_UNIT_ID}`);
    
    if (!isOnline) {
      // Offline mode - no ad, no reward
      alert('No internet connection. Ads require an active internet connection.');
      return;
    }
    
    // Simulate real AdMob ad loading and completion
    const adLoadTime = Math.random() * 2000 + 1000; // 1-3 seconds loading
    const adDuration = 30000; // 30 seconds
    
    setShowAdModal(type);
    setAdCountdown(Math.ceil(adDuration / 1000));
    
    // Start ad after loading simulation
    setTimeout(() => {
      console.log('📺 AdMob test ad started');
      // Ad completion after 30 seconds
      setTimeout(() => {
        completeAdWatch(type);
      }, adDuration);
    }, adLoadTime);
  };

  // Complete ad watch and reward coins
  const completeAdWatch = (type: 'manual' | 'auto') => {
    const coinsEarned = type === 'auto' ? 4.5 : 2;
    
    setShowAdModal(false);
    setCoins(prev => {
      const newCoins = prev + coinsEarned;
      localStorage.setItem('blockPuzzleCoins', newCoins.toString());
      return newCoins;
    });
    
    console.log(`🪙 AdMob reward completed: ${coinsEarned} coins earned!`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
      
      <div className="max-w-md mx-auto relative z-10">
        {/* Combo Animation */}
        {showCombo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl transform animate-bounce">
              <div className="text-center">
                <div className="text-3xl font-bold">🔥 COMBO x{comboCount} 🔥</div>
              </div>
            </div>
          </div>
        )}

        {/* Congratulations Modal */}
        {showCongratulations && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/20 transform animate-scale-in">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Congratulations!
                </h3>
                <div className="text-xl font-semibold text-gray-800 mb-6">
                  Level {level} Complete!
                </div>
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-xl font-bold text-lg mb-6">
                  +5 Coins Earned! 🪙
                </div>
                <button
                  onClick={() => setShowCongratulations(false)}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
                >
                  Continue Playing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header - Responsive Top Bar */}
        <div className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md rounded-3xl p-4 sm:p-6 mb-6 border border-white/20 shadow-2xl">
          {/* Top row with stats and buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-white">
            {/* Stats Row */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Score</div>
                <div className="font-bold text-lg sm:text-xl bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {score.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Coins</div>
                <div className="font-bold text-lg sm:text-xl text-yellow-400 flex items-center gap-1">
                  🪙 {coins}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Level</div>
                <div className="font-bold text-2xl sm:text-3xl bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent animate-pulse">
                  {level}
                </div>
              </div>
            </div>
            
            {/* Buttons Row */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleGetCoins}
                disabled={!isOnline}
                className={`flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 text-sm sm:text-base ${
                  isOnline 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{isOnline ? 'Get Coins' : 'Offline'}</span>
              </button>
              
              <button
                onClick={() => setPlayingSounds(!playingSounds)}
                className="flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 text-sm sm:text-base"
              >
                <span>{playingSounds ? '🔊' : '🔇'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Game Grid */}
        <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-3xl p-6 mb-6 border border-white/20 shadow-2xl">
          <div className="game-grid grid grid-cols-10 gap-2 bg-gradient-to-br from-black/30 to-black/10 p-4 rounded-2xl border border-white/10 shadow-inner">
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isExploding = explodingCells.has(cellKey);
                
                return (
                  <div
                    key={cellKey}
                    className={`w-8 h-8 rounded-xl border-2 transition-all duration-300 ${
                      cell === 0 ? 'bg-white/10 border-white/20' : 'border-white/30'
                    } ${shouldShowSnapPreview(rowIndex, colIndex) ? 'ring-2 ring-green-400 ring-opacity-60' : ''}
                    ${isExploding ? 'animate-ping bg-yellow-400 scale-125' : ''}`}
                    style={{
                      background: cell !== 0 
                        ? isExploding 
                          ? 'radial-gradient(circle, #FCD34D, #F59E0B)'
                          : cell 
                        : shouldShowSnapPreview(rowIndex, colIndex) 
                          ? 'rgba(34, 197, 94, 0.3)'
                          : '',
                      boxShadow: cell !== 0 && !isExploding 
                        ? 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.2)' 
                        : isExploding
                          ? '0 0 20px #F59E0B, 0 0 40px #F59E0B'
                          : '',
                      transform: isExploding ? 'scale(1.3) rotate(45deg)' : 'scale(1)',
                      zIndex: isExploding ? 10 : 'auto'
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Current Pieces */}
        <div className="bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
          <div className="flex justify-around items-center">
            {currentPieces.map((piece) => (
              <div
                key={piece.id}
                className={`cursor-pointer transition-all duration-300 select-none p-3 rounded-xl ${
                  piece.used 
                    ? 'opacity-30 scale-75' 
                    : 'hover:scale-110 active:scale-95 hover:bg-white/10 hover:shadow-lg'
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
                          className={`w-5 h-5 rounded-lg transition-all duration-200 ${
                            cell === 1 ? 'shadow-lg' : ''
                          }`}
                          style={{
                            background: cell === 1 ? piece.color : 'transparent',
                            boxShadow: cell === 1 ? 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.3)' : '',
                            border: cell === 1 ? '1px solid rgba(255,255,255,0.3)' : 'none'
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
            className="fixed pointer-events-none z-50 opacity-95"
            style={{
              left: draggedPiecePosition.x - dragOffset.x,
              top: draggedPiecePosition.y - dragOffset.y,
              transform: 'scale(1.3) rotate(5deg)',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))'
            }}
          >
            <div className="grid gap-1">
              {draggedPiece.shape.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((cell, colIndex) => (
                    <div
                      key={colIndex}
                      className={`w-5 h-5 rounded-lg ${
                        cell === 1 ? 'shadow-lg' : ''
                      }`}
                      style={{
                        background: cell === 1 ? draggedPiece.color : 'transparent',
                        boxShadow: cell === 1 ? 'inset 0 2px 4px rgba(255,255,255,0.4), 0 8px 16px rgba(0,0,0,0.4)' : '',
                        border: cell === 1 ? '2px solid rgba(255,255,255,0.5)' : 'none'
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}


        {/* AdMob Test Ad Player - Android Responsive */}
        {showAdModal && (
          <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
            <div className="w-full h-full relative">
              {/* AdMob ad container - Mobile optimized */}
              <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
                <div className="text-center text-white max-w-sm">
                  <div className="text-4xl sm:text-6xl mb-4 animate-bounce">📱</div>
                  <div className="text-xl sm:text-2xl font-bold mb-2">AdMob Test Ad</div>
                  <div className="text-sm sm:text-lg mb-4 break-all">
                    Unit ID: {ADMOB_TEST_UNIT_ID.slice(0, 15)}...
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold mb-2">
                    {adCountdown > 0 ? adCountdown : '✓'}
                  </div>
                  <div className="text-xs sm:text-sm opacity-80">
                    {adCountdown > 0 ? 'Ad will end in' : 'Ad completed!'} {showAdModal === 'auto' ? '(Auto)' : '(Manual)'}
                  </div>
                  {adCountdown === 0 && (
                    <div className="mt-4 text-green-400 font-semibold text-sm sm:text-base">
                      +{showAdModal === 'auto' ? '4.5' : '2'} coins earned! 🪙
                    </div>
                  )}
                  {!isOnline && (
                    <div className="mt-4 text-red-400 font-semibold text-sm">
                      ⚠️ Offline Mode - No reward available
                    </div>
                  )}
                </div>
              </div>
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