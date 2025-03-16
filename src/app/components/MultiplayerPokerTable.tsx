'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from './Card';
import { cn } from '../lib/utils';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';
import Link from 'next/link';
import { socketService } from '../lib/socket';
import { UserSettingsModal, AddFundsPrompt } from './UserSettings';

interface MultiplayerPokerTableProps {
  roomId?: string;
  playerName?: string;
  gameType?: string;
  isSpectator?: boolean;
  selectedSeat?: number | null;
  onSeatSelect?: (position: number) => void;
}

// Update GameModal component to accept needed props
interface CustomGameModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (data: {
    gameId?: string;
    gameType?: string;
    smallBlind?: string;
    bigBlind?: string;
    buyIn?: string;
    maxPlayers?: string;
  }) => void;
  gameIdToJoin?: string;
  showGameIdField?: boolean;
  isOpen: boolean;
  playerName?: string;
  error?: string;
}

// Wrapper for CustomGameModal that handles conditional rendering to fix useState hook warning
const ModalWrapper: React.FC<CustomGameModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <CustomGameModalContent {...props} />;
};

// Content component for the modal that always renders its hooks
const CustomGameModalContent: React.FC<CustomGameModalProps> = ({
  title,
  onClose,
  onSubmit,
  gameIdToJoin,
  showGameIdField,
}) => {
  const [formData, setFormData] = useState({
    gameId: gameIdToJoin || '',
    gameType: 'texas',
    smallBlind: '5',
    bigBlind: '10',
    buyIn: '1000',
    maxPlayers: '8',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'>
      <div className='bg-gray-800 p-6 rounded-lg max-w-md w-full'>
        <h2 className='text-xl font-bold text-white mb-4'>{title}</h2>
        <form onSubmit={handleSubmit}>
          {showGameIdField && (
            <div className='mb-4'>
              <label className='block text-gray-300 mb-2'>Game ID</label>
              <input
                type='text'
                value={formData.gameId}
                onChange={(e) =>
                  setFormData({ ...formData, gameId: e.target.value })
                }
                className='w-full p-2 bg-gray-700 border border-gray-600 rounded text-white'
              />
            </div>
          )}
          <div className='flex justify-end mt-4 space-x-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-gray-600 text-white rounded'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 bg-blue-600 text-white rounded'
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export the wrapper component as CustomGameModal
const CustomGameModal = ModalWrapper;

export const MultiplayerPokerTable: React.FC<MultiplayerPokerTableProps> = ({
  roomId,
  playerName,
  gameType = 'texas',
  isSpectator = false,
  selectedSeat,
  onSeatSelect,
}) => {
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winner, setWinner] = useState<{
    id: string;
    name: string;
    handDescription: string;
  } | null>(null);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showAddFundsPrompt, setShowAddFundsPrompt] = useState(false);
  const [requiredFunds, setRequiredFunds] = useState(0);
  const [showCreateGameModal, setShowCreateGameModal] = useState(false);
  const [showJoinGameModal, setShowJoinGameModal] = useState(false);
  const [gameIdToJoin, setGameIdToJoin] = useState(''); // Renamed from localGameIdToJoin
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  // Track if we've already attempted to join
  const hasJoinedRef = useRef(false);
  // Track if socket events are already set up
  const socketEventsSetUpRef = useRef(false);

  const {
    game,
    localPlayer,
    gameId,
    error,
    isConnected,
    isLoading,
    userSettings,
    setPlayerName: setStorePlayerName,
    setGameIdToJoin: setStoreGameIdToJoin,
    createGame,
    joinGame,
    startGame,
    leaveGame,
    performAction,
    setRaiseAmount,
    handleSocketEvents,
    clearError,
  } = useMultiplayerGameStore();

  console.log('MultiplayerPokerTable rendered', {
    isConnected,
    showCreateGameModal,
    showJoinGameModal,
    game: game ? 'exists' : 'null',
    localPlayer: localPlayer ? 'exists' : 'null',
    players: game?.players?.length || 0,
    playerIds: game?.players?.map((p) => p.id) || [],
    isSpectator,
  });

  // Custom wrapper for performAction that handles raise amount
  const handleAction = useCallback(
    (action: 'check' | 'call' | 'raise' | 'fold', amount?: number) => {
      if (action === 'raise' && amount) {
        setRaiseAmount(amount);
      }
      performAction(action);
    },
    [setRaiseAmount, performAction]
  );

  // Use the player name from props if provided
  useEffect(() => {
    if (playerName) {
      setStorePlayerName(playerName);
    }
  }, [playerName, setStorePlayerName]);

  // If a roomId is provided, automatically join that game - but only once
  useEffect(() => {
    const joinRoom = async () => {
      // Only proceed if we haven't joined yet
      if (roomId && !hasJoinedRef.current) {
        setDebugMessage(
          `Attempting to join room: ${roomId}, isSpectator: ${isSpectator}`
        );
        hasJoinedRef.current = true; // Mark that we've attempted to join

        try {
          if (isSpectator) {
            // Handle spectator mode
            console.log(`Joining ${roomId} as spectator`);

            // Ensure socket is connected
            socketService.connect();

            // Set up the game ID for the store to track
            setStoreGameIdToJoin(roomId);

            // Join as spectator using the dedicated method
            socketService.joinAsSpectator(roomId);

            // Force update game state after a short delay
            setTimeout(() => {
              handleSocketEvents();
            }, 500);
          } else if (playerName) {
            // Regular player joining
            console.log(
              `Attempting to join room: ${roomId} as player ${playerName}`
            );

            // Check if this is a predefined room ID
            const isPredefinedRoom = roomId.includes('-');

            if (isPredefinedRoom) {
              // For predefined rooms like texas-holdem-1, create a game with this ID if it doesn't exist
              const gameTypeMatch = roomId.match(/^([^-]+)/);
              const derivedGameType = gameTypeMatch
                ? gameTypeMatch[1]
                : 'texas';

              // Get settings from localStorage if available
              let settings: Partial<{
                smallBlind: number;
                bigBlind: number;
                buyIn: number;
                maxPlayers: number;
                gameId: string;
              }> = {};

              try {
                const storedSettings = localStorage.getItem('gameSettings');
                settings = storedSettings ? JSON.parse(storedSettings) : {};
              } catch (e) {
                console.error('Error parsing stored settings:', e);
              }

              // Create a game with the specified room ID
              console.log(
                `Creating game for predefined room: ${roomId} with type: ${derivedGameType}`
              );
              createGame(derivedGameType, { ...settings, gameId: roomId });

              // Wait a short time then attempt to join
              setTimeout(() => {
                console.log(`Now joining room: ${roomId}`);
                setStoreGameIdToJoin(roomId);
                joinGame();
              }, 500);
            } else {
              // Regular room ID - just try to join
              setStoreGameIdToJoin(roomId);
              joinGame();
            }
          } else {
            // No player name but attempting to join - must be a spectator
            console.log(
              `No player name provided, joining ${roomId} as spectator`
            );
            socketService.connect();
            socketService.joinAsSpectator(roomId);

            // Force update game state after a short delay
            setTimeout(() => {
              handleSocketEvents();
            }, 500);
          }
        } catch (error) {
          console.error('Error joining room:', error);
          setDebugMessage(`Error joining room: ${error}`);
          // Reset the join flag to allow another attempt
          hasJoinedRef.current = false;
        }
      }
    };

    joinRoom();

    // Reset the join flag if component unmounts or if we receive a new roomId
    return () => {
      hasJoinedRef.current = false;
    };
  }, [
    roomId,
    playerName,
    setStoreGameIdToJoin,
    joinGame,
    createGame,
    isSpectator,
    handleSocketEvents,
  ]);

  // Handle socket events - but only set up once
  useEffect(() => {
    if (!socketEventsSetUpRef.current) {
      console.log('Setting up socket events');
      handleSocketEvents();
      socketEventsSetUpRef.current = true;
    }

    // Clean up socket connection when component unmounts
    return () => {
      console.log('Cleaning up socket connection');
      if (!isSpectator) {
        // Don't leave the game if in spectator mode
        leaveGame();
      }
      socketEventsSetUpRef.current = false;
    };
  }, [handleSocketEvents, leaveGame, isSpectator]);

  // Pass game type to server when creating or joining a game
  useEffect(() => {
    // This would be used when implementing different game variations
    if (gameType && game) {
      console.log(`Game type: ${gameType}`);
      // In a real implementation, we would use this to configure game rules
    }
  }, [gameType, game]);

  // Set up winner animation when a player wins
  useEffect(() => {
    if (game?.phase === 'showdown') {
      const winningPlayer = game.players.find((p) => p.isWinner);
      if (winningPlayer) {
        setWinner({
          id: winningPlayer.id,
          name: winningPlayer.name,
          handDescription: winningPlayer.handDescription || 'Winning Hand',
        });
        setShowWinnerAnimation(true);

        // Hide the animation after 3 seconds
        const timer = setTimeout(() => {
          setShowWinnerAnimation(false);
        }, 3000);

        return () => clearTimeout(timer);
      }
    } else {
      setShowWinnerAnimation(false);
      setWinner(null);
    }
  }, [game?.phase, game?.players]);

  // Log player information for debugging
  useEffect(() => {
    if (game) {
      console.log('Current game state:', {
        gameId: gameId,
        phase: game.phase,
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          isLocal: p.id === localPlayer?.id,
        })),
      });
    }
  }, [game, gameId, localPlayer]);

  // Handle seat selection
  useEffect(() => {
    if (
      selectedSeat !== undefined &&
      selectedSeat !== null &&
      playerName &&
      !isSpectator
    ) {
      // Handle the logic to actually take the seat
      console.log(`Taking seat ${selectedSeat} as ${playerName}`);

      // TODO: Implement actual seat selection logic with the server
      // For now, we'll just join the game
      if (!hasJoinedRef.current) {
        hasJoinedRef.current = true;
        setStoreGameIdToJoin(roomId || '');
        joinGame();
      }
    }
  }, [
    selectedSeat,
    playerName,
    isSpectator,
    joinGame,
    roomId,
    setStoreGameIdToJoin,
  ]);

  // Handler for checking funds before joining or creating a game
  const checkFundsForGame = useCallback(
    (requiredAmount: number) => {
      if (userSettings.funds < requiredAmount) {
        setRequiredFunds(requiredAmount);
        setShowAddFundsPrompt(true);
        return false;
      }
      return true;
    },
    [userSettings.funds]
  );

  // If we don't have a game loaded and no roomId was provided, show the welcome screen
  if (!game && !roomId) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-green-900 p-4'>
        <div className='max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden'>
          <div className='bg-green-800 p-6'>
            <h2 className='text-2xl font-bold text-white text-center'>
              Multiplayer Poker
            </h2>

            <div className='mt-3 flex justify-end'>
              <div className='flex space-x-2'>
                <button
                  onClick={() => setShowUserSettings(true)}
                  className='px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700'
                >
                  Settings
                </button>
                <Link
                  href='/management/poker-control-panel'
                  className='px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700'
                >
                  Admin
                </Link>
              </div>
            </div>
          </div>

          <div className='p-6 space-y-6'>
            <div className='text-center'>
              <div className='text-lg font-semibold'>Your Funds</div>
              <div className='text-2xl font-bold text-green-600'>
                ${userSettings.funds.toLocaleString()}
              </div>
            </div>

            <p className='text-gray-700 text-center'>
              Welcome to Multiplayer Poker! Create a new game or join an
              existing one.
            </p>

            <div className='space-y-4'>
              <button
                onClick={() => {
                  if (checkFundsForGame(1000)) {
                    setShowCreateGameModal(true);
                  }
                }}
                className='w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
              >
                Create New Game
              </button>

              <button
                onClick={() => {
                  if (checkFundsForGame(1000)) {
                    setShowJoinGameModal(true);
                  }
                }}
                className='w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
              >
                Join Game
              </button>
            </div>

            {error && (
              <div className='mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
                {error}
                <button
                  onClick={clearError}
                  className='ml-2 text-red-700 font-bold'
                >
                  ×
                </button>
              </div>
            )}

            <div className='mt-6 text-center text-sm text-gray-500 dark:text-gray-400'>
              {isConnected ? (
                <span className='text-green-500'>Connected to server</span>
              ) : (
                <span className='text-red-500'>Disconnected from server</span>
              )}
            </div>
          </div>

          {/* Create Game Modal */}
          <CustomGameModal
            isOpen={showCreateGameModal}
            onClose={() => setShowCreateGameModal(false)}
            title='Create New Game'
            onSubmit={(data) => {
              console.log('Create game modal submit', data);
              createGame(data.gameType || 'texas', {
                smallBlind: parseInt(data.smallBlind || '5'),
                bigBlind: parseInt(data.bigBlind || '10'),
                buyIn: parseInt(data.buyIn || '1000'),
                maxPlayers: parseInt(data.maxPlayers || '8'),
              });
              setShowCreateGameModal(false);
            }}
          />

          {/* Join Game Modal */}
          <CustomGameModal
            isOpen={showJoinGameModal}
            onClose={() => setShowJoinGameModal(false)}
            title='Join Game'
            gameIdToJoin={gameIdToJoin}
            showGameIdField={true}
            onSubmit={(data) => {
              console.log('Join game modal submit', data);
              if (data.gameId) {
                setGameIdToJoin(data.gameId);
                setStoreGameIdToJoin(data.gameId);
                joinGame();
              }
              setShowJoinGameModal(false);
            }}
          />

          {/* User Settings Modal */}
          <UserSettingsModal
            isOpen={showUserSettings}
            onClose={() => setShowUserSettings(false)}
          />

          {/* Add Funds Prompt */}
          <AddFundsPrompt
            isOpen={showAddFundsPrompt}
            onClose={() => setShowAddFundsPrompt(false)}
            requiredAmount={requiredFunds}
          />
        </div>
      </div>
    );
  }

  // If the game and local player are not loaded, or loading, show a loading indicator
  if (!game || (!isSpectator && !localPlayer)) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-green-900'>
        <div className='text-white text-2xl mb-4'>Loading game...</div>
        {debugMessage && (
          <div className='text-white bg-black bg-opacity-50 p-3 rounded max-w-md text-xs'>
            {debugMessage}
          </div>
        )}
        <div className='animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mt-4'></div>
      </div>
    );
  }

  return (
    <div className='relative w-full max-w-7xl mx-auto px-4 py-8 overflow-hidden'>
      {isLoading && (
        <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-gray-900 p-6 rounded-lg shadow-xl text-center'>
            <div className='mb-4 animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto'></div>
            <p className='text-white text-xl'>Loading game...</p>
          </div>
        </div>
      )}

      {error && (
        <div className='bg-red-900 text-white p-4 mb-6 rounded-lg'>
          <p className='font-bold'>Error:</p>
          <p>{error}</p>
          <button
            onClick={clearError}
            className='mt-2 px-4 py-2 bg-red-700 hover:bg-red-800 rounded'
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Game table */}
      <div
        className={cn(
          'relative w-full max-w-4xl mx-auto bg-green-800 rounded-full aspect-[2/1] shadow-xl',
          {
            'opacity-60': !isConnected || isLoading,
          }
        )}
      >
        {/* Spectator badge */}
        {isSpectator && (
          <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10'>
            <div className='bg-yellow-600 text-white px-4 py-1 rounded-full text-sm shadow-lg'>
              Spectator Mode
            </div>
          </div>
        )}

        {/* Community cards */}
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-2'>
          {game?.communityCards.map((card, index) => (
            <Card
              key={`community-${index}`}
              rank={card.rank}
              suit={card.suit}
              className='w-14 h-20 sm:w-16 sm:h-24'
            />
          ))}
          {game?.communityCards.length === 0 &&
            game?.phase !== 'waiting' &&
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className='w-14 h-20 sm:w-16 sm:h-24 bg-green-700 border border-gray-600 rounded-md'
              ></div>
            ))}
        </div>

        {/* Pot display */}
        {game && game.pot > 0 && (
          <div className='absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
            <div className='bg-gray-800 bg-opacity-75 text-white px-3 py-1 rounded-full text-lg'>
              Pot: ${game.pot}
            </div>
          </div>
        )}

        {/* Player positions - loop through 8 fixed positions and check if there's a player there */}
        {Array.from({ length: 8 }).map((_, position) => {
          // Find player at this position if any
          const player = game?.players.find((p) => p.position === position);

          // Calculate position coordinates around the table
          const angle = (position * 45 * Math.PI) / 180; // 8 positions at 45 degree intervals
          const radius = 42; // % of container
          const posX = 50 + radius * Math.sin(angle); // center X + radius * sin(angle)
          const posY = 50 - radius * Math.cos(angle); // center Y - radius * cos(angle)

          return (
            <div
              key={`position-${position}`}
              className='absolute w-28 transform -translate-x-1/2 -translate-y-1/2'
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
              }}
            >
              {player ? (
                // Player occupies this position
                <div
                  className={cn('p-2 rounded-lg text-center text-sm', {
                    'bg-blue-800': player.id === localPlayer?.id,
                    'bg-gray-800 bg-opacity-80': player.id !== localPlayer?.id,
                    'border-2 border-yellow-400': player.isDealer,
                    'border-2 border-red-500': player.isCurrentTurn,
                    'opacity-50': player.folded || !player.isConnected,
                  })}
                >
                  <div className='font-semibold text-white truncate'>
                    {player.name}
                    {player.isDealer && ' (D)'}
                  </div>
                  <div className='text-green-300'>${player.chips}</div>
                  {player.bet > 0 && (
                    <div className='text-yellow-300'>Bet: ${player.bet}</div>
                  )}
                  {player.folded && (
                    <div className='text-red-400 font-bold'>FOLDED</div>
                  )}
                  {!player.isConnected && (
                    <div className='text-gray-400 font-bold'>DISCONNECTED</div>
                  )}

                  {/* Only show cards for local player or during showdown */}
                  {((player.id === localPlayer?.id && !isSpectator) ||
                    game?.phase === 'showdown') &&
                    player.cards.length > 0 && (
                      <div className='flex justify-center mt-2 space-x-1'>
                        {player.cards.map((card, i) => (
                          <Card
                            key={`player-card-${i}`}
                            rank={card.rank}
                            suit={card.suit}
                            className='w-8 h-12'
                          />
                        ))}
                      </div>
                    )}

                  {/* Show card backs for other players */}
                  {player.id !== localPlayer?.id &&
                    game?.phase !== 'showdown' &&
                    player.cards.length > 0 && (
                      <div className='flex justify-center mt-2 space-x-1'>
                        {player.cards.map((_, i) => (
                          <div
                            key={`card-back-${i}`}
                            className='w-8 h-12 bg-red-600 rounded-md border border-white'
                          />
                        ))}
                      </div>
                    )}

                  {/* Winner highlight */}
                  {player.isWinner && (
                    <div className='mt-1 text-yellow-300 font-bold animate-pulse'>
                      WINNER
                      {player.handDescription && (
                        <div className='text-xs text-yellow-200'>
                          {player.handDescription}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Empty seat - clickable for joining
                <div
                  className='p-2 bg-gray-800 bg-opacity-30 rounded-lg text-center cursor-pointer hover:bg-gray-700 hover:bg-opacity-50 transition-colors'
                  onClick={() => onSeatSelect && onSeatSelect(position)}
                >
                  <div className='text-gray-400'>Seat {position + 1}</div>
                  <div className='text-xs text-gray-500'>Click to Join</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons - only show for active players, not spectators */}
      {game && localPlayer && !isSpectator && game.phase !== 'waiting' && (
        <div className='mt-8 flex flex-wrap justify-center gap-4'>
          <button
            onClick={() => handleAction('fold')}
            className='px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-full'
            disabled={!localPlayer.isCurrentTurn}
          >
            Fold
          </button>

          {game.currentBet <= localPlayer.bet && (
            <button
              onClick={() => handleAction('check')}
              className='px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-full'
              disabled={!localPlayer.isCurrentTurn}
            >
              Check
            </button>
          )}

          {game.currentBet > localPlayer.bet && (
            <button
              onClick={() => handleAction('call')}
              className='px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-full'
              disabled={!localPlayer.isCurrentTurn}
            >
              Call ${game.currentBet - localPlayer.bet}
            </button>
          )}

          <div className='flex items-center gap-2'>
            <button
              onClick={() => {
                const raiseAmount = game.currentBet * 2;
                handleAction('raise', raiseAmount);
              }}
              className='px-6 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-full'
              disabled={
                !localPlayer.isCurrentTurn ||
                localPlayer.chips < game.currentBet * 2
              }
            >
              Raise ${game.currentBet * 2}
            </button>
          </div>
        </div>
      )}

      {/* Join/start game buttons - don't show for spectators */}
      {!isSpectator && (!game || game.phase === 'waiting') && (
        <div className='mt-8 flex flex-wrap justify-center gap-4'>
          {!game && (
            <>
              <button
                onClick={() => setShowCreateGameModal(true)}
                className='px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-full'
              >
                Create Game
              </button>
              <button
                onClick={() => setShowJoinGameModal(true)}
                className='px-6 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-full'
              >
                Join Game
              </button>
            </>
          )}

          {game && game.players.length >= 2 && game.phase === 'waiting' && (
            <button
              onClick={startGame}
              className='px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-full'
            >
              Start Game
            </button>
          )}

          {game && game.players.length < 2 && game.phase === 'waiting' && (
            <div className='text-white bg-gray-800 p-4 rounded-lg'>
              Waiting for more players to join...
            </div>
          )}
        </div>
      )}

      {/* User settings and funds */}
      <div className='mt-6 flex justify-between'>
        <div>
          {!isSpectator && (
            <button
              onClick={() => setShowUserSettings(true)}
              className='px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded'
            >
              User Settings
            </button>
          )}
        </div>

        <div className='text-white'>
          {!isSpectator && <span>Your Funds: ${userSettings.funds}</span>}
        </div>

        <div>
          <Link
            href='/'
            className='px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded'
          >
            Back to Lobby
          </Link>
        </div>
      </div>

      {/* Game modals */}
      <CustomGameModal
        isOpen={showCreateGameModal}
        title='Create Game'
        onClose={() => setShowCreateGameModal(false)}
        onSubmit={(data) => {
          createGame(data.gameType || 'texas', {
            smallBlind: parseInt(data.smallBlind || '5'),
            bigBlind: parseInt(data.bigBlind || '10'),
            buyIn: parseInt(data.buyIn || '1000'),
            maxPlayers: parseInt(data.maxPlayers || '8'),
          });
          setShowCreateGameModal(false);
        }}
      />

      <CustomGameModal
        isOpen={showJoinGameModal}
        title='Join Game'
        onClose={() => setShowJoinGameModal(false)}
        gameIdToJoin={gameIdToJoin}
        showGameIdField={true}
        onSubmit={(data) => {
          if (data.gameId) {
            setGameIdToJoin(data.gameId);
            setStoreGameIdToJoin(data.gameId);
            joinGame();
          }
          setShowJoinGameModal(false);
        }}
      />

      {/* User settings modal */}
      <UserSettingsModal
        isOpen={showUserSettings}
        onClose={() => setShowUserSettings(false)}
      />

      {/* Add funds prompt */}
      <AddFundsPrompt
        isOpen={showAddFundsPrompt}
        requiredAmount={requiredFunds}
        onClose={() => setShowAddFundsPrompt(false)}
      />

      {/* Winner animation */}
      {showWinnerAnimation && winner && (
        <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50'>
          <div className='bg-gradient-to-r from-yellow-600 to-yellow-400 p-8 rounded-lg shadow-2xl text-center transform animate-bounce'>
            <h2 className='text-3xl font-bold text-white mb-2'>
              {winner.name} Wins!
            </h2>
            <p className='text-xl text-white'>{winner.handDescription}</p>
          </div>
        </div>
      )}
    </div>
  );
};
