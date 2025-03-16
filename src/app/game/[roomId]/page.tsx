'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { MultiplayerPokerTable } from '../../components/MultiplayerPokerTable';
import Link from 'next/link';

export default function GameRoom() {
  const router = useRouter();
  const { roomId } = useParams();
  const searchParams = useSearchParams();
  const nameFromUrl = searchParams.get('name');
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [roomDetails, setRoomDetails] = useState<{
    name: string;
    type: string;
    blinds: string;
  } | null>(null);

  useEffect(() => {
    // Get player name from URL or localStorage
    const name = nameFromUrl || localStorage.getItem('playerName') || '';
    if (!name) {
      // Redirect to home if no name is provided
      router.push('/');
      return;
    }
    setPlayerName(name);

    // Fetch room details (in a real app, this would come from an API)
    // For now, we'll use hardcoded values based on the roomId
    const getRoomDetails = () => {
      const types: Record<
        string,
        { name: string; type: string; blinds: string }
      > = {
        'texas-holdem-1': {
          name: "Texas Hold'em",
          type: 'texas',
          blinds: '5/10',
        },
        'omaha-1': {
          name: 'Omaha',
          type: 'omaha',
          blinds: '10/20',
        },
        'seven-card-stud-1': {
          name: 'Seven-Card Stud',
          type: 'seven-card-stud',
          blinds: '5/10',
        },
      };

      const details = types[roomId as string];
      if (details) {
        setRoomDetails(details);
      } else {
        // Handle unknown room ID
        setRoomDetails({
          name: 'Poker Room',
          type: 'texas',
          blinds: '5/10',
        });
      }
      setIsLoading(false);
    };

    getRoomDetails();
  }, [roomId, nameFromUrl, router]);

  if (isLoading) {
    return (
      <div className='min-h-screen bg-green-900 flex items-center justify-center'>
        <div className='text-white text-2xl'>Loading game room...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-green-900 flex flex-col'>
      <header className='bg-gray-900 p-4 shadow-md'>
        <div className='max-w-7xl mx-auto flex justify-between items-center'>
          <div className='flex items-center'>
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
            <h1 className='text-xl font-bold text-white'>
              {roomDetails?.name || 'Poker Room'}
              <span className='ml-2 text-sm text-gray-400'>
                (Blinds: ${roomDetails?.blinds})
              </span>
            </h1>
          </div>
          <div className='text-gray-300'>
            Playing as:{' '}
            <span className='font-bold text-white'>{playerName}</span>
          </div>
        </div>
      </header>

      <MultiplayerPokerTable
        roomId={roomId as string}
        playerName={playerName}
        gameType={roomDetails?.type || 'texas'}
      />
    </div>
  );
}
