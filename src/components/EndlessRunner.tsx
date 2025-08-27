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
    applicationImage: new Image()
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

    // Set difficulty
    if (level === 'easy') {
      gameState.rows = 9;
      gameState.cols = 9;
      gameState.mineCount = 10;
    } else if (level === 'medium') {
      gameState.rows = 16;
      gameState.cols = 16;
      gameState.mineCount = 40;
    } else {
      gameState.rows = 30;
      gameState.cols = 16;
      gameState.mineCount = 99;
    }

    canvas.width = gameState.cols * 30;
    canvas.height = gameState.rows * 30;

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
        const x = c * 30;
        const y = r * 30;
        
        // Draw cell border
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x, y, 30, 30);
        
        if (gameState.revealed[r][c]) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(x, y, 30, 30);
          if (gameState.board[r][c] > 0) {
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gameState.board[r][c].toString(), x + 15, y + 15);
          }
        } else if (gameState.flags[r][c]) {
          ctx.fillStyle = 'red';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚩', x + 15, y + 15);
        }
        
        if (gameState.gameOver && gameState.mines[r][c]) {
          if (gameState.applicationImage.complete && gameState.applicationImage.naturalWidth > 0) {
            ctx.drawImage(gameState.applicationImage, x, y, 30, 30);
          } else {
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📝', x + 15, y + 15);
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const r = Math.floor(y / 30);
    const c = Math.floor(x / 30);
    
    if (r < 0 || r >= gameState.rows || c < 0 || c >= gameState.cols || gameState.flags[r][c]) return;
    
    revealCell(r, c);
    drawBoard();
    checkWin();
  };

  const handleRightClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas || gameState.gameOver || gameState.gameWon) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const r = Math.floor(y / 30);
    const c = Math.floor(x / 30);
    
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
    const levelSelect = document.getElementById('sweeper-level') as HTMLSelectElement;
    
    if (!nameInput || !levelSelect) return;
    
    const name = nameInput.value.trim() || 'Anonymous';
    const difficulty = levelSelect.options[levelSelect.selectedIndex].text;
    const scores = JSON.parse(localStorage.getItem('minesweeperScores') || '[]');
    
    scores.push({ name, time: gameState.currentScore, difficulty });
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
        <td>${index + 1}</td>
        <td>${score.name}</td>
        <td>${score.time}</td>
        <td>${score.difficulty}</td>
      `;
      tbody.appendChild(row);
    });
  };

  const shareScore = () => {
    const gameState = gameStateRef.current;
    const nameInput = document.getElementById('sweeper-player-name') as HTMLInputElement;
    const levelSelect = document.getElementById('sweeper-level') as HTMLSelectElement;
    
    if (!nameInput || !levelSelect) return;
    
    const name = nameInput.value.trim() || 'Anonymous';
    const difficulty = levelSelect.options[levelSelect.selectedIndex].text;
    const text = encodeURIComponent(`I completed Job Application Sweeper in ${gameState.currentScore} seconds on ${difficulty}! Try it at ${window.location.origin}/`);
    const url = `https://x.com/intent/tweet?text=${text}`;
    window.open(url, '_blank');
  };

  const handleDifficultyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    startGame(event.target.value);
  };

  return (
    <div className="text-center">
      <div className="mb-4">
        <label htmlFor="sweeper-level" className="text-white font-mono mr-2">Select difficulty:</label>
        <select 
          id="sweeper-level" 
          className="bg-black text-white border border-white p-2 font-mono mr-2"
          onChange={handleDifficultyChange}
          defaultValue="easy"
        >
          <option value="easy">Easy (9x9, 10 applications)</option>
          <option value="medium">Medium (16x16, 40 applications)</option>
          <option value="hard">Hard (30x16, 99 applications)</option>
        </select>
        <button 
          onClick={() => startGame((document.getElementById('sweeper-level') as HTMLSelectElement)?.value || 'easy')}
          className="bg-white text-black px-4 py-2 font-mono hover:bg-gray-200 transition-colors"
        >
          Start Game
        </button>
      </div>
      
      <canvas 
        ref={canvasRef}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        className="border-2 border-white bg-gray-300 mb-4"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      <div id="sweeper-status" className="text-white font-mono text-lg mb-4">
        Applications remaining: 10
      </div>
      
      <div id="sweeper-name-container" className="hidden mb-4">
        <input 
          type="text" 
          id="sweeper-player-name" 
          placeholder="Enter your name" 
          maxLength={20}
          className="bg-black text-white border border-white p-2 font-mono mr-2"
        />
        <button 
          onClick={submitScore}
          className="bg-white text-black px-4 py-2 font-mono hover:bg-gray-200 transition-colors"
        >
          Save Score
        </button>
      </div>
      
      <button 
        id="sweeper-share-button" 
        onClick={shareScore}
        className="hidden bg-blue-500 text-white px-4 py-2 font-mono hover:bg-blue-600 transition-colors mb-4"
      >
        Share Score on X
      </button>
      
      <div className="mt-8 max-w-md mx-auto">
        <h3 className="text-white font-mono text-xl mb-4">Leaderboard</h3>
        <table className="w-full border border-white text-white font-mono text-sm">
          <thead>
            <tr className="bg-white text-black">
              <th className="border border-black p-2">Rank</th>
              <th className="border border-black p-2">Name</th>
              <th className="border border-black p-2">Time (s)</th>
              <th className="border border-black p-2">Difficulty</th>
            </tr>
          </thead>
          <tbody id="sweeper-leaderboard-body"></tbody>
        </table>
      </div>
      
      <div className="mt-4 text-white font-mono text-sm">
        <p className="mb-2">How to play:</p>
        <p>Left click to reveal cells, right click to flag applications</p>
        <p>Numbers show how many applications are adjacent to that cell</p>
        <p>Avoid clicking on the hidden job applications!</p>
      </div>
    </div>
  );
};

export default JobApplicationSweeper;