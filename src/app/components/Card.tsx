'use client';
import React from 'react';
import { cn } from '../lib/utils';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export type CardType = {
  suit: Suit;
  rank: Rank;
  faceDown?: boolean;
};

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-black',
  spades: 'text-black',
};

export const Card: React.FC<CardType & { className?: string }> = ({
  suit,
  rank,
  faceDown = false,
  className,
}) => {
  if (faceDown) {
    return (
      <div
        className={cn(
          'relative w-16 h-24 rounded-md bg-blue-800 border-2 border-white shadow-md flex items-center justify-center',
          className
        )}
      >
        <div className='absolute inset-0 rounded-md bg-blue-800 flex items-center justify-center'>
          <div className='w-10 h-14 rounded-md border-2 border-white bg-blue-600 flex items-center justify-center'>
            <div className='w-6 h-10 rounded-sm border border-white bg-blue-400'></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-16 h-24 rounded-md bg-white border border-gray-300 shadow-md flex flex-col p-1',
        className
      )}
    >
      <div
        className={cn(
          'text-sm font-bold flex justify-between w-full',
          suitColors[suit]
        )}
      >
        <span>{rank}</span>
        <span>{suitSymbols[suit]}</span>
      </div>
      <div
        className={cn(
          'flex-grow flex items-center justify-center text-2xl',
          suitColors[suit]
        )}
      >
        {suitSymbols[suit]}
      </div>
      <div
        className={cn(
          'text-sm font-bold flex justify-between w-full rotate-180',
          suitColors[suit]
        )}
      >
        <span>{rank}</span>
        <span>{suitSymbols[suit]}</span>
      </div>
    </div>
  );
};
