'use client';

import { CardType } from '../components/Card';

const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

/**
 * Creates a new deck of 52 cards
 */
export function createDeck(): CardType[] {
    const deck: CardType[] = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({
                suit,
                rank,
            });
        }
    }

    return deck;
}

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm
 */
export function shuffleDeck(deck: CardType[]): CardType[] {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Deals a specified number of cards from the deck
 */
export function dealCards(deck: CardType[], count: number): { cards: CardType[], remainingDeck: CardType[] } {
    if (count > deck.length) {
        throw new Error(`Cannot deal ${count} cards from a deck of ${deck.length} cards`);
    }

    const cards = deck.slice(0, count);
    const remainingDeck = deck.slice(count);

    return { cards, remainingDeck };
}

/**
 * Evaluates a poker hand and returns its rank and value
 * Implements standard poker hand rankings
 */
export function evaluateHand(cards: CardType[]): { rank: string; value: number; description: string } {
    if (cards.length < 5) {
        throw new Error('A poker hand must have at least 5 cards');
    }

    // Use best 5 cards if more than 5 are provided
    const bestHand = findBestHand(cards);

    return bestHand;
}

/**
 * Finds the best 5-card hand from a set of cards
 */
function findBestHand(cards: CardType[]): { rank: string; value: number; description: string } {
    if (cards.length === 5) {
        return evaluateFiveCardHand(cards);
    }

    // If more than 5 cards, find the best 5-card combination
    const combinations = getCombinations(cards, 5);
    let bestHand = { rank: 'High Card', value: 0, description: '' };

    for (const combo of combinations) {
        const evaluation = evaluateFiveCardHand(combo);
        if (evaluation.value > bestHand.value) {
            bestHand = evaluation;
        }
    }

    return bestHand;
}

/**
 * Evaluates a 5-card poker hand
 */
function evaluateFiveCardHand(cards: CardType[]): { rank: string; value: number; description: string } {
    // Check for pairs, three of a kind, etc.
    const rankCounts: Record<string, number> = {};
    const rankValues: Record<string, number> = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
        '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    for (const card of cards) {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    }

    const ranks = Object.keys(rankCounts);
    const ranksSorted = ranks.sort((a, b) => rankValues[b] - rankValues[a]);

    // Group cards by count for easier evaluation
    const pairs: string[] = [];
    let threeOfAKind: string | null = null;
    let fourOfAKind: string | null = null;

    for (const rank of ranks) {
        const count = rankCounts[rank];
        if (count === 2) pairs.push(rank);
        if (count === 3) threeOfAKind = rank;
        if (count === 4) fourOfAKind = rank;
    }

    // Check for flush (all same suit)
    const isFlush = cards.every(card => card.suit === cards[0].suit);

    // Check for straight (consecutive ranks)
    const cardValues = cards.map(card => rankValues[card.rank]).sort((a, b) => a - b);

    let isStraight = true;
    for (let i = 1; i < cardValues.length; i++) {
        if (cardValues[i] !== cardValues[i - 1] + 1) {
            isStraight = false;
            break;
        }
    }

    // Special case for A-5 straight (Ace can be low)
    if (!isStraight &&
        cardValues.includes(14) && // Ace
        cardValues.includes(2) &&
        cardValues.includes(3) &&
        cardValues.includes(4) &&
        cardValues.includes(5)) {
        isStraight = true;
        // Move Ace to the beginning for A-5 straight
        cardValues.pop(); // Remove Ace (14)
        cardValues.unshift(1); // Add Ace as 1
    }

    // Hand ranking values (higher is better)
    // Royal Flush: 9
    // Straight Flush: 8
    // Four of a Kind: 7
    // Full House: 6
    // Flush: 5
    // Straight: 4
    // Three of a Kind: 3
    // Two Pair: 2
    // One Pair: 1
    // High Card: 0

    // Determine hand rank and value
    let handRank = 'High Card';
    let handValue = 0;
    let description = '';

    // Royal Flush
    if (isFlush && isStraight && cardValues[4] === 14 && cardValues[0] === 10) {
        handRank = 'Royal Flush';
        handValue = 9 * 1000000;
        description = `Royal Flush of ${cards[0].suit}`;
    }
    // Straight Flush
    else if (isFlush && isStraight) {
        handRank = 'Straight Flush';
        handValue = 8 * 1000000 + cardValues[4]; // High card in straight
        description = `Straight Flush, ${getCardName(ranksSorted[0])} high`;
    }
    // Four of a Kind
    else if (fourOfAKind) {
        handRank = 'Four of a Kind';
        const kicker = ranks.find(r => r !== fourOfAKind) || '';
        handValue = 7 * 1000000 + rankValues[fourOfAKind] * 100 + rankValues[kicker];
        description = `Four of a Kind, ${getCardName(fourOfAKind)}s`;
    }
    // Full House
    else if (threeOfAKind && pairs.length > 0) {
        handRank = 'Full House';
        handValue = 6 * 1000000 + rankValues[threeOfAKind] * 100 + rankValues[pairs[0]];
        description = `Full House, ${getCardName(threeOfAKind)}s full of ${getCardName(pairs[0])}s`;
    }
    // Flush
    else if (isFlush) {
        handRank = 'Flush';
        handValue = 5 * 1000000;
        // Add value of each card for comparing flushes
        for (let i = 0; i < ranksSorted.length; i++) {
            handValue += rankValues[ranksSorted[i]] * Math.pow(100, 4 - i);
        }
        description = `Flush, ${getCardName(ranksSorted[0])} high`;
    }
    // Straight
    else if (isStraight) {
        handRank = 'Straight';
        handValue = 4 * 1000000 + cardValues[4]; // High card in straight
        description = `Straight, ${getCardName(ranksSorted[0])} high`;
    }
    // Three of a Kind
    else if (threeOfAKind) {
        handRank = 'Three of a Kind';
        handValue = 3 * 1000000 + rankValues[threeOfAKind] * 10000;
        // Add kickers
        const kickers = ranksSorted.filter(r => r !== threeOfAKind);
        handValue += rankValues[kickers[0]] * 100 + rankValues[kickers[1]];
        description = `Three of a Kind, ${getCardName(threeOfAKind)}s`;
    }
    // Two Pair
    else if (pairs.length >= 2) {
        handRank = 'Two Pair';
        const sortedPairs = pairs.sort((a, b) => rankValues[b] - rankValues[a]);
        handValue = 2 * 1000000 + rankValues[sortedPairs[0]] * 10000 + rankValues[sortedPairs[1]] * 100;
        // Add kicker
        const kicker = ranksSorted.find(r => !pairs.includes(r)) || '';
        handValue += rankValues[kicker];
        description = `Two Pair, ${getCardName(sortedPairs[0])}s and ${getCardName(sortedPairs[1])}s`;
    }
    // One Pair
    else if (pairs.length === 1) {
        handRank = 'One Pair';
        handValue = 1 * 1000000 + rankValues[pairs[0]] * 10000;
        // Add kickers
        const kickers = ranksSorted.filter(r => r !== pairs[0]);
        handValue += rankValues[kickers[0]] * 1000 + rankValues[kickers[1]] * 10 + rankValues[kickers[2]];
        description = `Pair of ${getCardName(pairs[0])}s`;
    }
    // High Card
    else {
        handRank = 'High Card';
        // Add value of each card for comparing high cards
        for (let i = 0; i < ranksSorted.length; i++) {
            handValue += rankValues[ranksSorted[i]] * Math.pow(100, 4 - i);
        }
        description = `High Card, ${getCardName(ranksSorted[0])}`;
    }

    return { rank: handRank, value: handValue, description };
}

/**
 * Get combinations of cards
 */
function getCombinations(cards: CardType[], k: number): CardType[][] {
    const result: CardType[][] = [];

    function backtrack(start: number, current: CardType[]) {
        if (current.length === k) {
            result.push([...current]);
            return;
        }

        for (let i = start; i < cards.length; i++) {
            current.push(cards[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }

    backtrack(0, []);
    return result;
}

/**
 * Get readable card name
 */
function getCardName(rank: string): string {
    if (rank === 'A') return 'Ace';
    if (rank === 'K') return 'King';
    if (rank === 'Q') return 'Queen';
    if (rank === 'J') return 'Jack';
    return rank;
}

/**
 * Compare two poker hands to determine the winner
 * Returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
export function compareHands(hand1: CardType[], hand2: CardType[]): number {
    const eval1 = evaluateHand(hand1);
    const eval2 = evaluateHand(hand2);

    if (eval1.value > eval2.value) return 1;
    if (eval1.value < eval2.value) return -1;
    return 0;
} 