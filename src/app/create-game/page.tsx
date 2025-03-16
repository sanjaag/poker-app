'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CreateCustomGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameFromUrl = searchParams.get('name');
  const [playerName, setPlayerName] = useState('');
  const [gameSettings, setGameSettings] = useState({
    gameType: 'texas',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 1000,
    maxPlayers: 8,
  });
  const [generatedGameId, setGeneratedGameId] = useState('');

  useEffect(() => {
    const name = nameFromUrl || localStorage.getItem('playerName') || '';
    if (!name) {
      router.push('/');
      return;
    }
    setPlayerName(name);

    // Generate a random game ID
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedGameId(randomId);
  }, [nameFromUrl, router]);

  const handleSettingChange = (setting: string, value: number | string) => {
    setGameSettings({
      ...gameSettings,
      [setting]: value,
    });
  };

  const handleCreateGame = () => {
    // Store settings in localStorage to be used when creating the game
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    localStorage.setItem('playerName', playerName);

    // Navigate to the game room
    router.push(
      `/game/${generatedGameId}?name=${encodeURIComponent(playerName)}`
    );
  };

  return (
    <div className='min-h-screen bg-gradient-to-b from-blue-900 to-green-900 p-8'>
      <div className='max-w-3xl mx-auto'>
        <header className='flex items-center mb-8'>
          <Link href='/' className='text-white hover:text-gray-300 mr-6'>
            <svg
              className='w-6 h-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M10 19l-7-7m0 0l7-7m-7 7h18'
              />
            </svg>
          </Link>
          <h1 className='text-3xl font-bold text-white'>Create Custom Game</h1>
        </header>

        <div className='bg-gray-800 rounded-lg p-8 shadow-lg'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <h2 className='text-xl font-bold text-white mb-4'>
                Game Settings
              </h2>

              <div className='space-y-4'>
                <div>
                  <label className='block text-gray-300 mb-2'>Game Type</label>
                  <select
                    className='w-full p-3 bg-gray-700 text-white rounded border border-gray-600'
                    value={gameSettings.gameType}
                    onChange={(e) =>
                      handleSettingChange('gameType', e.target.value)
                    }
                  >
                    <option value='texas'>Texas Hold'em</option>
                    <option value='omaha'>Omaha</option>
                    <option value='seven-card-stud'>Seven-Card Stud</option>
                  </select>
                </div>

                <div>
                  <label className='block text-gray-300 mb-2'>
                    Small Blind
                  </label>
                  <input
                    type='number'
                    className='w-full p-3 bg-gray-700 text-white rounded border border-gray-600'
                    value={gameSettings.smallBlind}
                    onChange={(e) =>
                      handleSettingChange(
                        'smallBlind',
                        parseInt(e.target.value)
                      )
                    }
                    min={1}
                  />
                </div>

                <div>
                  <label className='block text-gray-300 mb-2'>Big Blind</label>
                  <input
                    type='number'
                    className='w-full p-3 bg-gray-700 text-white rounded border border-gray-600'
                    value={gameSettings.bigBlind}
                    onChange={(e) =>
                      handleSettingChange('bigBlind', parseInt(e.target.value))
                    }
                    min={2}
                  />
                </div>

                <div>
                  <label className='block text-gray-300 mb-2'>
                    Buy-in Amount
                  </label>
                  <input
                    type='number'
                    className='w-full p-3 bg-gray-700 text-white rounded border border-gray-600'
                    value={gameSettings.buyIn}
                    onChange={(e) =>
                      handleSettingChange('buyIn', parseInt(e.target.value))
                    }
                    min={100}
                    step={100}
                  />
                </div>

                <div>
                  <label className='block text-gray-300 mb-2'>
                    Max Players
                  </label>
                  <select
                    className='w-full p-3 bg-gray-700 text-white rounded border border-gray-600'
                    value={gameSettings.maxPlayers}
                    onChange={(e) =>
                      handleSettingChange(
                        'maxPlayers',
                        parseInt(e.target.value)
                      )
                    }
                  >
                    <option value={2}>2 Players</option>
                    <option value={4}>4 Players</option>
                    <option value={6}>6 Players</option>
                    <option value={8}>8 Players</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h2 className='text-xl font-bold text-white mb-4'>
                Game Information
              </h2>

              <div className='p-4 bg-gray-700 rounded mb-6'>
                <p className='text-gray-300 mb-2'>Game ID:</p>
                <p className='text-2xl font-mono text-white'>
                  {generatedGameId}
                </p>
                <p className='text-gray-400 text-sm mt-2'>
                  Share this ID with friends to let them join your game
                </p>
              </div>

              <div className='p-4 bg-gray-700 rounded mb-6'>
                <p className='text-gray-300 mb-2'>Your Name:</p>
                <p className='text-xl text-white'>{playerName}</p>
              </div>

              <div className='mt-8'>
                <button
                  onClick={handleCreateGame}
                  className='w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-md hover:bg-blue-700 transition-colors'
                >
                  Create Game Room
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
