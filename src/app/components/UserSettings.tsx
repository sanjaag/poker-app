'use client';

import React, { useState } from 'react';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AddFundsPromptProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount: number;
}

// Define theme type to match store definition
type ThemeType = 'dark' | 'light' | 'classic';

export const UserSettingsModal = ({
  isOpen,
  onClose,
}: UserSettingsModalProps) => {
  const { userSettings, addFunds, updateUserSettings } =
    useMultiplayerGameStore();
  const [fundAmount, setFundAmount] = useState(100);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(
    userSettings.theme || 'dark'
  );
  const [selectedFontSize, setSelectedFontSize] = useState(
    userSettings.fontSize || 'medium'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    userSettings.notifications !== false
  );

  if (!isOpen) return null;

  const handleAddFunds = () => {
    if (fundAmount > 0) {
      addFunds(fundAmount);
    }
  };

  const handleSaveSettings = () => {
    // Call the store's updateUserSettings with the current selected values
    updateUserSettings({
      theme: selectedTheme,
      fontSize: selectedFontSize,
      notifications: notificationsEnabled,
    });
    onClose();
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-2xl font-bold text-white'>User Settings</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-white'>
            ✕
          </button>
        </div>

        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Your Funds</h3>
          <div className='flex items-center justify-between bg-gray-700 p-3 rounded mb-3'>
            <span className='text-white'>Current Balance:</span>
            <span className='text-green-400 font-bold'>
              ${userSettings.funds}
            </span>
          </div>

          <div className='flex space-x-2'>
            <input
              type='number'
              value={fundAmount}
              onChange={(e) => setFundAmount(Number(e.target.value))}
              min='1'
              className='flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white'
            />
            <button
              onClick={handleAddFunds}
              className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded'
            >
              Add Funds
            </button>
          </div>
        </div>

        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Theme</h3>
          <div className='flex space-x-2'>
            <button
              onClick={() => setSelectedTheme('dark')}
              className={`px-4 py-2 rounded ${
                selectedTheme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setSelectedTheme('light')}
              className={`px-4 py-2 rounded ${
                selectedTheme === 'light'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setSelectedTheme('classic')}
              className={`px-4 py-2 rounded ${
                selectedTheme === 'classic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Classic
            </button>
          </div>
        </div>

        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Font Size</h3>
          <div className='flex space-x-2'>
            <button
              onClick={() => setSelectedFontSize('small')}
              className={`px-4 py-2 rounded ${
                selectedFontSize === 'small'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Small
            </button>
            <button
              onClick={() => setSelectedFontSize('medium')}
              className={`px-4 py-2 rounded ${
                selectedFontSize === 'medium'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setSelectedFontSize('large')}
              className={`px-4 py-2 rounded ${
                selectedFontSize === 'large'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Large
            </button>
          </div>
        </div>

        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>
            Notifications
          </h3>
          <div className='flex items-center'>
            <label className='inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className='sr-only peer'
              />
              <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className='ml-3 text-white'>
                {notificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        <div className='flex justify-end'>
          <button
            onClick={handleSaveSettings}
            className='px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded'
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export const AddFundsPrompt = ({
  isOpen,
  onClose,
  requiredAmount,
}: AddFundsPromptProps) => {
  const { userSettings, addFunds } = useMultiplayerGameStore();
  const [fundAmount, setFundAmount] = useState(requiredAmount);

  if (!isOpen) return null;

  const handleAddFunds = () => {
    if (fundAmount > 0) {
      addFunds(fundAmount);
      onClose();
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full'>
        <h2 className='text-2xl font-bold text-white mb-4'>
          Insufficient Funds
        </h2>

        <div className='mb-4'>
          <p className='text-white'>
            You need <span className='text-yellow-400'>${requiredAmount}</span>{' '}
            to join this game.
          </p>
          <p className='text-white'>
            Your current balance:{' '}
            <span className='text-green-400'>${userSettings.funds}</span>
          </p>
        </div>

        <div className='mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>Add Funds</h3>

          <div className='grid grid-cols-3 gap-2 mb-3'>
            <button
              onClick={() => setFundAmount(100)}
              className={`p-2 rounded ${
                fundAmount === 100 ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              $100
            </button>
            <button
              onClick={() => setFundAmount(500)}
              className={`p-2 rounded ${
                fundAmount === 500 ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              $500
            </button>
            <button
              onClick={() => setFundAmount(1000)}
              className={`p-2 rounded ${
                fundAmount === 1000 ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              $1000
            </button>
          </div>

          <div className='flex space-x-2'>
            <input
              type='number'
              value={fundAmount}
              onChange={(e) => setFundAmount(Number(e.target.value))}
              min={requiredAmount}
              className='flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white'
            />
          </div>
        </div>

        <div className='flex justify-between'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded'
          >
            Cancel
          </button>
          <button
            onClick={handleAddFunds}
            className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded'
          >
            Add ${fundAmount}
          </button>
        </div>
      </div>
    </div>
  );
};
