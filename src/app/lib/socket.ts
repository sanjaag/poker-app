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
    players: Player[];
    communityCards: CardType[];
    pot: number;
    currentBet: number;
    phase: 'waiting' | 'dealing' | 'betting' | 'flop' | 'turn' | 'river' | 'showdown';
    currentPlayerIndex: number;
    dealerIndex: number;
    smallBlind: number;
    bigBlind: number;
    lastRaisePlayerId: string | null;
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
class SocketService {
    private static instance: SocketService;
    private socket: Socket | null = null;
    private gameId: string | null = null;
    private playerId: string | null = null;

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
            this.socket = io('http://localhost:3001', {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            // Set up connection event handlers
            this.socket.on('connect', () => {
                console.log('Socket connected with ID:', this.socket?.id);

                // Send test event to verify connection
                this.socket?.emit('test', { message: 'Hello from client' });

                // If we have a game ID and player ID, try to reconnect to the game
                if (this.gameId && this.playerId) {
                    console.log('Attempting to reconnect to game:', this.gameId);
                    this.socket?.emit('reconnectToGame', {
                        gameId: this.gameId,
                        playerId: this.playerId
                    });
                }
            });

            this.socket.on('testResponse', (data) => {
                console.log('Received test response from server:', data);
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

            this.socket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Socket reconnection attempt ${attemptNumber}`);
            });

            this.socket.on('reconnect_failed', () => {
                console.error('Socket reconnection failed');
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
            console.log('Socket disconnected');
        }
    }

    public createGame(playerName: string): void {
        console.log('Creating game with player name:', playerName);
        if (!this.socket) {
            console.log('Socket not connected, connecting now...');
            this.connect();
        }
        console.log('Emitting createGame event');
        this.socket?.emit('createGame', { playerName });
    }

    public joinGame(gameId: string, playerName: string): void {
        if (!this.socket) {
            this.connect();
        }
        this.socket?.emit('joinGame', { gameId, playerName });
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
}

export const socketService = SocketService.getInstance(); 