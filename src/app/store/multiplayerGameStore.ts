'use client';

import { create } from 'zustand';
import { socketService, Game, Player, ErrorEvent } from '../lib/socket';

// Define the game interface
interface MultiplayerGameState {
    // Game state
    game: Game | null;
    localPlayer: Player | null;
    gameId: string | null;
    error: string | null;
    isConnected: boolean;
    isLoading: boolean;

    // UI state
    raiseAmount: number;
    showJoinGameModal: boolean;
    showCreateGameModal: boolean;
    playerName: string;
    gameIdToJoin: string;

    // Actions
    setPlayerName: (name: string) => void;
    setGameIdToJoin: (gameId: string) => void;
    openCreateGameModal: () => void;
    closeCreateGameModal: () => void;
    openJoinGameModal: () => void;
    closeJoinGameModal: () => void;
    createGame: () => void;
    joinGame: () => void;
    startGame: () => void;
    leaveGame: () => void;
    performAction: (action: 'check' | 'call' | 'raise' | 'fold') => void;
    setRaiseAmount: (amount: number) => void;
    nextPhase: () => void;

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

    // UI state
    raiseAmount: 20, // Default raise amount
    showJoinGameModal: false,
    showCreateGameModal: false,
    playerName: '',
    gameIdToJoin: '',

    // Actions
    setPlayerName: (name) => set({ playerName: name }),

    setGameIdToJoin: (gameId) => set({ gameIdToJoin: gameId }),

    openCreateGameModal: () => set({ showCreateGameModal: true }),

    closeCreateGameModal: () => set({ showCreateGameModal: false }),

    openJoinGameModal: () => set({ showJoinGameModal: true }),

    closeJoinGameModal: () => set({ showJoinGameModal: false }),

    createGame: () => {
        const { playerName } = get();
        console.log('Creating game in store with player name:', playerName);

        if (!playerName.trim()) {
            set({ error: 'Please enter a player name' });
            return;
        }

        set({ isLoading: true, error: null });
        socketService.createGame(playerName);
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
            const { localPlayer } = get();

            // Preserve the current player's reference
            const updatedLocalPlayer = game.players.find((p: Player) => p.id === localPlayer?.id) || null;

            // Never modify the server-sent game state, just use it as is
            // This ensures all players see the same community cards and player positions
            set({
                game,
                localPlayer: updatedLocalPlayer || localPlayer
            });
        });

        socket.on('gameStarted', ({ game }) => {
            console.log('Game started event received with players:', game.players.length);
            const { localPlayer } = get();

            // Preserve the current player's reference
            const updatedLocalPlayer = game.players.find((p: Player) => p.id === localPlayer?.id) || null;

            // Never modify the server-sent game state
            set({
                game,
                localPlayer: updatedLocalPlayer || localPlayer
            });
        });

        socket.on('playerDisconnected', ({ playerId, game }) => {
            console.log('Player disconnected event received:', playerId);
            const { localPlayer } = get();

            // Preserve the current player's reference
            const updatedLocalPlayer = game.players.find((p: Player) => p.id === localPlayer?.id) || null;

            set({
                game,
                localPlayer: updatedLocalPlayer || localPlayer
            });
        });

        socket.on('error', ({ message }: ErrorEvent) => {
            set({ error: message, isLoading: false });
        });
    },

    clearError: () => set({ error: null }),

    // Card dealing (client-side for demo)
    dealCards: () => {
        console.log('Client no longer deals cards - using server-provided cards');
    }
})); 