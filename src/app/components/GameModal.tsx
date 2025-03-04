'use client';

import React from 'react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-xl font-bold'>{title}</h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          >
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
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onSubmit: () => void;
  error: string | null;
  isLoading: boolean;
  gameId?: string;
  onGameIdChange?: (gameId: string) => void;
  submitLabel: string;
}

export const GameModal: React.FC<GameModalProps> = ({
  isOpen,
  onClose,
  title,
  playerName,
  onPlayerNameChange,
  onSubmit,
  error,
  isLoading,
  gameId,
  onGameIdChange,
  submitLabel,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted, calling onSubmit');
    onSubmit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label
            htmlFor='playerName'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
          >
            Your Name
          </label>
          <input
            type='text'
            id='playerName'
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700'
            placeholder='Enter your name'
            required
          />
        </div>

        {onGameIdChange && (
          <div className='mb-4'>
            <label
              htmlFor='gameId'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Game ID
            </label>
            <input
              type='text'
              id='gameId'
              value={gameId}
              onChange={(e) => onGameIdChange(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700'
              placeholder='Enter game ID'
              required
            />
          </div>
        )}

        {error && (
          <div className='mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded'>
            {error}
          </div>
        )}

        <div className='flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='mr-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? 'Loading...' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};
