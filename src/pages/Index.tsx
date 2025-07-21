import React, { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';

const BlockPuzzleGame = () => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [grid, setGrid] = useState(() => Array(8).fill(null).map(() => Array(8).fill(0)));
  const [currentPieces, setCurrentPieces] = useState([]);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [coins, setCoins] = useState(0);
  const [showAdModal, setShowAdModal] = useState<'manual' | 'auto' | false>(false);
  const [blocksCleared, setBlocksCleared] = useState(0);
  const [blastsCount, setBласtsCount] = useState(0);
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
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cashAppUsername, setCashAppUsername] = useState('');
  const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState<AudioContext | null>(null);
  const [cellSize, setCellSize] = useState(0);

  // Orange color for all blocks
  const blockColor = '#FF6B35';

  // Calculate responsive cell size
  useEffect(() => {
    const calculateCellSize = () => {
      const screenWidth = window.innerWidth;
      const padding = 48; // Total padding (24px each side)
      const gap = 4 * 7; // 4px gap between 8 cells = 28px total
      const availableWidth = Math.min(screenWidth - padding, 400); // Max 400px
      const calculatedSize = Math.floor((availableWidth - gap) / 8);
      const minSize = 28; // Minimum cell size for mobile
      const maxSize = 45; // Maximum cell size
      setCellSize(Math.max(minSize, Math.min(maxSize, calculatedSize)));
    };

    calculateCellSize();
    window.addEventListener('resize', calculateCellSize);
    return () => window.removeEventListener('resize', calculateCellSize);
  }, []);

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
      
      pieces.push({
        id: Date.now() + i + Math.random(),
        shape: shape,
        color: blockColor,
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
    for (let row = 0; row < 8; row++) {
      if (newGrid[row].every(cell => cell !== 0)) {
        for (let col = 0; col < 8; col++) {
          linesToClear.push(`${row}-${col}`);
        }
      }
    }
    
    // Check columns
    for (let col = 0; col < 8; col++) {
      if (newGrid.every(row => row[col] !== 0)) {
        for (let row = 0; row < 8; row++) {
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
    
    // Play blockbuster sound effect
    if (playingSounds) {
      playSound('blockbuster');
    }
    
    // Wait for blast animation
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Calculate cleared blocks and bonus
    const clearedBlocks = linesToClear.length;
    setBlocksCleared(prev => prev + clearedBlocks);
    setBласtsCount(prev => prev + 1);
    
    const linesCleared = Math.min(
      new Set(linesToClear.map(pos => pos.split('-')[0])).size + // rows
      new Set(linesToClear.map(pos => pos.split('-')[1])).size   // columns
    , 16); // Max possible lines for 8x8
    
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
          
          if (newRow >= 8 || newCol >= 8 || newRow < 0 || newCol < 0) {
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

    // Check level progression: board cleared OR 20 blasts made
    const totalBlocks = clearedGrid.flat().filter(cell => cell !== 0).length;
    
    if (totalBlocks === 0 || blastsCount >= 20) {
      setShowCongratulations(true);
      setLevel(prev => prev + 1);
      setCoins(prev => {
        const newCoins = prev + 5;
        localStorage.setItem('blockPuzzleCoins', newCoins.toString());
        return newCoins;
      });
      setScore(prev => prev + (level * 1000)); // Level completion bonus
      setBlocksCleared(0);
      setBласtsCount(0);
      setGameStartTime(Date.now());
      
      // Clear board for next level
      if (totalBlocks > 0) {
        setTimeout(() => {
          setGrid(Array(8).fill(null).map(() => Array(8).fill(0)));
        }, 2000);
      }
      
      // Play level up sound
      if (playingSounds) {
        playSound('levelUp');
      }
    }
  };

  // Enhanced drag and drop for mobile
  const [draggedPiecePosition, setDraggedPiecePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Handle piece drag start - optimized for mobile
  const handlePieceStart = (e, piece) => {
    if (piece.used) return;
    
    // Prevent default to avoid scrolling on mobile
    e.preventDefault();
    
    const touch = e.touches ? e.touches[0] : e;
    const rect = e.currentTarget.getBoundingClientRect();
    
    setDraggedPiece(piece);
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    setDraggedPiecePosition({ x: touch.clientX, y: touch.clientY });
  };

  // Handle drag move - optimized for mobile
  const handleDragMove = (e) => {
    if (!isDragging || !draggedPiece) return;
    
    e.preventDefault(); // Prevent scrolling
    
    const touch = e.touches ? e.touches[0] : e;
    setDraggedPiecePosition({ x: touch.clientX, y: touch.clientY });
  };

  // Handle drag end - improved placement detection for mobile
  const handleDragEnd = (e) => {
    if (!isDragging || !draggedPiece) return;
    
    e.preventDefault();
    
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    
    // Get grid element with more specific selector
    const gridElement = document.querySelector('.game-grid');
    if (gridElement) {
      const gridRect = gridElement.getBoundingClientRect();
      
      // More generous bounds checking for mobile
      const touchBuffer = 10; // 10px buffer for easier placement
      if (touch.clientX >= gridRect.left - touchBuffer && 
          touch.clientX <= gridRect.right + touchBuffer &&
          touch.clientY >= gridRect.top - touchBuffer && 
          touch.clientY <= gridRect.bottom + touchBuffer) {
        
        // Calculate target position based on cell size
        const relativeX = touch.clientX - gridRect.left;
        const relativeY = touch.clientY - gridRect.top;
        const targetCol = Math.floor(relativeX / (cellSize + 4)); // Include gap
        const targetRow = Math.floor(relativeY / (cellSize + 4)); // Include gap
        
        // Ensure within bounds
        const clampedCol = Math.max(0, Math.min(7, targetCol));
        const clampedRow = Math.max(0, Math.min(7, targetRow));
        
        console.log(`Trying to place at row: ${clampedRow}, col: ${clampedCol}`);
        
        if (canPlacePieceAt(draggedPiece, clampedRow, clampedCol)) {
          placePieceAt(draggedPiece, clampedRow, clampedCol);
        }
      }
    }
    
    setDraggedPiece(null);
    setIsDragging(false);
    setDraggedPiecePosition({ x: 0, y: 0 });
  };

  // Add event listeners for drag - mobile optimized
  useEffect(() => {
    const handleMouseMove = (e) => handleDragMove(e);
    const handleMouseUp = (e) => handleDragEnd(e);
    const handleTouchMove = (e) => handleDragMove(e);
    const handleTouchEnd = (e) => handleDragEnd(e);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, draggedPiece, cellSize]);

  // Check if any piece can be placed
  const canAnyPieceBePlaced = () => {
    const availablePieces = currentPieces.filter(p => !p.used);
    for (let piece of availablePieces) {
      for (let row = 0; row <= 8 - piece.shape.length; row++) {
        for (let col = 0; col <= 8 - (piece.shape[0]?.length || 0); col++) {
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
    
    // Show game over when no moves possible
    if (availablePieces.length > 0 && !canAnyPieceBePlaced()) {
      setGameOverModalVisible(true);
      // Play game over sound
      if (playingSounds) {
        playSound('gameOver');
      }
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

  // Initialize background music
  useEffect(() => {
    if (playingSounds && !backgroundMusic) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      setBackgroundMusic(audioContext);
      playBackgroundMusic(audioContext);
    } else if (!playingSounds && backgroundMusic) {
      backgroundMusic.close();
      setBackgroundMusic(null);
    }
  }, [playingSounds]);

  // Background music loop
  const playBackgroundMusic = (audioContext: AudioContext) => {
    const playLoop = () => {
      const melody = [523, 659, 784, 659, 523, 392, 523]; // C major scale
      melody.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.5);
        gain.gain.setValueAtTime(0.05, audioContext.currentTime + i * 0.5);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.5 + 0.4);
        osc.start(audioContext.currentTime + i * 0.5);
        osc.stop(audioContext.currentTime + i * 0.5 + 0.4);
      });
      
      setTimeout(playLoop, 4000); // Loop every 4 seconds
    };
    playLoop();
  };

  // Play game sounds
  const playSound = (type: 'blockPlace' | 'blockbuster' | 'gameOver' | 'levelUp' | 'lineClear') => {
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
        
      case 'blockbuster':
        // Epic blockbuster explosion sound
        const frequencies = [220, 330, 440, 660, 880];
        frequencies.forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.05);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioContext.currentTime + i * 0.05 + 0.4);
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, audioContext.currentTime + i * 0.05);
          filter.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + i * 0.05 + 0.4);
          
          gain.gain.setValueAtTime(0.15, audioContext.currentTime + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.05 + 0.5);
          
          osc.start(audioContext.currentTime + i * 0.05);
          osc.stop(audioContext.currentTime + i * 0.05 + 0.5);
        });
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
        
      case 'lineClear':
        // Line clear sound
        const osc4 = audioContext.createOscillator();
        const gain4 = audioContext.createGain();
        osc4.connect(gain4);
        gain4.connect(audioContext.destination);
        osc4.frequency.setValueAtTime(1000, audioContext.currentTime);
        osc4.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.3);
        gain4.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain4.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc4.start(audioContext.currentTime + 0.3);
        osc4.stop(audioContext.currentTime + 0.3);
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
    const adDuration = 3000; // 3 seconds for fast testing, real ads can be 30 seconds
    
    setShowAdModal(type);
    setAdCountdown(Math.ceil(adDuration / 1000));
    
    // Start ad after loading simulation
    setTimeout(() => {
      console.log('📺 AdMob test ad started');
      // Auto-close ad after 3 seconds
      setTimeout(() => {
        completeAdWatch(type);
      }, 3000); // Always 3 seconds, auto-close
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

  // Game over restart function
  const restartGame = () => {
    setGrid(Array(8).fill(null).map(() => Array(8).fill(0)));
    setCurrentPieces(generatePieces());
    setGameStartTime(Date.now());
    setScore(0);
    setBlocksCleared(0);
    setBласtsCount(0);
    setLevel(1);
    setGameOverModalVisible(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-3 sm:p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
      
      <div className="max-w-md mx-auto relative z-10">
        {/* Combo Animation */}
        {showCombo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-2xl transform animate-bounce">
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

        {/* Header - Mobile Optimized */}
        <div className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md rounded-2xl p-3 mb-4 border border-white/20">
          <div className="flex items-center justify-between text-white">
            {/* Stats Section */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Score</div>
                <div className="font-bold text-sm bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {score.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Coins</div>
                <div className="font-bold text-sm text-yellow-400 flex items-center gap-1 cursor-pointer" onClick={() => setShowWithdrawModal(true)}>
                  🪙 {coins}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Level</div>
                <div className="font-bold text-lg bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent animate-pulse">
                  {level}
                </div>
              </div>
            </div>
            
            {/* Buttons Section */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleGetCoins}
                disabled={!isOnline}
                className={`flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 text-xs ${
                  isOnline 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                <Gift className="w-3 h-3" />
                <span className="hidden sm:inline">{isOnline ? 'Get Coins' : 'Offline'}</span>
              </button>
              
              {coins >= 15000 && (
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 text-xs"
                >
                  💰
                  <span className="hidden sm:inline">Withdraw</span>
                </button>
              )}
              
              <button
                onClick={() => setPlayingSounds(!playingSounds)}
                className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 text-xs"
              >
                <span className="text-sm">{playingSounds ? '🔊' : '🔇'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Game Grid - Mobile Responsive */}
        <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20">
          <div 
            className="game-grid bg-gradient-to-br from-black/30 to-black/10 p-2 rounded-2xl border border-white/10 mx-auto"
            style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(8, 1fr)', 
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '4px',
              width: `${cellSize * 8 + 4 * 7}px`,
              height: `${cellSize * 8 + 4 * 7}px`
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isExploding = explodingCells.has(cellKey);
                
                return (
                  <div
                    key={cellKey}
                    className={`rounded-lg border-2 transition-all duration-300 ${
                      cell === 0 ? 'bg-white/10 border-white/20' : 'border-white/30'
                    } ${isExploding ? 'animate-ping bg-yellow-400 scale-125' : ''}`}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      background: cell !== 0 
                        ? isExploding 
                          ? 'radial-gradient(circle, #FCD34D, #F59E0B)'
                          : blockColor 
                        : '',
                      transform: isExploding ? 'scale(1.3) rotate(45deg)' : 'scale(1)',
                      zIndex: isExploding ? 10 : 'auto',
                      position: 'relative'
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Current Pieces - Mobile Optimized */}
        <div className="pieces-container bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/10">
          <div className="flex justify-around items-center">
            {currentPieces.map((piece) => (
              <div
                key={piece.id}
                className={`cursor-pointer transition-all duration-300 select-none p-2 rounded-xl ${
                  piece.used 
                    ? 'opacity-30 scale-75' 
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
                          className="rounded-lg transition-all duration-200"
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            background: cell === 1 ? blockColor : 'transparent',
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

        {/* Dragged Piece Overlay - Mobile Optimized */}
        {isDragging && draggedPiece && (
          <div
            className="fixed pointer-events-none z-50 opacity-95"
            style={{
              left: draggedPiecePosition.x - dragOffset.x,
              top: draggedPiecePosition.y - dragOffset.y,
              transform: 'scale(1.2)',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))'
            }}
          >
            <div className="grid gap-1">
              {draggedPiece.shape.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((cell, colIndex) => (
                    <div
                      key={colIndex}
                      className="rounded-lg"
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        background: cell === 1 ? blockColor : 'transparent',
                        border: cell === 1 ? '2px solid rgba(255,255,255,0.5)' : 'none'
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameOverModalVisible && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/20 transform animate-scale-in">
              <div className="text-center">
                <div className="text-6xl mb-4">💥</div>
                <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Game Over!
                </h3>
                <div className="text-xl font-semibold text-gray-800 mb-6">
                  No more moves possible
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold text-lg mb-6">
                  Final Score: {score.toLocaleString()}
                </div>
                <button
                  onClick={restartGame}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
                >
                  Restart Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Coins Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-md rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/30 transform animate-scale-in">
              <div className="text-center">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Withdraw Coins
                </h3>
                <div className="text-lg text-gray-700 mb-6">
                  Turn your coins into real money!
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-lg mb-6">
                  100 coins = $1 USD
                </div>
                <div className="text-xl font-semibold text-gray-800 mb-6">
                  Your balance: {coins} coins = ${(coins / 100).toFixed(2)} USD
                </div>
                
                {coins >= 15000 ? (
                  <div className="space-y-4">
                    <div className="text-green-600 font-semibold mb-4">
                      ✅ Minimum withdrawal amount reached! ($150)
                    </div>
                    
                    {/* PayPal Section */}
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/paypal.svg" 
                             alt="PayPal" className="w-6 h-6" style={{filter: 'invert(27%) sepia(98%) saturate(1455%) hue-rotate(204deg) brightness(96%) contrast(98%)'}} />
                        <span className="font-semibold text-gray-800">PayPal</span>
                      </div>
                      <input
                        type="email"
                        placeholder="Enter your PayPal email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Cash App Section */}
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v9/icons/cashapp.svg" 
                             alt="Cash App" className="w-6 h-6" style={{filter: 'invert(47%) sepia(96%) saturate(4466%) hue-rotate(88deg) brightness(103%) contrast(103%)'}} />
                        <span className="font-semibold text-gray-800">Cash App</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter your Cash App username"
                        value={cashAppUsername}
                        onChange={(e) => setCashAppUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowWithdrawModal(false)}
                        className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-xl font-semibold transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (paypalEmail || cashAppUsername) {
                            alert(`Withdrawal request submitted! We'll process your payment of $${(coins / 100).toFixed(2)} within 3-5 business days.`);
                            setShowWithdrawModal(false);
                          } else {
                            alert('Please enter either PayPal email or Cash App username');
                          }
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-red-600 font-semibold mb-4">
                      ❌ Minimum withdrawal: $150 USD (15,000 coins)
                    </div>
                    <div className="text-gray-600 mb-6">
                      You need {15000 - coins} more coins to withdraw
                    </div>
                    <button
                      onClick={() => setShowWithdrawModal(false)}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
                    >
                      Keep Playing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
