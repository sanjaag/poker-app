'use client';

import React from 'react';
import { Card } from './Card';
import { useGameStore, Player } from '../store/gameStore';
import { cn } from '../lib/utils';

export const PokerTable: React.FC = () => {
  const {
    players,
    communityCards,
    pot,
    currentBet,
    phase,
    winner,
    initializeGame,
    nextPhase,
    placeBet,
    fold,
    check,
  } = useGameStore();

  // Start a new game with 4 players if no players exist
  React.useEffect(() => {
    if (players.length === 0) {
      initializeGame(4);
    }
  }, [players.length, initializeGame]);

  const handleAction = (action: 'bet' | 'fold' | 'check', player: Player) => {
    if (!player.isCurrentTurn) return;

    switch (action) {
      case 'bet':
        // For simplicity, we'll just bet the minimum amount to call or 10 chips if no current bet
        const betAmount =
          currentBet > player.bet
            ? currentBet - player.bet // Call the current bet
            : 10; // Bet 10 chips
        placeBet(player.id, betAmount);
        break;
      case 'fold':
        fold(player.id);
        break;
      case 'check':
        check(player.id);
        break;
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-green-800 p-4'>
      {/* Game info */}
      <div className='mb-4 text-white text-center'>
        <h2 className='text-2xl font-bold mb-2'>Poker Game</h2>
        <div className='flex gap-4 justify-center'>
          <div className='bg-green-900 px-4 py-2 rounded-md'>
            <p className='text-sm'>Phase</p>
            <p className='font-bold capitalize'>{phase}</p>
          </div>
          <div className='bg-green-900 px-4 py-2 rounded-md'>
            <p className='text-sm'>Pot</p>
            <p className='font-bold'>${pot}</p>
          </div>
          <div className='bg-green-900 px-4 py-2 rounded-md'>
            <p className='text-sm'>Current Bet</p>
            <p className='font-bold'>${currentBet}</p>
          </div>
        </div>
      </div>

      {/* Winner announcement */}
      {winner && phase === 'showdown' && (
        <div className='mb-4 bg-yellow-600 text-white px-6 py-3 rounded-md text-center'>
          <h3 className='text-xl font-bold'>Winner: {winner.name}</h3>
          <p>Won ${pot} with their hand!</p>
        </div>
      )}

      {/* Community cards */}
      <div className='mb-8'>
        <h3 className='text-white text-center mb-2'>Community Cards</h3>
        <div className='flex gap-2 justify-center'>
          {communityCards.length > 0 ? (
            communityCards.map((card, index) => (
              <Card
                key={`community-${index}`}
                suit={card.suit}
                rank={card.rank}
              />
            ))
          ) : (
            <div className='text-white text-opacity-50'>
              No community cards yet
            </div>
          )}
        </div>
      </div>

      {/* Poker table */}
      <div className='relative w-full max-w-4xl h-80 bg-green-700 rounded-full border-8 border-amber-900 mb-8 flex items-center justify-center'>
        <div className='absolute inset-4 rounded-full border-4 border-green-600'></div>

        {/* Players around the table */}
        {players.map((player, index) => {
          // Calculate position around the table
          const angle = index * (360 / players.length) * (Math.PI / 180);
          const left = 50 + 35 * Math.cos(angle);
          const top = 50 + 35 * Math.sin(angle);

          return (
            <div
              key={player.id}
              className={cn(
                'absolute w-48 p-2 bg-gray-800 rounded-md text-white',
                player.folded && 'opacity-50',
                player.isCurrentTurn && 'ring-2 ring-yellow-400'
              )}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className='flex justify-between items-center mb-2'>
                <h3 className='font-bold'>{player.name}</h3>
                <div className='flex items-center gap-1'>
                  <span className='text-xs'>
                    {player.isDealer && '🎮 Dealer'}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      player.isCurrentTurn ? 'bg-yellow-600' : 'bg-gray-700'
                    )}
                  >
                    {player.isCurrentTurn ? 'Turn' : ''}
                  </span>
                </div>
              </div>

              <div className='flex justify-between items-center mb-2'>
                <div className='text-sm'>
                  <p>Chips: ${player.chips}</p>
                  <p>Bet: ${player.bet}</p>
                </div>

                {/* Player cards */}
                <div className='flex -space-x-4'>
                  {player.cards.map((card, cardIndex) => (
                    <Card
                      key={`player-${player.id}-card-${cardIndex}`}
                      suit={card.suit}
                      rank={card.rank}
                      faceDown={player.id !== 0 && phase !== 'showdown'} // Only show current player's cards
                      className='transform scale-75'
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons - only for current player and only player 0 (user) can interact */}
              {player.isCurrentTurn &&
                player.id === 0 &&
                !player.folded &&
                phase !== 'showdown' && (
                  <div className='flex gap-1 mt-2'>
                    <button
                      onClick={() => handleAction('check', player)}
                      disabled={currentBet > 0 && player.bet < currentBet}
                      className={cn(
                        'px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700',
                        currentBet > 0 &&
                          player.bet < currentBet &&
                          'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {currentBet === 0 || player.bet === currentBet
                        ? 'Check'
                        : 'Call'}
                    </button>
                    <button
                      onClick={() => handleAction('bet', player)}
                      className='px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700'
                    >
                      {currentBet > player.bet
                        ? `Call $${currentBet - player.bet}`
                        : 'Bet $10'}
                    </button>
                    <button
                      onClick={() => handleAction('fold', player)}
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

      {/* Game controls */}
      <div className='mt-4'>
        <button
          onClick={() => nextPhase()}
          className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
        >
          {phase === 'idle'
            ? 'Deal Cards'
            : phase === 'showdown'
            ? 'New Game'
            : 'Next Phase'}
        </button>
      </div>
    </div>
  );
};
