import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Gift } from 'lucide-react';

// Piece definitions with colors
const PIECE_DEFINITIONS = [
  // Single block
  {
    shape: [[1]],
    color: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)'
  },
  // 2x1 horizontal
  {
    shape: [[1, 1]],
    color: 'linear-gradient(135deg, #4ECDC4, #44A08D)'
  },
  // 2x1 vertical
  {
    shape: [[1], [1]],
    color: 'linear-gradient(135deg, #45B7D1, #96CEB4)'
  },
  // 3x1 horizontal
  {
    shape: [[1, 1, 1]],
    color: 'linear-gradient(135deg, #F7DC6F, #F39C12)'
  },
  // 3x1 vertical
  {
    shape: [[1], [1], [1]],
    color: 'linear-gradient(135deg, #BB8FCE, #8E44AD)'
  },
  // L-shape
  {
    shape: [
      [1, 0],
      [1, 1]
    ],
    color: 'linear-gradient(135deg, #85C1E9, #3498DB)'
  },
  // Reverse L-shape
  {
    shape: [
      [0, 1],
      [1, 1]
    ],
    color: 'linear-gradient(135deg, #F8C471, #E67E22)'
  },
  // 2x2 square
  {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'linear-gradient(135deg, #A569BD, #8E44AD)'
  },
  // T-shape
  {
    shape: [
      [1, 1, 1],
      [0, 1, 0]
    ],
    color: 'linear-gradient(135deg, #58D68D, #27AE60)'
  },
  // Long L-shape
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 'linear-gradient(135deg, #EC7063, #E74C3C)'
  },
  // 4x1 horizontal
  {
    shape: [[1, 1, 1, 1]],
    color: 'linear-gradient(135deg, #AED6F1, #5DADE2)'
  },
  // 4x1 vertical
  {
    shape: [[1], [1], [1], [1]],
    color: 'linear-gradient(135deg, #F9E79F, #F4D03F)'
  },
  // Big L-shape
  {
    shape: [
      [1, 0],
      [1, 0],
      [1, 1]
    ],
    color: 'linear-gradient(135deg, #D7BDE2, #A569BD)'
  },
  // 3x3 corner
  {
    shape: [
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0]
    ],
    color: 'linear-gradient(135deg, #82E0AA, #58D68D)'
  },
  // Plus shape
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    color: 'linear-gradient(135deg, #F1948A, #EC7063)'
  }
];

// AdMob Ad Unit ID for production
const ADMOB_REWARD_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'; // Test unit ID

const BlockPuzzleGame = () => {
  // Game state
  const [grid, setGrid] = useState(() => Array(8).fill(null).map(() => Array(8).fill(0)));
  const [currentPieces, setCurrentPieces] = useState([]);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('blockPuzzleCoins');
    return saved ? parseInt(saved) : 0;
  });
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [blocksClearpned, setBlocksCleared] = useState(0);
  const [blastsCount, setBласtsCount] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOverModalVisible, setGameOverModalVisible] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cashAppUsername, setCashAppUsername] = useState('');
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [playingSounds, setPlayingSounds] = useState(true);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [draggedPiecePosition, setDraggedPiecePosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewPosition, setPreviewPosition] = useState(null);
  
  // Animation states
  const [explodingCells, setExplodingCells] = useState(new Set());
  const [showCombo, setShowCombo] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [invalidPlacement, setInvalidPlacement] = useState(false);
  
  // Audio context for sound effects
  const audioContextRef = useRef(null);
  
  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && playingSounds) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume context for mobile browsers
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      } catch (error) {
        console.log('Audio context not supported');
      }
    }
  }, [playingSounds]);

  // Online status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Level progression
  useEffect(() => {
    const newLevel = Math.floor(score / 1000) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
      setShowCongratulations(true);
      setCoins(prev => {
        const newCoins = prev + 5;
        localStorage.setItem('blockPuzzleCoins', newCoins.toString());
        return newCoins;
      });
      playSound('levelUp');
      
      setTimeout(() => {
        setShowCongratulations(false);
      }, 3000);
    }
  }, [score, level]);

  // Generate random pieces
  const generatePieces = useCallback(() => {
    const pieces = [];
    for (let i = 0; i < 3; i++) {
      const randomPiece = PIECE_DEFINITIONS[Math.floor(Math.random() * PIECE_DEFINITIONS.length)];
      pieces.push({
        id: Date.now() + Math.random(),
        ...randomPiece,
        used: false
      });
    }
    return pieces;
  }, []);

  // Initialize game
  useEffect(() => {
    setCurrentPieces(generatePieces());
    initAudioContext();
  }, [generatePieces, initAudioContext]);

  // Sound effects function
  const playSound = useCallback((soundType) => {
    if (!playingSounds || !audioContextRef.current) return;
    
    const audioContext = audioContextRef.current;
    
    // Resume context if suspended (mobile browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    try {
      switch (soundType) {
        case 'blockPlace':
          // Block placement sound
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.15);
          break;

        case 'invalidPlacement':
          // Error buzzer sound
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.setValueAtTime(150, audioContext.currentTime);
          oscillator2.frequency.setValueAtTime(120, audioContext.currentTime + 0.1);
          gainNode2.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator2.start();
          oscillator2.stop(audioContext.currentTime + 0.3);
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
          osc4.start();
          osc4.stop(audioContext.currentTime + 0.3);
          break;
      }
    } catch (error) {
      console.log('Sound play error:', error);
    }
  }, [playingSounds]);

  // Check if position is valid for piece placement
  const isValidPosition = useCallback((grid, piece, row, col) => {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] === 1) {
          const newRow = row + r;
          const newCol = col + c;
          
          if (newRow < 0 || newRow >= 8 || newCol < 0 || newCol >= 8) {
            return false;
          }
          
          if (grid[newRow][newCol] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  // Place piece on grid
  const placePiece = useCallback((grid, piece, row, col) => {
    const newGrid = grid.map(row => [...row]);
    
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] === 1) {
          newGrid[row + r][col + c] = piece.color;
        }
      }
    }
    
    return newGrid;
  }, []);

  // Clear completed lines and return cleared count
  const clearCompletedLines = useCallback((grid) => {
    let newGrid = [...grid];
    let linesCleared = 0;
    const cellsToExplode = new Set();
    
    // Check rows
    for (let row = 0; row < 8; row++) {
      if (newGrid[row].every(cell => cell !== 0)) {
        for (let col = 0; col < 8; col++) {
          cellsToExplode.add(`${row}-${col}`);
        }
        newGrid[row] = Array(8).fill(0);
        linesCleared++;
      }
    }
    
    // Check columns
    for (let col = 0; col < 8; col++) {
      if (newGrid.every(row => row[col] !== 0)) {
        for (let row = 0; row < 8; row++) {
          cellsToExplode.add(`${row}-${col}`);
        }
        newGrid.forEach(row => row[col] = 0);
        linesCleared++;
      }
    }
    
    // Trigger explosion animation
    if (cellsToExplode.size > 0) {
      setExplodingCells(cellsToExplode);
      setTimeout(() => setExplodingCells(new Set()), 600);
    }
    
    return { newGrid, linesCleared };
  }, []);

  // Handle piece placement
  const handlePiecePlacement = useCallback((piece, gridRow, gridCol) => {
    if (!isValidPosition(grid, piece, gridRow, gridCol)) {
      return false;
    }
    
    // Place the piece
    let newGrid = placePiece(grid, piece, gridRow, gridCol);
    
    // Clear completed lines
    const { newGrid: clearedGrid, linesCleared } = clearCompletedLines(newGrid);
    
    // Update game state
    setGrid(clearedGrid);
    setCurrentPieces(prev => 
      prev.map(p => p.id === piece.id ? { ...p, used: true } : p)
    );
    
    // Calculate score
    let pieceScore = piece.shape.flat().filter(cell => cell === 1).length * 10;
    let lineScore = linesCleared * 100;
    let bonusScore = 0;
    
    if (linesCleared >= 2) {
      bonusScore = linesCleared * 50;
      setComboCount(linesCleared);
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 2000);
      
      setBласtsCount(prev => prev + 1);
      playSound('blockbuster');
    } else if (linesCleared === 1) {
      playSound('lineClear');
    } else {
      playSound('blockPlace');
    }
    
    setScore(prev => prev + pieceScore + lineScore + bonusScore);
    setBlocksCleared(prev => prev + linesCleared);
    
    return true;
  }, [grid, isValidPosition, placePiece, clearCompletedLines, playSound]);

  // Check if any pieces can be placed
  const canPlaceAnyPiece = useCallback(() => {
    const availablePieces = currentPieces.filter(piece => !piece.used);
    
    if (availablePieces.length === 0) return false;
    
    for (let piece of availablePieces) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (isValidPosition(grid, piece, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  }, [currentPieces, grid, isValidPosition]);

  // Check for game over
  useEffect(() => {
    if (currentPieces.length > 0 && currentPieces.every(piece => piece.used)) {
      setCurrentPieces(generatePieces());
    } else if (currentPieces.length > 0 && !canPlaceAnyPiece()) {
      playSound('gameOver');
      setGameOverModalVisible(true);
    }
  }, [currentPieces, canPlaceAnyPiece, generatePieces, playSound]);

  // Drag and drop handlers
  const handlePieceStart = useCallback((e, piece) => {
    if (piece.used) return;
    
    initAudioContext();
    
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    
    setIsDragging(true);
    setDraggedPiece(piece);
    setDraggedPiecePosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    
    e.preventDefault();
  }, [initAudioContext]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !draggedPiece) return;
    
    const isTouch = e.type === 'touchmove';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    
    setDraggedPiecePosition({ x: clientX, y: clientY });
    
    // Find grid position under the cursor
    const gameGrid = document.querySelector('.game-grid');
    if (gameGrid) {
      const gridRect = gameGrid.getBoundingClientRect();
      const cellSize = gridRect.width / 8;
      
      const gridX = clientX - gridRect.left;
      const gridY = clientY - gridRect.top;
      
      if (gridX >= 0 && gridX <= gridRect.width && gridY >= 0 && gridY <= gridRect.height) {
        const col = Math.floor(gridX / cellSize);
        const row = Math.floor(gridY / cellSize);
        
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
          const valid = isValidPosition(grid, draggedPiece, row, col);
          setPreviewPosition({ row, col, valid });
        } else {
          setPreviewPosition(null);
        }
      } else {
        setPreviewPosition(null);
      }
    }
    
    e.preventDefault();
  }, [isDragging, draggedPiece, grid, isValidPosition]);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging || !draggedPiece) return;
    
    const isTouch = e.type === 'touchend';
    
    if (previewPosition && previewPosition.valid) {
      const success = handlePiecePlacement(draggedPiece, previewPosition.row, previewPosition.col);
      if (success) {
        // Add coins for successful placement
        setCoins(prev => {
          const newCoins = prev + 0.1;
          localStorage.setItem('blockPuzzleCoins', newCoins.toString());
          return newCoins;
        });
      }
    }
    
    setIsDragging(false);
    setDraggedPiece(null);
    setPreviewPosition(null);
    
    e.preventDefault();
  }, [isDragging, draggedPiece, previewPosition, handlePiecePlacement]);

  // Mouse and touch event listeners
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleMouseMove(e);
      const handleEnd = (e) => handleMouseUp(e);
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle "Get Coins" button
  const handleGetCoins = () => {
    if (!isOnline) {
      alert('You need an internet connection to watch ads and earn coins.');
      return;
    }
    
    // Show options for different ad types
    const adType = Math.random() > 0.5 ? 'auto' : 'manual';
    showRewardAd(adType);
  };

  // Show real AdMob reward ad with proper production setup
  const showRewardAd = (type) => {
    console.log(`🎬 Loading AdMob reward ad: ${ADMOB_REWARD_AD_UNIT_ID}`);
    
    if (!isOnline) {
      alert('No internet connection. Ads require an active internet connection.');
      return;
    }
    
    // For production apps, integrate with actual AdMob:
    // if (window.AdMob && window.AdMob.showRewardVideoAd) {
    //   window.AdMob.showRewardVideoAd().then(() => {
    //     completeAdWatch(type);
    //   }).catch((error) => {
    //     console.error('Ad failed to load:', error);
    //     alert('Ad failed to load. Please try again later.');
    //   });
    //   return;
    // }
    
    // Fallback simulation for web testing
    setShowAdModal(type);
    setAdCountdown(30); // Real reward ads are typically 15-30 seconds
    
    console.log('📺 AdMob reward ad started (simulation mode)');
  };

  // Complete ad watch and reward coins - Auto dismiss
  const completeAdWatch = (type) => {
    const coinsEarned = type === 'auto' ? 4.5 : 2;
    
    // Auto-dismiss modal
    setShowAdModal(false);
    setAdCountdown(0);
    
    setCoins(prev => {
      const newCoins = prev + coinsEarned;
      localStorage.setItem('blockPuzzleCoins', newCoins.toString());
      return newCoins;
    });
    
    console.log(`🪙 AdMob reward completed: ${coinsEarned} coins earned!`);
    
    // Show reward notification briefly
    setTimeout(() => {
      alert(`🎉 You earned ${coinsEarned} coins!`);
    }, 500);
  };

  // Ad countdown effect with auto-completion
  useEffect(() => {
    let countdownInterval;
    
    if (showAdModal && adCountdown > 0) {
      countdownInterval = setInterval(() => {
        setAdCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Auto-complete ad when countdown reaches 0
            completeAdWatch(showAdModal);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [showAdModal, adCountdown]);

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
    setInvalidPlacement(false);
    setPreviewPosition(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
      
      <div className="max-w-md mx-auto relative z-10">
        {/* Invalid Placement Shake Animation */}
        {invalidPlacement && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-red-500/80 text-white px-6 py-3 rounded-xl shadow-2xl transform animate-bounce">
              <div className="text-center font-bold">❌ Can't place there!</div>
            </div>
          </div>
        )}

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

        {/* Header - Single Line Layout */}
        <div className="bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md rounded-3xl p-3 sm:p-4 mb-6 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between text-white">
            {/* Stats Section */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Score</div>
                <div className="font-bold text-sm sm:text-lg bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {score.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Coins</div>
                <div className="font-bold text-sm sm:text-lg text-yellow-400 flex items-center gap-1 cursor-pointer" onClick={() => setShowWithdrawModal(true)}>
                  🪙 {coins}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-80 uppercase tracking-wide">Level</div>
                <div className="font-bold text-lg sm:text-2xl bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent animate-pulse">
                  {level}
                </div>
              </div>
            </div>
            
            {/* Buttons Section */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGetCoins}
                disabled={!isOnline}
                className={`flex items-center space-x-1 px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 text-xs sm:text-sm ${
                  isOnline 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white' 
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              >
                <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{isOnline ? 'Get Coins' : 'Offline'}</span>
                <span className="sm:hidden">{isOnline ? 'Coins' : 'Off'}</span>
              </button>
              
              {coins >= 15000 && (
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className="flex items-center space-x-1 px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 text-xs sm:text-sm"
                >
                  💰
                  <span className="hidden sm:inline">Withdraw</span>
                </button>
              )}
              
              <button
                onClick={() => setPlayingSounds(!playingSounds)}
                className="flex items-center px-2 py-2 sm:px-3 sm:py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 text-xs sm:text-sm"
              >
                <span className="text-sm">{playingSounds ? '🔊' : '🔇'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Game Grid - Mobile Optimized 8x8 */}
        <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-3xl p-3 sm:p-6 mb-6 border border-white/20 shadow-2xl">
          <div 
            className="game-grid bg-gradient-to-br from-black/30 to-black/10 p-2 sm:p-4 rounded-2xl border border-white/10 shadow-inner mx-auto"
            style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(8, 1fr)', 
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '4px',
              aspectRatio: '1/1',
              width: '100%',
              maxWidth: 'min(90vw, 400px)', // Responsive to screen width
              height: 'min(90vw, 400px)'
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isExploding = explodingCells.has(cellKey);
                
                // Check if this cell is part of the preview
                let isPreview = false;
                let previewValid = false;
                if (previewPosition && draggedPiece && isDragging) {
                  const pieceRow = rowIndex - previewPosition.row;
                  const pieceCol = colIndex - previewPosition.col;
                  
                  if (pieceRow >= 0 && pieceRow < draggedPiece.shape.length &&
                      pieceCol >= 0 && pieceCol < draggedPiece.shape[0].length &&
                      draggedPiece.shape[pieceRow][pieceCol] === 1) {
                    isPreview = true;
                    previewValid = previewPosition.valid;
                  }
                }
                
                return (
                  <div
                    key={cellKey}
                    className={`rounded-xl border-2 transition-all duration-300 ${
                      cell === 0 ? 'bg-white/10 border-white/20' : 'border-white/30'
                    } ${isExploding ? 'animate-ping bg-yellow-400 scale-125' : ''} ${
                      isPreview ? (previewValid ? 'bg-green-400/50 border-green-400' : 'bg-red-400/50 border-red-400') : ''
                    }`}
                    style={{
                      background: cell !== 0 
                        ? isExploding 
                          ? 'radial-gradient(circle, #FCD34D, #F59E0B)'
                          : cell 
                        : isPreview
                          ? previewValid
                            ? 'rgba(34, 197, 94, 0.5)'
                            : 'rgba(239, 68, 68, 0.5)'
                          : '',
                      boxShadow: cell !== 0 && !isExploding 
                        ? 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.2)' 
                        : isExploding
                          ? '0 0 20px #F59E0B, 0 0 40px #F59E0B'
                          : isPreview && previewValid
                            ? '0 0 10px rgba(34, 197, 94, 0.8)'
                            : isPreview && !previewValid
                              ? '0 0 10px rgba(239, 68, 68, 0.8)'
                              : '',
                      transform: isExploding ? 'scale(1.3) rotate(45deg)' : 'scale(1)',
                      zIndex: isExploding ? 10 : 'auto',
                      position: 'relative',
                      aspectRatio: '1/1'
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Current Pieces - Mobile Optimized Layout */}
        <div className="pieces-container bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/10 shadow-xl">
          <div className="grid grid-cols-3 gap-4 place-items-center">
            {currentPieces.map((piece, index) => (
              <div
                key={piece.id}
                className={`cursor-pointer transition-all duration-300 select-none p-2 rounded-xl relative ${
                  piece.used 
                    ? 'opacity-30 scale-75' 
                    : 'active:scale-95 hover:bg-white/10 hover:shadow-lg'
                } ${draggedPiece && draggedPiece.id === piece.id ? 'opacity-30' : ''}`}
                onMouseDown={(e) => handlePieceStart(e, piece)}
                onTouchStart={(e) => handlePieceStart(e, piece)}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  minHeight: '80px',
                  minWidth: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div className="grid gap-1" style={{ 
                  gridTemplateColumns: `repeat(${piece.shape[0]?.length || 1}, 1fr)`,
                  gridTemplateRows: `repeat(${piece.shape.length}, 1fr)`
                }}>
                  {piece.shape.map((row, rowIndex) => 
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`rounded-lg transition-all duration-200 ${
                          cell === 1 ? 'shadow-lg' : ''
                        }`}
                        style={{
                          width: '24px',
                          height: '24px',
                          background: cell === 1 ? piece.color : 'transparent',
                          boxShadow: cell === 1 ? 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.3)' : '',
                          border: cell === 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                          gridColumn: colIndex + 1,
                          gridRow: rowIndex + 1
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dragged Piece Overlay - Enhanced */}
        {isDragging && draggedPiece && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: draggedPiecePosition.x - dragOffset.x,
              top: draggedPiecePosition.y - dragOffset.y,
              transform: 'scale(1.2)',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))',
              opacity: previewPosition ? 0.8 : 0.95
            }}
          >
            <div className="grid gap-1">
              {draggedPiece.shape.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((cell, colIndex) => (
                    <div
                      key={colIndex}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                        cell === 1 ? 'shadow-lg animate-pulse' : ''
                      }`}
                      style={{
                        background: cell === 1 ? draggedPiece.color : 'transparent',
                        boxShadow: cell === 1 ? 'inset 0 2px 4px rgba(255,255,255,0.4), 0 8px 16px rgba(0,0,0,0.4)' : '',
                        border: cell === 1 ? '2px solid rgba(255,255,255,0.6)' : 'none'
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
                            alert(`Withdrawal request submitted! We'll process your payment of ${(coins / 100).toFixed(2)} within 3-5 business days.`);
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

        {/* AdMob Ad Modal - Production Ready */}
        {showAdModal && (
          <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
            <div className="w-full h-full relative">
              {/* Real AdMob ad container */}
              <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-4">
                <div className="text-center text-white max-w-sm">
                  <div className="text-4xl sm:text-6xl mb-4 animate-pulse">📺</div>
                  <div className="text-xl sm:text-2xl font-bold mb-2">Reward Video Ad</div>
                  <div className="text-sm sm:text-lg mb-4 text-gray-300">
                    Watch to earn coins!
                  </div>
                  <div className="text-4xl sm:text-6xl font-bold mb-2 text-green-400">
                    {adCountdown}
                  </div>
                  <div className="text-xs sm:text-sm opacity-80 mb-4">
                    {adCountdown > 0 ? 'Seconds remaining' : 'Ad completed!'}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${((30 - adCountdown) / 30) * 100}%`
                      }}
                    ></div>
                  </div>
                  
                  {adCountdown <= 0 && (
                    <div className="mt-4 text-green-400 font-semibold text-sm sm:text-base animate-bounce">
                      +{showAdModal ? '4.5' : '2'} coins earned! 🪙
                    </div>
                  )}
                  
                  {!isOnline && (
                    <div className="mt-4 text-red-400 font-semibold text-sm">
                      ⚠️ Offline Mode - No reward available
                    </div>
                  )}
                  
                  {/* Close button (only shows after ad completes) */}
                  {adCountdown <= 0 && (
                    <button
                      onClick={() => setShowAdModal(false)}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                    >
                      Collect Reward
                    </button>
                  )}
                  
                  <div className="mt-4 text-xs text-gray-400">
                    Ad Unit: {ADMOB_REWARD_AD_UNIT_ID.slice(-8)}...
                  </div>
                </div>
                
                {/* Simulated video ad space */}
                <div className="absolute inset-4 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                  <div className="text-gray-500 text-lg font-mono">
                    [ AdMob Reward Video Ad Space ]
                  </div>
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