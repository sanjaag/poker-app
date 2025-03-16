'use client';

import { create } from 'zustand';
import { socketService, Game, Player, ErrorEvent, GameSettings } from '../lib/socket';

// Define the game interface
interface MultiplayerGameState {
    // Game state
    game: Game | null;
    localPlayer: Player | null;
    gameId: string | null;
    error: string | null;
    isConnected: boolean;
    isLoading: boolean;

    // User settings
    userSettings: {
        funds: number;
        theme: 'dark' | 'light' | 'classic';
        fontSize: 'small' | 'medium' | 'large';
        notifications: boolean;
    };

    // UI state
    raiseAmount: number;
    showJoinGameModal: boolean;
    showCreateGameModal: boolean;
    showUserSettingsModal: boolean;
    playerName: string;
    gameIdToJoin: string;

    // Actions
    setPlayerName: (name: string) => void;
    setGameIdToJoin: (gameId: string) => void;
    openCreateGameModal: () => void;
    closeCreateGameModal: () => void;
    openJoinGameModal: () => void;
    closeJoinGameModal: () => void;
    openUserSettingsModal: () => void;
    closeUserSettingsModal: () => void;
    createGame: (gameType?: string, settings?: Partial<GameSettings>) => void;
    joinGame: () => void;
    startGame: () => void;
    leaveGame: () => void;
    performAction: (action: 'check' | 'call' | 'raise' | 'fold') => void;
    setRaiseAmount: (amount: number) => void;
    nextPhase: () => void;

    // User settings actions
    addFunds: (amount: number) => void;
    updateUserSettings: (settings: Partial<MultiplayerGameState['userSettings']>) => void;

    // Socket event handlers
    handleSocketEvents: () => void;
    clearError: () => void;

    // Card dealing (client-side for demo)
    dealCards: () => void;
}

export const useMultiplayerGameStore = create<MultiplayerGameState>((set, get) => ({
    // Game state
    game: null,
    localPlayer: null,
    gameId: null,
    error: null,
    isConnected: false,
    isLoading: false,

    // User settings - load from localStorage if available
    userSettings: (() => {
        if (typeof window !== 'undefined') {
            const storedSettings = localStorage.getItem('userSettings');
            if (storedSettings) {
                try {
                    return JSON.parse(storedSettings);
                } catch (error) {
                    console.error('Error parsing user settings:', error);
                }
            }
        }
        return {
            funds: 5000, // Default starting funds
            theme: 'dark' as const,
            fontSize: 'medium' as const,
            notifications: true
        };
    })(),

    // UI state
    raiseAmount: 20, // Default raise amount
    showJoinGameModal: false,
    showCreateGameModal: false,
    showUserSettingsModal: false,
    playerName: '',
    gameIdToJoin: '',

    // Actions
    setPlayerName: (name) => set({ playerName: name }),

    setGameIdToJoin: (gameId) => set({ gameIdToJoin: gameId }),

    openCreateGameModal: () => set({ showCreateGameModal: true }),

    closeCreateGameModal: () => set({ showCreateGameModal: false }),

    openJoinGameModal: () => set({ showJoinGameModal: true }),

    closeJoinGameModal: () => set({ showJoinGameModal: false }),

    openUserSettingsModal: () => set({ showUserSettingsModal: true }),

    closeUserSettingsModal: () => set({ showUserSettingsModal: false }),

    createGame: (gameType = 'texas', settings = {}) => {
        const { playerName, userSettings } = get();
        console.log('Creating game in store with player name:', playerName, 'and game type:', gameType);

        if (!playerName.trim()) {
            set({ error: 'Please enter a player name' });
            return;
        }

        // Set initial buyIn from user funds if not specified
        const gameSettings = {
            ...settings,
            gameType,
            buyIn: settings.buyIn || Math.min(1000, userSettings.funds) // Default or capped by available funds
        };

        set({ isLoading: true, error: null });
        socketService.createGame(playerName, gameSettings);
    },

    joinGame: () => {
        const { playerName, gameIdToJoin } = get();

        if (!playerName.trim()) {
            set({ error: 'Please enter a player name' });
            return;
        }

        if (!gameIdToJoin.trim()) {
            set({ error: 'Please enter a game ID' });
            return;
        }

        set({ isLoading: true, error: null });
        socketService.joinGame(gameIdToJoin, playerName);
    },

    startGame: () => {
        socketService.startGame();
    },

    leaveGame: () => {
        socketService.disconnect();
        set({
            game: null,
            localPlayer: null,
            gameId: null,
            isConnected: false,
            isLoading: false
        });
    },

    performAction: (action) => {
        const { raiseAmount } = get();

        if (action === 'raise') {
            socketService.performAction(action, raiseAmount);
        } else {
            socketService.performAction(action);
        }
    },

    setRaiseAmount: (amount) => set({ raiseAmount: amount }),

    nextPhase: () => {
        socketService.nextPhase();
    },

    // User settings actions
    addFunds: (amount) => {
        if (amount <= 0) return;

        set(state => {
            const updatedFunds = state.userSettings.funds + amount;
            const updatedSettings = { ...state.userSettings, funds: updatedFunds };

            // Save to localStorage
            localStorage.setItem('userSettings', JSON.stringify(updatedSettings));

            return { userSettings: updatedSettings };
        });
    },

    updateUserSettings: (settings) => {
        set(state => {
            const updatedSettings = { ...state.userSettings, ...settings };

            // Save to localStorage
            localStorage.setItem('userSettings', JSON.stringify(updatedSettings));

            return { userSettings: updatedSettings };
        });
    },

    // Socket event handlers
    handleSocketEvents: () => {
        const socket = socketService.connect();
        console.log('Setting up socket event handlers');

        socket.on('connect', () => {
            console.log('Socket connected event received');
            set({ isConnected: true });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected event received');
            set({ isConnected: false });
        });

        socket.on('gameCreated', ({ gameId, player, game }) => {
            console.log('Game created event received:', gameId, player, 'with players:', game.players.length);
            socketService.setGameId(gameId);
            socketService.setPlayerId(player.id);

            set({
                gameId,
                localPlayer: player,
                game: game,
                isLoading: false,
                showCreateGameModal: false
            });
        });

        socket.on('gameJoined', ({ gameId, player, game }) => {
            console.log('Game joined event received:', gameId, player, 'with players:', game.players.length);
            socketService.setGameId(gameId);
            socketService.setPlayerId(player.id);

            set({
                gameId,
                localPlayer: player,
                game: game,
                isLoading: false,
                showJoinGameModal: false
            });
        });

        socket.on('gameUpdated', ({ game }) => {
            console.log('Game updated event received with players:', game.players.length);

            // Find the local player in the updated game state
            const localPlayerId = get().localPlayer?.id;
            const updatedLocalPlayer = localPlayerId
                ? game.players.find((p: Player) => p.id === localPlayerId)
                : null;

            set({
                game,
                localPlayer: updatedLocalPlayer,
                isLoading: false
            });
        });

        // Add a handler for spectator updates
        socket.on('spectatorUpdate', ({ game, gameId }) => {
            console.log('Spectator update received for game:', gameId, 'with players:', game.players.length);
            set({
                game,
                gameId,
                isLoading: false
            });
        });

        socket.on('gameStarted', ({ game }) => {
            console.log('Game started event received with players:', game.players.length);

            // Find the local player in the updated game state
            const localPlayerId = get().localPlayer?.id;
            const updatedLocalPlayer = localPlayerId
                ? game.players.find((p: Player) => p.id === localPlayerId)
                : null;

            set({
                game,
                localPlayer: updatedLocalPlayer,
                isLoading: false
            });
        });

        socket.on('playerDisconnected', ({ playerId, game }) => {
            console.log('Player disconnected event received:', playerId, 'with players:', game.players.length);

            // Find the local player in the updated game state
            const localPlayerId = get().localPlayer?.id;
            const updatedLocalPlayer = localPlayerId
                ? game.players.find((p: Player) => p.id === localPlayerId)
                : null;

            set({
                game,
                localPlayer: updatedLocalPlayer
            });
        });

        socket.on('error', ({ message }: ErrorEvent) => {
            console.error('Socket error received:', message);
            set({ error: message, isLoading: false });
        });
    },

    clearError: () => set({ error: null }),

    // Card dealing (client-side for demo)
    dealCards: () => {
        console.log('Client no longer deals cards - using server-provided cards');
    }
})); 