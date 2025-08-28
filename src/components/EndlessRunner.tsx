import React, { useState, useEffect, useCallback } from 'react';

interface Cell {
  isRevealed: boolean;
  hasApplication: boolean;
  isFlagged: boolean;
  neighborCount: number;
}

interface Score {
  name: string;
  time: number;
  date: string;
}

const JobApplicationSweeper: React.FC = () => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [gameMode, setGameMode] = useState<'click' | 'flag'>('click');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [scores, setScores] = useState<Score[]>([]);

  const GRID_SIZE = 9;
  const APPLICATION_COUNT = 10;

  // Initialize game
  const initializeGame = useCallback(() => {
    const newGrid: Cell[][] = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => ({
        isRevealed: false,
        hasApplication: false,
        isFlagged: false,
        neighborCount: 0,
      }))
    );

    // Place applications randomly
    let applicationsPlaced = 0;
    while (applicationsPlaced < APPLICATION_COUNT) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      
      if (!newGrid[row][col].hasApplication) {
        newGrid[row][col].hasApplication = true;
        applicationsPlaced++;
      }
    }

    // Calculate neighbor counts
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!newGrid[row][col].hasApplication) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const newRow = row + dr;
              const newCol = col + dc;
              if (
                newRow >= 0 && newRow < GRID_SIZE &&
                newCol >= 0 && newCol < GRID_SIZE &&
                newGrid[newRow][newCol].hasApplication
              ) {
                count++;
              }
            }
          }
          newGrid[row][col].neighborCount = count;
        }
      }
    }

    setGrid(newGrid);
    setGameState('playing');
    setStartTime(null);
    setElapsedTime(0);
    setRevealedCount(0);
    setFlagCount(0);
  }, []);

  // Load scores from localStorage
  useEffect(() => {
    const savedScores = localStorage.getItem('jobApplicationSweeperScores');
    if (savedScores) {
      setScores(JSON.parse(savedScores));
    }
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && gameState === 'playing') {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, gameState]);

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleCellClick = (row: number, col: number) => {
    if (gameMode === 'flag') {
      toggleFlag(row, col);
    } else {
      revealCell(row, col);
    }
  };

  const revealCell = (row: number, col: number) => {
    if (gameState !== 'playing' || grid[row][col].isRevealed || grid[row][col].isFlagged) {
      return;
    }

    if (!startTime) {
      setStartTime(Date.now());
    }

    const newGrid = [...grid];
    const cellsToReveal: [number, number][] = [[row, col]];
    let newRevealedCount = revealedCount;

    while (cellsToReveal.length > 0) {
      const [currentRow, currentCol] = cellsToReveal.pop()!;
      
      if (newGrid[currentRow][currentCol].isRevealed) continue;
      
      newGrid[currentRow][currentCol].isRevealed = true;
      newRevealedCount++;

      if (newGrid[currentRow][currentCol].hasApplication) {
        setGameState('lost');
        // Play scream sound
        const audio = new Audio('/scream.mp3');
        audio.play().catch(() => {});
        break;
      }

      // Auto-reveal neighbors if no adjacent applications
      if (newGrid[currentRow][currentCol].neighborCount === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const newRow = currentRow + dr;
            const newCol = currentCol + dc;
            if (
              newRow >= 0 && newRow < GRID_SIZE &&
              newCol >= 0 && newCol < GRID_SIZE &&
              !newGrid[newRow][newCol].isRevealed &&
              !newGrid[newRow][newCol].isFlagged
            ) {
              cellsToReveal.push([newRow, newCol]);
            }
          }
        }
      }
    }

    setGrid(newGrid);
    setRevealedCount(newRevealedCount);

    // Check win condition
    if (newRevealedCount === GRID_SIZE * GRID_SIZE - APPLICATION_COUNT && gameState === 'playing') {
      setGameState('won');
    }
  };

  const toggleFlag = (row: number, col: number) => {
    if (gameState !== 'playing' || grid[row][col].isRevealed) {
      return;
    }

    const newGrid = [...grid];
    newGrid[row][col].isFlagged = !newGrid[row][col].isFlagged;
    setGrid(newGrid);
    setFlagCount(prev => newGrid[row][col].isFlagged ? prev + 1 : prev - 1);
  };

  const saveScore = () => {
    if (!playerName.trim()) return;

    const newScore: Score = {
      name: playerName.trim(),
      time: elapsedTime,
      date: new Date().toISOString(),
    };

    const updatedScores = [...scores, newScore]
      .sort((a, b) => a.time - b.time)
      .slice(0, 10);

    setScores(updatedScores);
    localStorage.setItem('jobApplicationSweeperScores', JSON.stringify(updatedScores));
    setPlayerName('');
  };

  const shareScore = () => {
    const rank = scores.findIndex(score => score.name === playerName && score.time === elapsedTime) + 1;
    const text = `I just completed $Job Application Sweeper in ${elapsedTime}s! Can you beat my time?`;
    const url = 'https://www.jobapplication.meme/';
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const clearLeaderboard = () => {
    if (confirm('Are you sure you want to clear the leaderboard?')) {
      setScores([]);
      localStorage.removeItem('jobApplicationSweeperScores');
    }
  };

  const getCellContent = (cell: Cell) => {
    if (!cell.isRevealed) {
      return cell.isFlagged ? '🚩' : '';
    }
    if (cell.hasApplication) {
      return '📄';
    }
    return cell.neighborCount > 0 ? cell.neighborCount.toString() : '';
  };

  const getCellClass = (cell: Cell) => {
    let baseClass = 'w-8 h-8 border border-gray-400 flex items-center justify-center text-sm font-bold cursor-pointer select-none ';
    
    if (!cell.isRevealed) {
      baseClass += 'bg-gray-300 hover:bg-gray-200 ';
    } else {
      baseClass += 'bg-white ';
      if (cell.hasApplication) {
        baseClass += 'bg-red-200 ';
      }
    }
    
    return baseClass;
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-lg p-6 max-w-6xl w-full">
        <h1 className="text-2xl font-bold text-center mb-4">JOB APPLICATION SWEEPER</h1>
        
        <p className="text-sm text-gray-600 text-center mb-4">
          A minesweeper-style game where you must avoid the hidden job applications! Click to reveal safe cells and flag suspicious ones.
        </p>

        <div className="flex gap-8">
          {/* Left side - Controls and Leaderboard */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setGameMode('click')}
                  className={`px-3 py-1 text-sm border ${gameMode === 'click' ? 'bg-black text-white' : 'bg-white text-black border-black hover:bg-gray-50'}`}
                >
                  Click Mode 👆
                </button>
                <button
                  onClick={() => setGameMode('flag')}
                  className={`px-3 py-1 text-sm border ${gameMode === 'flag' ? 'bg-black text-white' : 'bg-white text-black border-black hover:bg-gray-50'}`}
                >
                  Flag Mode 🚩
                </button>
              </div>
              
              <button
                onClick={initializeGame}
                className="bg-white border-2 border-black px-4 py-2 text-sm hover:bg-gray-50 w-full"
              >
                New Game (9x9, {APPLICATION_COUNT} applications)
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div>Time: {elapsedTime}s</div>
              <div>Flags: {flagCount}/{APPLICATION_COUNT}</div>
              <div>Mode: {gameMode === 'click' ? 'Click to reveal' : 'Click to flag'}</div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Instructions:</strong></p>
              <p>• Switch between Click and Flag modes</p>
              <p>• Click mode: reveal cells</p>
              <p>• Flag mode: mark suspicious cells</p>
              <p>• Avoid the hidden job applications!</p>
              <p>• Numbers show nearby applications</p>
            </div>

            {/* Leaderboard */}
            <div className="space-y-2">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="bg-gray-500 text-white px-4 py-2 text-sm hover:bg-gray-600 w-full"
              >
                {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
              </button>

              {showLeaderboard && (
                <div className="p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm">🏆 Leaderboard</h3>
                    {scores.length > 0 && (
                      <button
                        onClick={clearLeaderboard}
                        className="text-red-500 text-xs hover:text-red-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {scores.length === 0 ? (
                    <p className="text-gray-500 text-sm">No scores yet - be the first!</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1">Rank</th>
                            <th className="text-left py-1">Name</th>
                            <th className="text-right py-1">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scores.map((score, index) => (
                            <tr 
                              key={index} 
                              className={`border-b ${index < 3 ? 'bg-yellow-100' : ''}`}
                            >
                              <td className="py-1">#{index + 1}</td>
                              <td className="py-1 truncate max-w-20">{score.name}</td>
                              <td className="py-1 text-right">{score.time}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Game Grid */}
          <div className="flex-1 flex flex-col items-center">
            <div className="grid grid-cols-9 gap-0 mb-4 border-2 border-gray-600">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={getCellClass(cell)}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {getCellContent(cell)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {gameState === 'won' && (
          <div className="text-center mb-4">
            <div className="text-green-600 font-bold mb-2">🎉 Congratulations! You won in {elapsedTime}s!</div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                maxLength={20}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveScore}
                  disabled={!playerName.trim()}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  Save Score
                </button>
                <button
                  onClick={shareScore}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  Share on X
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="text-center mb-4">
            <div className="text-red-600 font-bold mb-2">💥 Game Over! You hit a job application!</div>
            <button
              onClick={initializeGame}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobApplicationSweeper;