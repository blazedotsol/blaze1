import React, { useState } from 'react';
import TwoBoxGenerator from './components/TwoBoxGenerator';
import EndlessRunner from './components/EndlessRunner';

const App: React.FC = () => {
  const [currentGame, setCurrentGame] = useState<'jobSweeper' | 'endlessRunner'>('jobSweeper');

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <TwoBoxGenerator />
      
      <div className="w-full max-w-4xl">
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setCurrentGame('jobSweeper')}
            className={`px-4 py-2 mr-2 rounded ${
              currentGame === 'jobSweeper' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Job Application Sweeper
          </button>
          <button
            onClick={() => setCurrentGame('endlessRunner')}
            className={`px-4 py-2 rounded ${
              currentGame === 'endlessRunner' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Endless Runner
          </button>
        </div>

        {currentGame === 'endlessRunner' && <EndlessRunner />}
      </div>
    </div>
  );
};

export default App;