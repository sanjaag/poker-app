'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MultiplayerPokerTable } from '@/app/components/MultiplayerPokerTable';
import { useMultiplayerGameStore } from '@/app/store/multiplayerGameStore';

interface User {
  id: string;
  name: string;
  email?: string;
  funds: number;
}

export default function GameRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  const { userSettings } = useMultiplayerGameStore();

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        setLoggedInUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
  }, []);

  // Handle seat selection (prompts login if not logged in)
  const handleSeatSelection = (seatPosition: number) => {
    if (loggedInUser) {
      // Already logged in, can take the seat
      console.log('Taking seat position:', seatPosition);
      // This will be handled in the MultiplayerPokerTable component
      setSelectedSeat(seatPosition);
    } else {
      // Need to login first - store the seat position
      setSelectedSeat(seatPosition);
      setShowLoginModal(true);
    }
  };

  // Handle login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (isRegistering) {
      // Registration logic
      if (!loginName || !loginEmail || !loginPassword) {
        setLoginError('All fields are required');
        return;
      }

      // Mock registration - in a real app this would call an API
      const newUser: User = {
        id: `user_${Date.now()}`,
        name: loginName,
        email: loginEmail,
        funds: 1000, // Start with 1000 chips
      };

      // Store the user in localStorage
      localStorage.setItem('loggedInUser', JSON.stringify(newUser));
      setLoggedInUser(newUser);
      setShowLoginModal(false);
    } else {
      // Login logic
      if (!loginName || !loginPassword) {
        setLoginError('Both name and password are required');
        return;
      }

      // Mock login - in a real app this would validate against an API
      // For demo purposes, we'll just create a user if the name is provided
      const user: User = {
        id: `user_${Date.now()}`,
        name: loginName,
        funds: userSettings.funds, // Use funds from existing store
      };

      // Store the user in localStorage
      localStorage.setItem('loggedInUser', JSON.stringify(user));
      setLoggedInUser(user);
      setShowLoginModal(false);
    }
  };

  // Log out
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setLoggedInUser(null);
    setSelectedSeat(null);
  };

  // Handle back to lobby button
  const handleBackToLobby = () => {
    router.push('/');
  };

  return (
    <div className='min-h-screen bg-gradient-to-b from-blue-900 to-green-900'>
      {/* Header with room info */}
      <header className='bg-gray-800 p-4 flex justify-between items-center'>
        <div>
          <h1 className='text-xl font-bold text-white'>Room: {roomId}</h1>
          {loggedInUser ? (
            <p className='text-sm text-gray-300'>
              {selectedSeat !== null
                ? `Playing as: ${loggedInUser.name} (Seat ${
                    selectedSeat + 1
                  }) (${loggedInUser.funds})`
                : `Spectating as: ${loggedInUser.name} (${loggedInUser.funds})`}
            </p>
          ) : (
            <p className='text-sm text-gray-300'>
              Spectating - Click on an empty seat to join the game
            </p>
          )}
        </div>

        <div className='flex items-center space-x-3'>
          {loggedInUser ? (
            <button
              onClick={handleLogout}
              className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
            >
              Log Out
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
            >
              Login
            </button>
          )}

          <button
            onClick={handleBackToLobby}
            className='px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600'
          >
            Back to Lobby
          </button>
        </div>
      </header>

      {/* Poker table component */}
      <MultiplayerPokerTable
        roomId={roomId}
        playerName={loggedInUser ? loggedInUser.name : undefined}
        isSpectator={!loggedInUser || selectedSeat === null}
        selectedSeat={selectedSeat}
        onSeatSelect={handleSeatSelection}
      />

      {/* Login/Registration Modal */}
      {showLoginModal && (
        <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
          <div className='bg-gray-800 p-6 rounded-lg max-w-md w-full'>
            <h2 className='text-2xl font-bold text-white mb-4'>
              {selectedSeat !== null
                ? `${
                    isRegistering ? 'Create an Account' : 'Login'
                  } to Take Seat ${selectedSeat + 1}`
                : isRegistering
                ? 'Create an Account'
                : 'Login'}
            </h2>

            {loginError && (
              <div className='mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 text-red-100 rounded'>
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit}>
              <div className='mb-4'>
                <label className='block text-gray-300 mb-2'>Name</label>
                <input
                  type='text'
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className='w-full p-3 bg-gray-700 border border-gray-600 rounded text-white'
                />
              </div>

              {isRegistering && (
                <div className='mb-4'>
                  <label className='block text-gray-300 mb-2'>Email</label>
                  <input
                    type='email'
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className='w-full p-3 bg-gray-700 border border-gray-600 rounded text-white'
                  />
                </div>
              )}

              <div className='mb-6'>
                <label className='block text-gray-300 mb-2'>Password</label>
                <input
                  type='password'
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className='w-full p-3 bg-gray-700 border border-gray-600 rounded text-white'
                />
              </div>

              <div className='flex justify-between items-center mb-6'>
                <button
                  type='button'
                  onClick={() => setIsRegistering(!isRegistering)}
                  className='text-blue-400 hover:text-blue-300'
                >
                  {isRegistering
                    ? 'Already have an account? Login'
                    : 'Need an account? Register'}
                </button>
              </div>

              <div className='flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={() => {
                    setShowLoginModal(false);
                    setSelectedSeat(null);
                  }}
                  className='px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                >
                  {isRegistering ? 'Register' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
