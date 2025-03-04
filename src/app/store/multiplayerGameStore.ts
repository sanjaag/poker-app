'use client';

import { create } from 'zustand';
import { socketService, Game, Player, ErrorEvent } from '../lib/socket';
import { createDeck, shuffleDeck, dealCards } from '../lib/deck';

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

        // We're now using gameUpdated instead of playerJoined
        socket.on('gameUpdated', ({ game }) => {
            console.log('Game updated event received with players:', game.players.length);
            const { localPlayer, game: currentGame } = get();

            // Preserve the current player's reference
            const updatedLocalPlayer = game.players.find((p: Player) => p.id === localPlayer?.id) || null;

            // Preserve cards that were already dealt
            if (currentGame) {
                // Preserve community cards
                if (currentGame.communityCards.length > 0) {
                    game.communityCards = currentGame.communityCards;
                }

                // Preserve player cards
                if (currentGame.players.length > 0) {
                    game.players = game.players.map((player: Player) => {
                        const existingPlayer = currentGame.players.find(p => p.id === player.id);
                        if (existingPlayer && existingPlayer.cards.length > 0) {
                            return {
                                ...player,
                                cards: existingPlayer.cards
                            };
                        }
                        return player;
                    });
                }
            }

            // Check if we need to deal cards based on phase changes
            const needToUpdatePhase = currentGame && game.phase !== currentGame.phase;

            set({
                game,
                localPlayer: updatedLocalPlayer || localPlayer
            });

            // Deal community cards if the phase changed and we need new cards
            if (needToUpdatePhase &&
                game.communityCards.length === 0 &&
                game.phase !== 'waiting' &&
                game.phase !== 'betting') {
                console.log('Phase changed, dealing new community cards for phase:', game.phase);
                setTimeout(() => get().dealCards(), 100);
            }
        });

        socket.on('gameStarted', ({ game }) => {
            console.log('Game started event received with players:', game.players.length);
            const currentGame = get().game;

            // Preserve any existing cards
            if (currentGame) {
                if (currentGame.communityCards.length > 0) {
                    game.communityCards = currentGame.communityCards;
                }

                if (currentGame.players.length > 0) {
                    game.players = game.players.map((player: Player) => {
                        const existingPlayer = currentGame.players.find(p => p.id === player.id);
                        if (existingPlayer && existingPlayer.cards.length > 0) {
                            return {
                                ...player,
                                cards: existingPlayer.cards
                            };
                        }
                        return player;
                    });
                }
            }

            set({ game });

            // Deal cards only when game starts and players don't have cards yet
            const needToInitialDeal = game.players.some((p: Player) => p.cards.length === 0);
            if (needToInitialDeal) {
                console.log('Initial deal needed, dealing cards to players');
                setTimeout(() => get().dealCards(), 100);
            }
        });

        socket.on('playerDisconnected', ({ playerId, game }) => {
            console.log('Player disconnected event received:', playerId);
            const currentGame = get().game;

            // Preserve cards if they exist
            if (currentGame) {
                // Preserve community cards
                if (currentGame.communityCards.length > 0) {
                    game.communityCards = currentGame.communityCards;
                }

                // Preserve player cards
                if (currentGame.players.length > 0) {
                    game.players = game.players.map((player: Player) => {
                        const existingPlayer = currentGame.players.find(p => p.id === player.id);
                        if (existingPlayer && existingPlayer.cards.length > 0) {
                            return {
                                ...player,
                                cards: existingPlayer.cards
                            };
                        }
                        return player;
                    });
                }
            }

            set({ game });
        });

        socket.on('error', ({ message }: ErrorEvent) => {
            set({ error: message, isLoading: false });
        });
    },

    clearError: () => set({ error: null }),

    // Card dealing (client-side for demo)
    dealCards: () => {
        const { game, localPlayer } = get();

        if (!game || !localPlayer) return;

        // Create and shuffle a deck
        const deck = shuffleDeck(createDeck());

        // Deal 2 cards to each player if they don't already have cards
        const updatedPlayers = [...game.players];
        let remainingDeck = [...deck];

        for (let i = 0; i < updatedPlayers.length; i++) {
            // Only deal cards to players who don't have them
            if (updatedPlayers[i].cards.length === 0) {
                const { cards, remainingDeck: newDeck } = dealCards(remainingDeck, 2);
                updatedPlayers[i].cards = cards;
                remainingDeck = newDeck;
            }
        }

        // Deal community cards based on the game phase only if they're not already dealt
        let communityCards = [...game.communityCards];

        // Only deal new community cards if we don't have any yet or if we need to ensure 5 cards for showdown
        if (communityCards.length === 0 || (game.phase === 'showdown' && communityCards.length < 5)) {
            console.log(`Dealing community cards for phase: ${game.phase}`);

            switch (game.phase) {
                case 'flop':
                    // Deal 3 cards for the flop
                    communityCards = dealCards(remainingDeck, 3).cards;
                    break;
                case 'turn':
                    // Deal 4 cards total (3 for flop + 1 for turn)
                    if (communityCards.length < 3) {
                        // If we don't have flop cards yet, deal them first
                        communityCards = dealCards(remainingDeck, 3).cards;
                        remainingDeck = remainingDeck.slice(3);
                    }
                    // Add the turn card
                    if (communityCards.length === 3) {
                        communityCards = [...communityCards, ...dealCards(remainingDeck, 1).cards];
                    }
                    break;
                case 'river':
                    // Deal 5 cards total (3 for flop + 1 for turn + 1 for river)
                    if (communityCards.length < 3) {
                        // If we don't have flop cards yet, deal them first
                        communityCards = dealCards(remainingDeck, 3).cards;
                        remainingDeck = remainingDeck.slice(3);
                    }
                    // Add the turn card if needed
                    if (communityCards.length === 3) {
                        communityCards = [...communityCards, ...dealCards(remainingDeck, 1).cards];
                        remainingDeck = remainingDeck.slice(1);
                    }
                    // Add the river card
                    if (communityCards.length === 4) {
                        communityCards = [...communityCards, ...dealCards(remainingDeck, 1).cards];
                    }
                    break;
                case 'showdown':
                    // Always ensure we have all 5 cards for showdown
                    if (communityCards.length < 5) {
                        const cardsNeeded = 5 - communityCards.length;
                        communityCards = [...communityCards, ...dealCards(remainingDeck, cardsNeeded).cards];
                    }
                    break;
                default:
                    break;
            }
        }

        // Update the game state with the dealt cards
        const updatedGame = {
            ...game,
            players: updatedPlayers,
            communityCards
        };

        // Update the local player reference
        const updatedLocalPlayer = updatedPlayers.find(p => p.id === localPlayer.id) || null;

        set({
            game: updatedGame,
            localPlayer: updatedLocalPlayer
        });

        console.log(`Cards dealt: ${updatedPlayers.length} players have cards, ${communityCards.length} community cards`);
    }
})); 