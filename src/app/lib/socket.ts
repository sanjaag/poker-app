'use client';

import { io, Socket } from 'socket.io-client';
import { CardType } from '../components/Card';

// Define types for our socket events
export interface Player {
    id: string;
    name: string;
    cards: CardType[];
    chips: number;
    bet: number;
    folded: boolean;
    isDealer: boolean;
    isCurrentTurn: boolean;
    isConnected: boolean;
    position: number; // Position around the table (0-7)
    isWinner?: boolean; // Whether this player is the winner of the current round
    handDescription?: string; // Description of the player's hand (e.g., "Full House, Kings full of Queens")
}

export interface Game {
    id: string;
    gameType: string; // 'texas', 'omaha', 'seven-card-stud', etc.
    players: Player[];
    communityCards: CardType[];
    pot: number;
    currentBet: number;
    phase: 'waiting' | 'dealing' | 'betting' | 'flop' | 'turn' | 'river' | 'showdown';
    currentPlayerIndex: number;
    dealerIndex: number;
    smallBlind: number;
    bigBlind: number;
    buyIn: number;
    maxPlayers: number;
    lastRaisePlayerId: string | null;
}

export interface GameSettings {
    gameType: string;
    smallBlind: number;
    bigBlind: number;
    buyIn: number;
    maxPlayers: number;
    gameId?: string;
}

export interface GameCreatedEvent {
    gameId: string;
    player: Player;
}

export interface GameJoinedEvent {
    gameId: string;
    player: Player;
}

export interface PlayerJoinedEvent {
    player: Player;
    game: Game;
}

export interface GameStartedEvent {
    game: Game;
}

export interface GameUpdatedEvent {
    game: Game;
    lastAction?: {
        player: Player;
        action: string;
        amount?: number;
    };
}

export interface PlayerDisconnectedEvent {
    playerId: string;
    game: Game;
}

export interface ErrorEvent {
    message: string;
}

// Socket.IO client singleton
export class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private gameId: string | null = null;
    private playerId: string | null = null;
    private spectatorMode: boolean = false;
    private isReconnecting: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(): Socket {
        if (!this.socket || !this.socket.connected) {
            console.log('Creating new socket connection');

            // Cleanup any existing socket to prevent duplicate connections
            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
            }

            this.socket = io('http://localhost:3001', {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000
            });

            // Set up connection event handlers
            this.socket.on('connect', () => {
                console.log('Socket connected with ID:', this.socket?.id);
                this.reconnectAttempts = 0;
                this.isReconnecting = false;

                // Send test event to verify connection
                this.socket?.emit('test', { message: 'Hello from client' });

                // Only attempt to reconnect if we have both gameId and playerId
                // and we're not in spectator mode
                if (this.gameId && this.playerId && !this.spectatorMode) {
                    if (!this.isReconnecting) {
                        this.isReconnecting = true;
                        console.log('Attempting to reconnect to game:', this.gameId);
                        this.socket?.emit('reconnectToGame', {
                            gameId: this.gameId,
                            playerId: this.playerId
                        });
                    }
                } else if (this.gameId && this.spectatorMode) {
                    // Rejoin as spectator if that was our previous state
                    console.log('Rejoining as spectator:', this.gameId);
                    this.socket?.emit('joinAsSpectator', { gameId: this.gameId });
                }
            });

            this.socket.on('testResponse', (data) => {
                console.log('Received test response from server:', data);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            this.socket.on('reconnect_attempt', (attemptNumber) => {
                this.reconnectAttempts = attemptNumber;
                console.log(`Socket reconnection attempt ${attemptNumber}`);

                // Prevent excessive reconnect attempts
                if (attemptNumber > this.maxReconnectAttempts) {
                    console.error('Maximum reconnect attempts reached');
                    this.socket?.disconnect();
                }
            });

            this.socket.on('reconnect_failed', () => {
                console.error('Socket reconnection failed');
                this.isReconnecting = false;
            });

            // Listen for reconnect success or failure
            this.socket.on('gameJoined', () => {
                this.isReconnecting = false;
            });

            this.socket.on('error', () => {
                this.isReconnecting = false;
            });
        }

        return this.socket;
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.gameId = null;
            this.playerId = null;
            this.spectatorMode = false;
            this.isReconnecting = false;
            console.log('Socket disconnected');
        }
    }

    public createGame(playerName: string, settings: Partial<GameSettings> = {}) {
        const socket = this.connect();
        const gameSettings = {
            gameType: settings.gameType || 'texas',
            smallBlind: settings.smallBlind || 5,
            bigBlind: settings.bigBlind || 10,
            buyIn: settings.buyIn || 1000,
            maxPlayers: settings.maxPlayers || 8,
            gameId: settings.gameId
        };

        socket.emit('createGame', {
            playerName,
            gameType: gameSettings.gameType,
            settings: gameSettings
        });

        // We're joining as a player, not a spectator
        this.spectatorMode = false;
    }

    public joinGame(gameId: string, playerName: string): void {
        if (!this.socket) {
            this.connect();
        }

        // Store the current game ID
        this.gameId = gameId;

        // We're joining as a player, not a spectator
        this.spectatorMode = false;

        // Check if a player with this name already exists in the game
        this.socket?.emit('checkExistingPlayer', { gameId, playerName });

        // Only emit the joinGame event if the player doesn't already exist
        this.socket?.once('playerExists', (exists) => {
            if (!exists) {
                this.socket?.emit('joinGame', { gameId, playerName });
            } else {
                console.log(`Player ${playerName} already exists in game ${gameId}`);
                // If player already exists, just reconnect them
                this.socket?.emit('reconnectPlayer', { gameId, playerName });
            }
        });
    }

    public startGame(): void {
        this.socket?.emit('startGame');
    }

    public performAction(action: 'check' | 'call' | 'raise' | 'fold', amount?: number): void {
        this.socket?.emit('playerAction', { action, amount });
    }

    public nextPhase(): void {
        this.socket?.emit('nextPhase');
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public setGameId(gameId: string): void {
        this.gameId = gameId;
    }

    public getGameId(): string | null {
        return this.gameId;
    }

    public setPlayerId(playerId: string): void {
        this.playerId = playerId;
    }

    public getPlayerId(): string | null {
        return this.playerId;
    }

    public joinAsSpectator(gameId: string): void {
        if (!this.socket) {
            this.connect();
        }

        // Clear existing listeners to prevent duplicates
        this.socket?.off('spectatorUpdate');

        // Set the current game ID
        this.gameId = gameId;

        // Mark as spectator mode
        this.spectatorMode = true;

        console.log(`Emitting joinAsSpectator for game ${gameId}`);

        // Join as spectator
        this.socket?.emit('joinAsSpectator', { gameId });
    }

    public isInSpectatorMode(): boolean {
        return this.spectatorMode;
    }
}

export const socketService = SocketService.getInstance(); 