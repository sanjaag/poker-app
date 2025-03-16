'use client';

import { useState, useEffect } from 'react';

interface GameSettings {
    gameType: string;
    smallBlind: number;
    bigBlind: number;
    buyIn: number;
    maxPlayers: number;
}

const defaultSettings: Record<string, GameSettings> = {
    texas: {
        gameType: 'texas',
        smallBlind: 5,
        bigBlind: 10,
        buyIn: 1000,
        maxPlayers: 8
    },
    omaha: {
        gameType: 'omaha',
        smallBlind: 10,
        bigBlind: 20,
        buyIn: 1000,
        maxPlayers: 6
    },
    'seven-card-stud': {
        gameType: 'seven-card-stud',
        smallBlind: 5,
        bigBlind: 10,
        buyIn: 1000,
        maxPlayers: 8
    }
};

export function useGameSettings(gameType = 'texas') {
    const [settings, setSettings] = useState<GameSettings>(defaultSettings[gameType] || defaultSettings.texas);

    // Load settings from localStorage if available
    useEffect(() => {
        const storedSettings = localStorage.getItem('gameSettings');
        if (storedSettings) {
            try {
                const parsedSettings = JSON.parse(storedSettings);
                setSettings(parsedSettings);
            } catch (e) {
                console.error('Error parsing stored game settings:', e);
            }
        } else if (gameType) {
            // If no stored settings but gameType is provided, use the defaults for that type
            setSettings(defaultSettings[gameType] || defaultSettings.texas);
        }
    }, [gameType]);

    // Update a single setting
    const updateSetting = (key: keyof GameSettings, value: any) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            // Save to localStorage
            localStorage.setItem('gameSettings', JSON.stringify(newSettings));
            return newSettings;
        });
    };

    // Update multiple settings at once
    const updateSettings = (newSettings: Partial<GameSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            // Save to localStorage
            localStorage.setItem('gameSettings', JSON.stringify(updated));
            return updated;
        });
    };

    // Set default settings for a game type
    const setDefaultsForGameType = (type: string) => {
        const typeDefaults = defaultSettings[type] || defaultSettings.texas;
        setSettings(typeDefaults);
        localStorage.setItem('gameSettings', JSON.stringify(typeDefaults));
    };

    return {
        settings,
        updateSetting,
        updateSettings,
        setDefaultsForGameType
    };
} 