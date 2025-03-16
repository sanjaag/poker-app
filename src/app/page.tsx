'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  // Define default game rooms with their details
  const gameRooms = [
    {
      id: 'texas-holdem-1',
      name: "Texas Hold'em",
      description:
        'The most popular poker variant. Two hole cards, five community cards.',
      players: '2-8 players',
      blinds: '5/10',
      type: 'texas',
      image: '/images/texas-holdem.jpg', // We'll add these images later
    },
    {
      id: 'omaha-1',
      name: 'Omaha',
      description:
        'Four hole cards, must use exactly two of them with three community cards.',
      players: '2-8 players',
      blinds: '10/20',
      type: 'omaha',
      image: '/images/omaha.jpg',
    },
    {
      id: 'seven-card-stud-1',
      name: 'Seven-Card Stud',
      description:
        'No community cards. Each player gets 7 cards, 3 face down, 4 face up.',
      players: '2-8 players',
      blinds: '5/10',
      type: 'seven-card-stud',
      image: '/images/seven-card-stud.jpg',
    },
    {
      id: 'custom-game',
      name: 'Custom Game',
      description: 'Create your own poker game with custom rules and settings.',
      players: 'You decide',
      blinds: 'Custom',
      type: 'custom',
      image: '/images/custom.jpg',
    },
  ];

  const handleRoomSelection = (roomId: string) => {
    const room = gameRooms.find((r) => r.id === roomId);
    if (room?.id === 'custom-game') {
      // For custom games, we'll still need to get user info
      router.push(`/create-game`);
    } else {
      // For predefined rooms, go directly to the game as spectator
      router.push(`/games/${roomId}?spectator=true`);
    }
  };

  return (
    <main className='min-h-screen bg-gradient-to-b from-blue-900 to-green-900 p-8'>
      <div className='max-w-7xl mx-auto'>
        <header className='text-center mb-12'>
          <h1 className='text-5xl font-bold text-white mb-4'>Poker Paradise</h1>
          <p className='text-xl text-gray-300'>
            Choose your poker game and start watching or playing!
          </p>
        </header>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {gameRooms.map((room) => (
            <div
              key={room.id}
              className='bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer'
              onClick={() => handleRoomSelection(room.id)}
            >
              <div className='h-48 bg-gray-700 flex items-center justify-center'>
                <div className='text-4xl'>{room.name.split(' ')[0][0]}</div>
                {/* We'll replace this with actual images later */}
              </div>
              <div className='p-6'>
                <h3 className='text-xl font-bold text-white mb-2'>
                  {room.name}
                </h3>
                <p className='text-gray-400 mb-4'>{room.description}</p>
                <div className='flex justify-between text-sm text-gray-500'>
                  <span>{room.players}</span>
                  <span>Blinds: ${room.blinds}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
