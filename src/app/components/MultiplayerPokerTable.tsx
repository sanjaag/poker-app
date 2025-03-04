'use client';

import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { cn } from '../lib/utils';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';
import { GameModal } from './GameModal';

export const MultiplayerPokerTable: React.FC = () => {
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winner, setWinner] = useState<{
    id: string;
    name: string;
    handDescription: string;
  } | null>(null);

  const {
    game,
    localPlayer,
    gameId,
    error,
    isConnected,
    isLoading,
    showJoinGameModal,
    showCreateGameModal,
    playerName,
    gameIdToJoin,
    setPlayerName,
    setGameIdToJoin,
    openCreateGameModal,
    closeCreateGameModal,
    openJoinGameModal,
    closeJoinGameModal,
    createGame,
    joinGame,
    startGame,
    leaveGame,
    performAction,
    setRaiseAmount,
    handleSocketEvents,
    clearError,
    dealCards,
  } = useMultiplayerGameStore();

  console.log('MultiplayerPokerTable rendered', {
    isConnected,
    showCreateGameModal,
    showJoinGameModal,
    game: game ? 'exists' : 'null',
    localPlayer: localPlayer ? 'exists' : 'null',
    players: game?.players?.length || 0,
    playerIds: game?.players?.map((p) => p.id) || [],
  });

  // Initialize socket connection and event handlers
  useEffect(() => {
    console.log('Setting up socket connection');
    handleSocketEvents();

    // Force deal cards for testing if needed
    if (game && game.phase !== 'waiting' && game.communityCards.length === 0) {
      dealCards();
    }

    return () => {
      console.log('Cleaning up socket connection');
      leaveGame();
    };
  }, [handleSocketEvents, leaveGame]);

  // Show winner animation when game enters showdown phase
  useEffect(() => {
    if (game?.phase === 'showdown') {
      // Find the winner (player with most chips gained in this round)
      const activePlayers = game.players.filter((p) => !p.folded);

      if (activePlayers.length > 0) {
        // Get the winner from the game state
        // The server should have determined the winner based on hand strength
        const winningPlayer =
          game.players.find(
            (p) =>
              p.isWinner || // If server marked a winner
              (activePlayers.length === 1 && p.id === activePlayers[0].id) // Or if only one player remains
          ) || activePlayers[0]; // Fallback to first active player

        setWinner({
          id: winningPlayer.id,
          name: winningPlayer.name,
          handDescription: winningPlayer.handDescription || 'Winning Hand',
        });

        setShowWinnerAnimation(true);

        // Hide the animation after 5 seconds
        const timer = setTimeout(() => {
          setShowWinnerAnimation(false);
        }, 5000);

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

  // If not connected to a game, show the lobby
  if (!game || !localPlayer) {
    return (
      <div className='min-h-screen bg-green-900 flex flex-col items-center justify-center p-4'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full'>
          <h1 className='text-3xl font-bold mb-6 text-center'>Poker Game</h1>

          <div className='space-y-4'>
            <button
              onClick={() => {
                console.log('Create game button clicked');
                openCreateGameModal();
              }}
              className='w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
            >
              Create New Game
            </button>

            <button
              onClick={() => {
                console.log('Join game button clicked');
                openJoinGameModal();
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
        <GameModal
          isOpen={showCreateGameModal}
          onClose={closeCreateGameModal}
          title='Create New Game'
          playerName={playerName}
          onPlayerNameChange={setPlayerName}
          onSubmit={() => {
            console.log('Create game modal submit');
            createGame();
          }}
          error={error}
          isLoading={isLoading}
          submitLabel='Create Game'
        />

        {/* Join Game Modal */}
        <GameModal
          isOpen={showJoinGameModal}
          onClose={closeJoinGameModal}
          title='Join Game'
          playerName={playerName}
          onPlayerNameChange={setPlayerName}
          gameId={gameIdToJoin}
          onGameIdChange={setGameIdToJoin}
          onSubmit={() => {
            console.log('Join game modal submit');
            joinGame();
          }}
          error={error}
          isLoading={isLoading}
          submitLabel='Join Game'
        />
      </div>
    );
  }

  // Calculate positions for players around the table
  const getPlayerPosition = (index: number, totalPlayers: number) => {
    // For up to 8 players, position them around the table
    // We'll use a full ellipse for positioning

    // Start at the bottom and go clockwise
    // Local player is always at the bottom (position 0)
    // We need to distribute other players evenly

    // Calculate angle based on position (in radians)
    // For 8 players, we want angles at: 0, 45, 90, 135, 180, 225, 270, 315 degrees
    const angleOffset = -90; // Start at bottom (270 degrees or -90 degrees)
    const angle =
      (index * (360 / totalPlayers) + angleOffset) * (Math.PI / 180);

    // Table is elliptical, not circular
    const horizontalRadius = 42; // % from center
    const verticalRadius = 35; // % from center (slightly smaller to account for the oval table)

    // Calculate position (center of table is 50%, 50%)
    const left = 50 + horizontalRadius * Math.cos(angle);
    const top = 50 + verticalRadius * Math.sin(angle);

    return { left, top };
  };

  // Find the current player's turn
  const currentPlayer = game.players.find((p) => p.isCurrentTurn);

  // Determine if it's the local player's turn
  const isLocalPlayerTurn = currentPlayer?.id === localPlayer.id;

  // Check if the game is waiting for players
  const isWaiting = game.phase === 'waiting';

  // Check if the game is in showdown phase
  const isShowdown = game.phase === 'showdown';

  // Handle raise with fixed amounts
  const handleRaise = (amount: number) => {
    setRaiseAmount(amount);
    performAction('raise');
  };

  return (
    <div className='min-h-screen bg-green-900 p-4 flex flex-col'>
      {/* Game info header */}
      <div className='bg-green-800 rounded-lg p-4 mb-4 text-white'>
        <div className='flex flex-wrap justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold'>Poker Game</h1>
            <p className='text-sm'>Game ID: {gameId}</p>
          </div>

          <div className='flex space-x-4'>
            <div className='text-center'>
              <p className='text-xs uppercase'>Phase</p>
              <p className='font-bold capitalize'>{game.phase}</p>
            </div>

            <div className='text-center'>
              <p className='text-xs uppercase'>Pot</p>
              <p className='font-bold'>${game.pot}</p>
            </div>

            <div className='text-center'>
              <p className='text-xs uppercase'>Current Bet</p>
              <p className='font-bold'>${game.currentBet}</p>
            </div>
          </div>

          <button
            onClick={leaveGame}
            className='px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700'
          >
            Leave Game
          </button>
        </div>
      </div>

      {/* Main game area */}
      <div className='flex-grow relative'>
        {/* Poker table */}
        <div className='relative w-full h-[500px] bg-green-700 rounded-[50%] border-8 border-amber-900 flex items-center justify-center'>
          {/* Inner table border */}
          <div className='absolute inset-8 rounded-[50%] border-4 border-green-600'></div>

          {/* Community cards */}
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-2'>
            {game.communityCards.length > 0 ? (
              game.communityCards.map((card, index) => (
                <Card
                  key={`community-${index}`}
                  suit={card.suit}
                  rank={card.rank}
                />
              ))
            ) : (
              <div className='text-white text-opacity-50'>
                {isWaiting
                  ? 'Waiting for players...'
                  : 'No community cards yet'}
              </div>
            )}
          </div>

          {/* Winner announcement animation */}
          {showWinnerAnimation && winner && (
            <div className='absolute inset-0 flex items-center justify-center z-50'>
              <div className='bg-black bg-opacity-70 p-8 rounded-xl animate-bounce shadow-lg'>
                <h2 className='text-4xl font-bold text-yellow-400 text-center mb-2'>
                  Winner!
                </h2>
                <p className='text-2xl text-white text-center'>
                  {winner.name} wins the pot!
                </p>
                <p className='text-xl text-yellow-200 text-center mt-2'>
                  {winner.handDescription}
                </p>
                <div className='mt-4 flex justify-center'>
                  <div className='animate-spin text-6xl text-yellow-400'>
                    🏆
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All players around the table (including local player) */}
          {game.players.map((player, index) => {
            const isLocalPlayer = player.id === localPlayer.id;
            const isWinner = isShowdown && winner?.id === player.id;

            // Calculate position - we'll position all players around the table
            // Local player is always at the bottom
            const playerIndex = isLocalPlayer ? 0 : index;
            const { left, top } = getPlayerPosition(
              playerIndex,
              Math.max(game.players.length, 2)
            );

            return (
              <div
                key={player.id}
                className={cn(
                  'absolute w-40 p-2 rounded-md text-white transform -translate-x-1/2 -translate-y-1/2',
                  player.folded && 'opacity-50',
                  player.isCurrentTurn && 'ring-2 ring-yellow-400',
                  isWinner && 'ring-4 ring-yellow-500',
                  isLocalPlayer ? 'bg-blue-900' : 'bg-gray-800'
                )}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  zIndex: isLocalPlayer ? 10 : 5, // Local player on top
                  transition: 'all 0.3s ease-in-out',
                  animation: isWinner ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                <div className='flex justify-between items-center mb-1'>
                  <h3 className='font-bold text-sm'>
                    {player.name}
                    {isLocalPlayer && ' (You)'}
                    {isWinner && ' 🏆'}
                  </h3>
                  <div className='flex items-center gap-1'>
                    {player.isDealer && (
                      <span className='px-1 py-0.5 bg-purple-600 text-white text-xs rounded-full'>
                        D
                      </span>
                    )}
                    {player.isCurrentTurn && (
                      <span className='px-1 py-0.5 bg-yellow-600 text-white text-xs rounded-full'>
                        Turn
                      </span>
                    )}
                  </div>
                </div>

                <div className='flex justify-between items-center mb-1'>
                  <div className='text-xs'>
                    <p>Chips: ${player.chips}</p>
                    <p>Bet: ${player.bet}</p>
                  </div>

                  {/* Player cards */}
                  <div className='flex -space-x-3'>
                    {player.cards.map((card, cardIndex) => (
                      <Card
                        key={`player-${player.id}-card-${cardIndex}`}
                        suit={card.suit}
                        rank={card.rank}
                        faceDown={!isLocalPlayer && !isShowdown}
                        className={cn(
                          'transform scale-75',
                          isWinner && 'ring-2 ring-yellow-400'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Player actions - only show for local player */}
                {isLocalPlayerTurn &&
                  isLocalPlayer &&
                  !player.folded &&
                  !isShowdown &&
                  !isWaiting && (
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {/* Check/Call button */}
                      <button
                        onClick={() =>
                          game.currentBet > player.bet
                            ? performAction('call')
                            : performAction('check')
                        }
                        disabled={game.currentBet > player.chips + player.bet}
                        className={cn(
                          'px-2 py-1 text-xs rounded',
                          game.currentBet > player.bet
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-green-600 hover:bg-green-700'
                        )}
                      >
                        {game.currentBet > player.bet
                          ? `Call $${Math.min(
                              game.currentBet - player.bet,
                              player.chips
                            )}`
                          : 'Check'}
                      </button>

                      {/* Betting options based on poker rules */}
                      <div className='flex gap-1'>
                        {/* Minimum raise (2x current bet) */}
                        {game.currentBet > 0 && (
                          <button
                            onClick={() => handleRaise(game.currentBet * 2)}
                            disabled={game.currentBet * 2 > player.chips}
                            className={cn(
                              'px-2 py-1 text-xs rounded',
                              game.currentBet * 2 <= player.chips
                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                : 'bg-gray-600 opacity-50 cursor-not-allowed'
                            )}
                          >
                            Min Raise (${game.currentBet * 2})
                          </button>
                        )}

                        {/* Half pot bet */}
                        <button
                          onClick={() => handleRaise(Math.floor(game.pot / 2))}
                          disabled={
                            Math.floor(game.pot / 2) <= game.currentBet ||
                            Math.floor(game.pot / 2) > player.chips
                          }
                          className={cn(
                            'px-2 py-1 text-xs rounded',
                            Math.floor(game.pot / 2) > game.currentBet &&
                              Math.floor(game.pot / 2) <= player.chips
                              ? 'bg-yellow-600 hover:bg-yellow-700'
                              : 'bg-gray-600 opacity-50 cursor-not-allowed'
                          )}
                        >
                          Half Pot (${Math.floor(game.pot / 2)})
                        </button>

                        {/* Full pot bet */}
                        <button
                          onClick={() => handleRaise(game.pot)}
                          disabled={
                            game.pot <= game.currentBet ||
                            game.pot > player.chips
                          }
                          className={cn(
                            'px-2 py-1 text-xs rounded',
                            game.pot > game.currentBet &&
                              game.pot <= player.chips
                              ? 'bg-yellow-600 hover:bg-yellow-700'
                              : 'bg-gray-600 opacity-50 cursor-not-allowed'
                          )}
                        >
                          Pot (${game.pot})
                        </button>

                        {/* All-in bet */}
                        <button
                          onClick={() => handleRaise(player.chips)}
                          disabled={player.chips <= game.currentBet}
                          className={cn(
                            'px-2 py-1 text-xs rounded',
                            player.chips > game.currentBet
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-gray-600 opacity-50 cursor-not-allowed'
                          )}
                        >
                          All-In (${player.chips})
                        </button>
                      </div>

                      {/* Fold button */}
                      <button
                        onClick={() => performAction('fold')}
                        className='px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700'
                      >
                        Fold
                      </button>
                    </div>
                  )}

                {player.folded && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-md'>
                    <span className='font-bold text-red-500'>FOLDED</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Game controls */}
      <div className='mt-4 flex justify-center'>
        {isWaiting && game.players.length >= 2 && (
          <button
            onClick={startGame}
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
          >
            Start Game
          </button>
        )}

        {isWaiting && game.players.length < 2 && (
          <div className='px-4 py-2 bg-gray-600 text-white rounded-md'>
            Waiting for more players to join...
          </div>
        )}

        {isShowdown && (
          <div className='px-4 py-2 bg-gray-700 text-white rounded-md'>
            Next round starting automatically...
          </div>
        )}
      </div>

      {/* Game information panel */}
      {game && !isWaiting && (
        <div className='mt-4 bg-gray-800 rounded-md p-3 text-white max-w-md mx-auto'>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <span className='text-gray-400'>Phase:</span>{' '}
              <span className='capitalize'>{game.phase}</span>
            </div>
            <div>
              <span className='text-gray-400'>Pot:</span> ${game.pot}
            </div>
            <div>
              <span className='text-gray-400'>Current Bet:</span> $
              {game.currentBet}
            </div>
            <div>
              <span className='text-gray-400'>Blinds:</span> ${game.smallBlind}
              /${game.bigBlind}
            </div>
            <div>
              <span className='text-gray-400'>Players:</span>{' '}
              {game.players.filter((p) => p.isConnected).length}/
              {game.players.length}
            </div>
            <div>
              <span className='text-gray-400'>Dealer:</span>{' '}
              {game.players.find((p) => p.isDealer)?.name || 'None'}
            </div>
          </div>
          <div className='mt-2 text-xs text-gray-400'>
            <p>
              {game.phase === 'betting' &&
                !game.communityCards.length &&
                'Pre-flop betting round'}
              {game.phase === 'flop' &&
                'Flop: First three community cards dealt'}
              {game.phase === 'turn' && 'Turn: Fourth community card dealt'}
              {game.phase === 'river' && 'River: Final community card dealt'}
              {game.phase === 'showdown' &&
                'Showdown: Players reveal their hands'}
            </p>
          </div>
        </div>
      )}

      {/* Game ID for sharing */}
      {isWaiting && (
        <div className='mt-4 text-center text-white'>
          <p>Share this Game ID with friends:</p>
          <div className='flex items-center justify-center mt-1'>
            <span className='px-4 py-2 bg-gray-800 rounded font-mono'>
              {gameId}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(gameId || '');
              }}
              className='ml-2 p-2 bg-blue-600 rounded hover:bg-blue-700'
            >
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3'
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add keyframe animation for winner pulse effect */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 215, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 215, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};
