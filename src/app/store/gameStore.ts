'use client';

import { create } from 'zustand';
import { CardType } from '../components/Card';
import { createDeck, shuffleDeck, dealCards, evaluateHand } from '../lib/deck';

export type Player = {
    id: number;
    name: string;
    cards: CardType[];
    chips: number;
    bet: number;
    folded: boolean;
    isDealer: boolean;
    isCurrentTurn: boolean;
    handDescription?: string; // Optional hand description for the winner
};

type GamePhase = 'idle' | 'dealing' | 'betting' | 'flop' | 'turn' | 'river' | 'showdown';

interface GameState {
    players: Player[];
    communityCards: CardType[];
    deck: CardType[];
    pot: number;
    currentBet: number;
    phase: GamePhase;
    winner: Player | null;

    // Actions
    initializeGame: (playerCount: number) => void;
    dealPlayerCards: () => void;
    dealCommunityCards: (count: number) => void;
    placeBet: (playerId: number, amount: number) => void;
    fold: (playerId: number) => void;
    check: (playerId: number) => void;
    nextPhase: () => void;
    determineWinner: () => void;
    resetGame: () => void;
    getNextPlayerIndex: (currentIndex: number) => number;
}

export const useGameStore = create<GameState>((set, get) => ({
    players: [],
    communityCards: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    phase: 'idle',
    winner: null,

    initializeGame: (playerCount) => {
        const deck = shuffleDeck(createDeck());
        const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
            id: i,
            name: `Player ${i + 1}`,
            cards: [],
            chips: 1000, // Starting chips
            bet: 0,
            folded: false,
            isDealer: i === 0, // First player is dealer
            isCurrentTurn: i === 1, // Second player starts
        }));

        set({ players, deck, phase: 'idle', pot: 0, currentBet: 0, communityCards: [], winner: null });
    },

    dealPlayerCards: () => {
        const { players, deck } = get();
        let remainingDeck = [...deck];
        const updatedPlayers = [...players];

        // Deal 2 cards to each player
        for (let i = 0; i < updatedPlayers.length; i++) {
            const { cards, remainingDeck: newDeck } = dealCards(remainingDeck, 2);
            updatedPlayers[i].cards = cards;
            remainingDeck = newDeck;
        }

        set({ players: updatedPlayers, deck: remainingDeck, phase: 'betting' });
    },

    dealCommunityCards: (count) => {
        const { deck, communityCards } = get();
        const { cards, remainingDeck } = dealCards(deck, count);

        set({
            communityCards: [...communityCards, ...cards],
            deck: remainingDeck
        });
    },

    placeBet: (playerId, amount) => {
        const { players, pot, currentBet } = get();
        const updatedPlayers = [...players];
        const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);

        if (playerIndex === -1) return;

        const player = updatedPlayers[playerIndex];

        // Ensure player has enough chips
        const actualBet = Math.min(amount, player.chips);
        player.bet += actualBet;
        player.chips -= actualBet;

        // Update current bet if this bet is higher
        const newCurrentBet = Math.max(currentBet, player.bet);

        // Move turn to next player
        const nextPlayerIndex = get().getNextPlayerIndex(playerIndex);
        if (nextPlayerIndex !== -1) {
            updatedPlayers.forEach((p, i) => {
                p.isCurrentTurn = i === nextPlayerIndex;
            });
        }

        set({
            players: updatedPlayers,
            pot: pot + actualBet,
            currentBet: newCurrentBet
        });
    },

    fold: (playerId) => {
        const { players } = get();
        const updatedPlayers = [...players];
        const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);

        if (playerIndex === -1) return;

        updatedPlayers[playerIndex].folded = true;

        // Move turn to next player
        const nextPlayerIndex = get().getNextPlayerIndex(playerIndex);
        if (nextPlayerIndex !== -1) {
            updatedPlayers.forEach((p, i) => {
                p.isCurrentTurn = i === nextPlayerIndex;
            });
        }

        set({ players: updatedPlayers });

        // Check if only one player remains
        const activePlayers = updatedPlayers.filter(p => !p.folded);
        if (activePlayers.length === 1) {
            set({ winner: activePlayers[0], phase: 'showdown' });
        }
    },

    check: (playerId) => {
        const { players, currentBet } = get();
        const updatedPlayers = [...players];
        const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);

        if (playerIndex === -1) return;

        const player = updatedPlayers[playerIndex];

        // Can only check if current bet is 0 or player has already matched it
        if (currentBet > 0 && player.bet < currentBet) {
            return; // Cannot check, must call or raise
        }

        // Move turn to next player
        const nextPlayerIndex = get().getNextPlayerIndex(playerIndex);
        if (nextPlayerIndex !== -1) {
            updatedPlayers.forEach((p, i) => {
                p.isCurrentTurn = i === nextPlayerIndex;
            });
        }

        set({ players: updatedPlayers });
    },

    nextPhase: () => {
        const { phase } = get();

        // Reset player bets for the new round
        const updatedPlayers = get().players.map(player => ({
            ...player,
            bet: 0
        }));

        switch (phase) {
            case 'idle':
                set({ phase: 'dealing' });
                get().dealPlayerCards();
                break;
            case 'betting':
                set({ phase: 'flop', players: updatedPlayers, currentBet: 0 });
                get().dealCommunityCards(3); // Deal flop (3 cards)
                break;
            case 'flop':
                set({ phase: 'turn', players: updatedPlayers, currentBet: 0 });
                get().dealCommunityCards(1); // Deal turn (1 card)
                break;
            case 'turn':
                set({ phase: 'river', players: updatedPlayers, currentBet: 0 });
                get().dealCommunityCards(1); // Deal river (1 card)
                break;
            case 'river':
                set({ phase: 'showdown', players: updatedPlayers });
                get().determineWinner();
                break;
            case 'showdown':
                get().resetGame();
                break;
            default:
                break;
        }
    },

    determineWinner: () => {
        const { players, communityCards } = get();
        const activePlayers = players.filter(p => !p.folded);

        if (activePlayers.length === 0) return;
        if (activePlayers.length === 1) {
            set({ winner: activePlayers[0] });
            return;
        }

        // Evaluate each player's hand
        const playerHands = activePlayers.map(player => {
            const allCards = [...player.cards, ...communityCards];
            const handEvaluation = evaluateHand(allCards);
            return { player, handEvaluation };
        });

        // Sort by hand value (higher is better)
        playerHands.sort((a, b) => b.handEvaluation.value - a.handEvaluation.value);

        // Winner is the first player after sorting
        const winningPlayer = playerHands[0].player;
        const winningHand = playerHands[0].handEvaluation;

        console.log(`Winner: ${winningPlayer.name} with ${winningHand.description}`);

        set({
            winner: {
                ...winningPlayer,
                handDescription: winningHand.description
            }
        });

        // Award pot to winner
        const updatedPlayers = [...players];
        const winnerIndex = updatedPlayers.findIndex(p => p.id === winningPlayer.id);
        updatedPlayers[winnerIndex].chips += get().pot;

        set({ players: updatedPlayers });
    },

    resetGame: () => {
        const { players } = get();

        // Rotate dealer position
        const dealerIndex = players.findIndex(p => p.isDealer);
        const newDealerIndex = (dealerIndex + 1) % players.length;

        const updatedPlayers = players.map((player, index) => ({
            ...player,
            cards: [],
            bet: 0,
            folded: false,
            isDealer: index === newDealerIndex,
            isCurrentTurn: index === (newDealerIndex + 1) % players.length,
        }));

        const deck = shuffleDeck(createDeck());

        set({
            players: updatedPlayers,
            communityCards: [],
            deck,
            pot: 0,
            currentBet: 0,
            phase: 'idle',
            winner: null
        });
    },

    // Helper function to find the next active player
    getNextPlayerIndex: (currentIndex: number): number => {
        const { players } = get();
        let nextIndex = (currentIndex + 1) % players.length;

        // Find the next player who hasn't folded
        while (nextIndex !== currentIndex) {
            if (!players[nextIndex].folded) {
                return nextIndex;
            }
            nextIndex = (nextIndex + 1) % players.length;

            // If we've checked all players and come back to the start, there's no valid next player
            if (nextIndex === currentIndex) {
                break;
            }
        }

        return -1; // No valid next player
    }
})); 