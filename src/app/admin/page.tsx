'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  chips: number;
  isDealer: boolean;
  isActive: boolean;
}

interface GameData {
  id: string;
  type: string;
  players: Player[];
  phase: string;
  smallBlind: number;
  bigBlind: number;
  pot: number;
  createdAt: string;
}

// Admin credentials - in a real app, these would be stored securely on the server
const ADMIN_CREDENTIALS = [
  { username: 'admin', password: 'poker123', role: 'super-admin' },
  { username: 'moderator', password: 'mod2023', role: 'moderator' },
  { username: 'analyst', password: 'data456', role: 'analyst' },
  { username: 'observer', password: 'view789', role: 'observer' },
];

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gameData, setGameData] = useState<GameData[]>([]);
  const [statistics, setStatistics] = useState({
    totalGames: 0,
    activePlayers: 0,
    totalPlayers: 0,
    biggestPot: 0,
  });
  const [userRole, setUserRole] = useState('');

  // Mock function to fetch game data
  const fetchGameData = () => {
    // In a real implementation, this would call an API endpoint
    const mockGameData: GameData[] = [
      {
        id: 'texas-holdem-1',
        type: 'texas',
        players: [
          {
            id: 'player1',
            name: 'Alice',
            chips: 1500,
            isDealer: true,
            isActive: true,
          },
          {
            id: 'player2',
            name: 'Bob',
            chips: 2300,
            isDealer: false,
            isActive: false,
          },
          {
            id: 'player3',
            name: 'Charlie',
            chips: 800,
            isDealer: false,
            isActive: false,
          },
        ],
        phase: 'flop',
        smallBlind: 5,
        bigBlind: 10,
        pot: 75,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'omaha-1',
        type: 'omaha',
        players: [
          {
            id: 'player4',
            name: 'Diana',
            chips: 2000,
            isDealer: false,
            isActive: true,
          },
          {
            id: 'player5',
            name: 'Ethan',
            chips: 1800,
            isDealer: true,
            isActive: false,
          },
          {
            id: 'player6',
            name: 'Fiona',
            chips: 1200,
            isDealer: false,
            isActive: false,
          },
          {
            id: 'player7',
            name: 'George',
            chips: 3000,
            isDealer: false,
            isActive: false,
          },
        ],
        phase: 'turn',
        smallBlind: 10,
        bigBlind: 20,
        pot: 160,
        createdAt: new Date().toISOString(),
      },
    ];

    // Calculate statistics
    const totalPlayers = mockGameData.reduce(
      (acc, game) => acc + game.players.length,
      0
    );
    const activePlayers = mockGameData.reduce(
      (acc, game) => acc + game.players.filter((p) => p.isActive).length,
      0
    );
    const biggestPot = Math.max(...mockGameData.map((game) => game.pot));

    setGameData(mockGameData);
    setStatistics({
      totalGames: mockGameData.length,
      activePlayers,
      totalPlayers,
      biggestPot,
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGameData();
      // Update every 30 seconds
      const interval = setInterval(fetchGameData, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Check against our admin credentials
    const adminAccount = ADMIN_CREDENTIALS.find(
      (cred) => cred.username === username && cred.password === password
    );

    if (adminAccount) {
      setIsAuthenticated(true);
      setUserRole(adminAccount.role);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setUserRole('');
  };

  const formatGameType = (type: string) => {
    if (type === 'texas') return "Texas Hold'em";
    if (type === 'omaha') return 'Omaha';
    if (type === 'seven-card-stud') return 'Seven-Card Stud';
    return type;
  };

  const formatPhase = (phase: string) => {
    if (phase === 'preflop') return 'Pre-Flop';
    if (phase === 'flop') return 'Flop';
    if (phase === 'turn') return 'Turn';
    if (phase === 'river') return 'River';
    if (phase === 'showdown') return 'Showdown';
    return phase;
  };

  if (!isAuthenticated) {
    return (
      <div className='min-h-screen bg-gray-900 flex items-center justify-center p-4'>
        <div className='bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full'>
          <h1 className='text-2xl font-bold text-white mb-6 text-center'>
            Admin Login
          </h1>
          <form onSubmit={handleLogin}>
            <div className='mb-4'>
              <label className='block text-gray-300 mb-2' htmlFor='username'>
                Username
              </label>
              <input
                id='username'
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className='w-full p-3 bg-gray-700 border border-gray-600 rounded text-white'
                required
              />
            </div>
            <div className='mb-6'>
              <label className='block text-gray-300 mb-2' htmlFor='password'>
                Password
              </label>
              <input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full p-3 bg-gray-700 border border-gray-600 rounded text-white'
                required
              />
            </div>
            <button
              type='submit'
              className='w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold'
            >
              Log In
            </button>
          </form>
          <div className='mt-4 text-center'>
            <Link href='/' className='text-blue-400 hover:text-blue-300'>
              Back to Lobby
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900 p-6'>
      <div className='max-w-7xl mx-auto'>
        <header className='flex justify-between items-center mb-8'>
          <div>
            <h1 className='text-3xl font-bold text-white'>Poker Admin Panel</h1>
            <p className='text-sm text-gray-400'>Role: {userRole}</p>
          </div>
          <div className='flex items-center space-x-4'>
            <span className='text-gray-300'>Welcome, {username}</span>
            <button
              onClick={handleLogout}
              className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded'
            >
              Logout
            </button>
            <Link
              href='/'
              className='px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded'
            >
              Back to Lobby
            </Link>
          </div>
        </header>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
            <h3 className='text-xl font-semibold text-white mb-2'>
              Total Games
            </h3>
            <p className='text-3xl text-blue-400'>{statistics.totalGames}</p>
          </div>
          <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
            <h3 className='text-xl font-semibold text-white mb-2'>
              Active Players
            </h3>
            <p className='text-3xl text-green-400'>
              {statistics.activePlayers}
            </p>
          </div>
          <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
            <h3 className='text-xl font-semibold text-white mb-2'>
              Total Players
            </h3>
            <p className='text-3xl text-yellow-400'>
              {statistics.totalPlayers}
            </p>
          </div>
          <div className='bg-gray-800 p-6 rounded-lg shadow-lg'>
            <h3 className='text-xl font-semibold text-white mb-2'>
              Biggest Pot
            </h3>
            <p className='text-3xl text-red-400'>${statistics.biggestPot}</p>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-8'>
          <h2 className='text-2xl font-bold text-white mb-4'>Active Games</h2>
          <div className='overflow-x-auto'>
            <table className='w-full text-white'>
              <thead>
                <tr className='bg-gray-700'>
                  <th className='p-3 text-left'>Game ID</th>
                  <th className='p-3 text-left'>Type</th>
                  <th className='p-3 text-left'>Players</th>
                  <th className='p-3 text-left'>Phase</th>
                  <th className='p-3 text-left'>Blinds</th>
                  <th className='p-3 text-left'>Pot</th>
                  <th className='p-3 text-left'>Created</th>
                  <th className='p-3 text-left'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gameData.map((game) => (
                  <tr key={game.id} className='border-b border-gray-700'>
                    <td className='p-3'>{game.id}</td>
                    <td className='p-3'>{formatGameType(game.type)}</td>
                    <td className='p-3'>{game.players.length}</td>
                    <td className='p-3'>{formatPhase(game.phase)}</td>
                    <td className='p-3'>
                      ${game.smallBlind}/{game.bigBlind}
                    </td>
                    <td className='p-3'>${game.pot}</td>
                    <td className='p-3'>
                      {new Date(game.createdAt).toLocaleTimeString()}
                    </td>
                    <td className='p-3'>
                      <div className='flex space-x-2'>
                        <button className='px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm'>
                          Details
                        </button>
                        <Link
                          href={`/games/${game.id}?spectator=true`}
                          className='px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm'
                        >
                          Spectate
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg shadow-lg p-6'>
          <h2 className='text-2xl font-bold text-white mb-4'>
            Player Analytics
          </h2>
          <p className='text-gray-400'>
            Coming soon: Detailed player statistics and behavior analytics.
          </p>
        </div>
      </div>
    </div>
  );
}
