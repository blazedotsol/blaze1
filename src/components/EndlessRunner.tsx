import React, { useEffect, useRef } from 'react';

const JobApplicationSweeper: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<{
    board: number[][];
    mines: boolean[][];
    revealed: boolean[][];
    flags: boolean[][];
    gameOver: boolean;
    gameWon: boolean;
    startTime: number | null;
    timerInterval: NodeJS.Timeout | null;
    rows: number;
    cols: number;
    mineCount: number;
    currentScore: number;
    applicationImage: HTMLImageElement;
    flagMode: boolean;
  }>({
    board: [],
    mines: [],
    revealed: [],
    flags: [],
    gameOver: false,
    gameWon: false,
    startTime: null,
    timerInterval: null,
    rows: 9,
    cols: 9,
    mineCount: 10,
    currentScore: 0,
    applicationImage: new Image(),
    flagMode: false
  });

  useEffect(() => {
    const gameState = gameStateRef.current;
    
    // Load the application image
    gameState.applicationImage.src = '/image copy copy.png';
    
    startGame('easy');
    updateLeaderboard();

    return () => {
      if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
      }
    };
  }, []);

  const startGame = (level: string) => {
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set to easy difficulty only
    gameState.rows = 9;
    gameState.cols = 9;
    gameState.mineCount = 10;

    canvas.width = gameState.cols * 60;
    canvas.height = gameState.rows * 60;

    // Initialize game state
    gameState.board = Array(gameState.rows).fill(null).map(() => Array(gameState.cols).fill(0));
    gameState.mines = Array(gameState.rows).fill(null).map(() => Array(gameState.cols).fill(false));
    gameState.revealed = Array(gameState.rows).fill(null).map(() => Array(gameState.cols).fill(false));
    gameState.flags = Array(gameState.rows).fill(null).map(() => Array(gameState.cols).fill(false));
    gameState.gameOver = false;
    gameState.gameWon = false;
    gameState.startTime = null;
    
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }

    updateStatus(`Applications remaining: ${gameState.mineCount}`);
    placeMines();
    calculateNumbers();
    drawBoard();
  };

  const placeMines = () => {
    const gameState = gameStateRef.current;
    let placed = 0;
    while (placed < gameState.mineCount) {
      const row = Math.floor(Math.random() * gameState.rows);
      const col = Math.floor(Math.random() * gameState.cols);
      if (!gameState.mines[row][col]) {
        gameState.mines[row][col] = true;
        placed++;
      }
    }
  };

  const calculateNumbers = () => {
    const gameState = gameStateRef.current;
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        if (gameState.mines[r][c]) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols && gameState.mines[nr][nc]) {
              count++;
            }
          }
        }
        gameState.board[r][c] = count;
      }
    }
  };

  const drawBoard = () => {
    const canvas = canvasRef.current;
    const gameState = gameStateRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        const x = c * 60;
        const y = r * 60;
        
        // Draw cell with 3D effect
        if (gameState.revealed[r][c]) {
          // Revealed cell - flat white
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 60, 60);
          ctx.strokeStyle = '#999999';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, 60, 60);
          
          if (gameState.board[r][c] > 0) {
            // Color-coded numbers
            const colors = ['', '#0000ff', '#008000', '#ff0000', '#800080', '#800000', '#008080', '#000000', '#808080'];
            ctx.fillStyle = colors[gameState.board[r][c]] || '#000000';
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gameState.board[r][c].toString(), x + 30, y + 30);
          }
        } else {
          // Unrevealed cell - 3D raised button effect
          ctx.fillStyle = '#c0c0c0';
          ctx.fillRect(x, y, 60, 60);
          
          // Top and left highlights
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 60, 3);
          ctx.fillRect(x, y, 3, 60);
          
          // Bottom and right shadows
          ctx.fillStyle = '#808080';
          ctx.fillRect(x, y + 57, 60, 3);
          ctx.fillRect(x + 57, y, 3, 60);
          
          // Flag display
          if (gameState.flags[r][c]) {
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 42px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚩', x + 30, y + 30);
          }
        }
        
        // Show applications when game is over
        if (gameState.gameOver && gameState.mines[r][c]) {
          if (gameState.applicationImage.complete && gameState.applicationImage.naturalWidth > 0) {
            ctx.drawImage(gameState.applicationImage, x + 3, y + 3, 54, 54);
          } else {
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 42px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📝', x + 30, y + 30);
          }
        }
      }
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas || gameState.gameOver || gameState.gameWon) return;

    if (!gameState.startTime) {
      gameState.startTime = Date.now();
      gameState.timerInterval = setInterval(updateTimer, 1000);
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const r = Math.floor(y / 60);
    const c = Math.floor(x / 60);
    
    if (r < 0 || r >= gameState.rows || c < 0 || c >= gameState.cols || gameState.flags[r][c]) return;
    
    if (gameState.flagMode) {
      // Flag mode - toggle flag
      if (!gameState.revealed[r][c]) {
        gameState.flags[r][c] = !gameState.flags[r][c];
        const flagCount = gameState.flags.flat().filter(f => f).length;
        updateStatus(`Applications remaining: ${gameState.mineCount - flagCount}`);
      }
    } else {
      // Click mode - reveal cell
      if (!gameState.flags[r][c]) {
        revealCell(r, c);
      }
    }
    
    drawBoard();
    checkWin();
  };

  const handleTouch = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas || gameState.gameOver || gameState.gameWon) return;

    if (!gameState.startTime) {
      gameState.startTime = Date.now();
      gameState.timerInterval = setInterval(updateTimer, 1000);
    }

    const touch = event.touches[0] || event.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    const r = Math.floor(y / 60);
    const c = Math.floor(x / 60);
    
    if (r < 0 || r >= gameState.rows || c < 0 || c >= gameState.cols || gameState.flags[r][c]) return;
    
    if (gameState.flagMode) {
      // Flag mode - toggle flag
      if (!gameState.revealed[r][c]) {
        gameState.flags[r][c] = !gameState.flags[r][c];
        const flagCount = gameState.flags.flat().filter(f => f).length;
        updateStatus(`Applications remaining: ${gameState.mineCount - flagCount}`);
      }
    } else {
      // Click mode - reveal cell
      if (!gameState.flags[r][c]) {
        revealCell(r, c);
      }
    }
    
    drawBoard();
    checkWin();
  };
  const handleRightClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas || gameState.gameOver || gameState.gameWon) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const r = Math.floor(y / 60);
    const c = Math.floor(x / 60);
    
    if (r < 0 || r >= gameState.rows || c < 0 || c >= gameState.cols || gameState.revealed[r][c]) return;
    
    gameState.flags[r][c] = !gameState.flags[r][c];
    const flagCount = gameState.flags.flat().filter(f => f).length;
    updateStatus(`Applications remaining: ${gameState.mineCount - flagCount}`);
    drawBoard();
  };

  const revealCell = (r: number, c: number) => {
    const gameState = gameStateRef.current;
    if (gameState.revealed[r][c] || gameState.flags[r][c]) return;
    
    gameState.revealed[r][c] = true;
    
    if (gameState.mines[r][c]) {
      gameState.gameOver = true;
      updateStatus('Game Over! You hit an application.');
      if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
      }
      return;
    }
    
    if (gameState.board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
            revealCell(nr, nc);
          }
        }
      }
    }
  };

  const updateTimer = () => {
    const gameState = gameStateRef.current;
    if (!gameState.startTime) return;
    
    const elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    if (!gameState.gameOver && !gameState.gameWon) {
      const flagCount = gameState.flags.flat().filter(f => f).length;
      updateStatus(`Time: ${elapsed}s | Applications remaining: ${gameState.mineCount - flagCount}`);
    }
  };

  const checkWin = () => {
    const gameState = gameStateRef.current;
    let unrevealedNonMines = 0;
    
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        if (!gameState.mines[r][c] && !gameState.revealed[r][c]) {
          unrevealedNonMines++;
        }
      }
    }
    
    if (unrevealedNonMines === 0) {
      gameState.gameWon = true;
      if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
      }
      if (gameState.startTime) {
        gameState.currentScore = Math.floor((Date.now() - gameState.startTime) / 1000);
        updateStatus(`Congratulations! You won in ${gameState.currentScore} seconds!`);
        showNameInput();
      }
    }
  };

  const updateStatus = (message: string) => {
    const statusElement = document.getElementById('sweeper-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  };

  const showNameInput = () => {
    const nameContainer = document.getElementById('sweeper-name-container');
    const shareButton = document.getElementById('sweeper-share-button');
    if (nameContainer) nameContainer.style.display = 'block';
    if (shareButton) shareButton.style.display = 'block';
  };

  const submitScore = () => {
    const gameState = gameStateRef.current;
    const nameInput = document.getElementById('sweeper-player-name') as HTMLInputElement;
    
    if (!nameInput) return;
    
    const name = nameInput.value.trim() || 'Anonymous';
    const scores = JSON.parse(localStorage.getItem('minesweeperScores') || '[]');
    
    scores.push({ name, time: gameState.currentScore, difficulty: 'Easy' });
    scores.sort((a: any, b: any) => a.time - b.time);
    if (scores.length > 10) scores.length = 10;
    
    localStorage.setItem('minesweeperScores', JSON.stringify(scores));
    updateLeaderboard();
    
    const nameContainer = document.getElementById('sweeper-name-container');
    if (nameContainer) nameContainer.style.display = 'none';
  };

  const updateLeaderboard = () => {
    const scores = JSON.parse(localStorage.getItem('minesweeperScores') || '[]');
    const tbody = document.getElementById('sweeper-leaderboard-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    scores.forEach((score: any, index: number) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="border-2 border-white p-3">${index + 1}</td>
        <td class="border-2 border-white p-3">${score.name}</td>
        <td class="border-2 border-white p-3">${score.time}</td>
        <td class="border-2 border-white p-3">Easy</td>
      `;
      tbody.appendChild(row);
    });
  };

  const shareScore = () => {
    const gameState = gameStateRef.current;
    const nameInput = document.getElementById('sweeper-player-name') as HTMLInputElement;
    
    if (!nameInput) return;
    
    const name = nameInput.value.trim() || 'Anonymous';
    const text = encodeURIComponent(`I completed Job Application Sweeper in ${gameState.currentScore} seconds on Easy! Try it at ${window.location.origin}/`);
    const url = `https://x.com/intent/tweet?text=${text}`;
    window.open(url, '_blank');
  };

  const toggleMode = () => {
    const gameState = gameStateRef.current;
    gameState.flagMode = !gameState.flagMode;
    
    // Update button text
    const modeButton = document.getElementById('mode-toggle-button');
    if (modeButton) {
      modeButton.textContent = gameState.flagMode ? 'Mode: Flag 🚩' : 'Mode: Click 👆';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="mb-6">
        <button 
          id="mode-toggle-button"
          onClick={toggleMode}
          className="bg-black text-white px-6 py-3 font-mono text-lg hover:bg-white hover:text-black transition-colors border-2 border-white mr-3"
        >
          Mode: Click 👆
        </button>
        
        <button 
          onClick={() => startGame('easy')}
          className="bg-white text-black px-6 py-3 font-mono text-lg hover:bg-gray-200 transition-colors border-2 border-black"
        >
          New Game (Easy - 9x9, 10 applications)
        </button>
      </div>
      
      <canvas 
        ref={canvasRef}
        onClick={handleClick}
        onTouchStart={handleTouch}
        onContextMenu={handleRightClick}
        className="border-4 border-white bg-gray-300 mb-6 shadow-lg mx-auto touch-none"
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          touchAction: 'none',
          userSelect: 'none'
        }}
      />
      
      <div id="sweeper-status" className="text-white font-mono text-xl mb-6">
        Applications remaining: 10
      </div>
      
      <div id="sweeper-name-container" className="hidden mb-6">
        <input 
          type="text" 
          id="sweeper-player-name" 
          placeholder="Enter your name" 
          maxLength={20}
          className="bg-black text-white border-2 border-white p-3 font-mono text-lg mr-3"
        />
        <button 
          onClick={submitScore}
          className="bg-white text-black px-6 py-3 font-mono text-lg hover:bg-gray-200 transition-colors border-2 border-black"
        >
          Save Score
        </button>
      </div>
      
      <button 
        id="sweeper-share-button" 
        onClick={shareScore}
        className="hidden bg-blue-500 text-white px-6 py-3 font-mono text-lg hover:bg-blue-600 transition-colors mb-6 border-2 border-blue-700"
      >
        Share Score on X
      </button>
      
      <div className="mt-10 max-w-lg mx-auto flex flex-col items-center">
        <h3 className="text-white font-mono text-2xl mb-6">Leaderboard</h3>
        <table className="w-full border-2 border-white text-white font-mono text-base mx-auto">
          <thead>
            <tr className="bg-white text-black">
              <th className="border-2 border-black p-3">Rank</th>
              <th className="border-2 border-black p-3">Name</th>
              <th className="border-2 border-black p-3">Time (s)</th>
              <th className="border-2 border-black p-3">Difficulty</th>
            </tr>
          </thead>
          <tbody id="sweeper-leaderboard-body"></tbody>
        </table>
      </div>
      
      <div className="mt-8 text-white font-mono text-base max-w-2xl mx-auto text-center">
        <h4 className="text-lg mb-4">How to play:</h4>
        <div className="text-center space-y-2">
          <p>• Toggle between Click mode (reveal cells) and Flag mode (flag applications)</p>
          <p>• Right click also flags applications in any mode</p>
          <p>• Numbers show how many applications are adjacent to that cell</p>
          <p>• Avoid clicking on the hidden job applications!</p>
          <p>• Flag all applications and reveal all safe cells to win</p>
        </div>
      </div>
    </div>
  );
};

export default JobApplicationSweeper;