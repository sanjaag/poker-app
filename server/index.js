import http from 'http';
import { Server } from 'socket.io';

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store active games
const games = new Map();

// Store player connections
const players = new Map();

// Generate a random game ID
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate a random player name if not provided
function generatePlayerName() {
  const adjectives = ['Cool', 'Swift', 'Clever', 'Bold', 'Lucky'];
  const nouns = ['Player', 'Gambler', 'Shark', 'Ace', 'Dealer'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${Math.floor(Math.random() * 100)}`;
}

// Create a new game
function createGame(gameId) {
  return {
    id: gameId,
    players: [],
    deck: createDeck(),
    communityCards: [],
    pot: 0,
    currentBet: 0,
    phase: 'waiting', // waiting, dealing, betting, flop, turn, river, showdown
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlind: 5,
    bigBlind: 10,
    lastRaisePlayerId: null
  };
}

// Create a new deck of 52 cards
function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  
  return shuffleDeck(deck);
}

// Shuffle a deck of cards using the Fisher-Yates algorithm
function shuffleDeck(deck) {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Deal cards from the deck
function dealCards(deck, count) {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from a deck of ${deck.length} cards`);
  }
  
  const cards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { cards, remainingDeck };
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Test event handler
  socket.on('test', (data) => {
    console.log(`Received test event from client ${socket.id}:`, data);
    socket.emit('testResponse', { message: 'Hello from server' });
  });
  
  // Handle player reconnection
  socket.on('reconnectToGame', ({ gameId, playerId }) => {
    console.log(`Player ${playerId} attempting to reconnect to game ${gameId}`);
    
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Find the player in the game
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      socket.emit('error', { message: 'Player not found in game' });
      return;
    }
    
    // Update the player's socket ID and connection status
    const player = game.players[playerIndex];
    player.id = socket.id;
    player.isConnected = true;
    
    // Update the players map
    players.set(socket.id, { gameId, playerId: socket.id });
    
    // Join the game room
    socket.join(gameId);
    
    // Send the game state to the reconnected player
    socket.emit('gameJoined', { gameId, player, game });
    
    // Notify other players about the reconnection
    socket.to(gameId).emit('gameUpdated', { game });
    
    console.log(`Player ${playerId} successfully reconnected to game ${gameId} with new socket ID ${socket.id}`);
  });
  
  // Create a new game
  socket.on('createGame', ({ playerName }) => {
    console.log(`Creating game for player ${playerName}`);
    const gameId = generateGameId();
    const game = createGame(gameId);
    
    const player = {
      id: socket.id,
      name: playerName || generatePlayerName(),
      chips: 1000,
      cards: [],
      bet: 0,
      folded: false,
      isDealer: true,
      isCurrentTurn: false,
      isConnected: true,
      position: 0 // Add position property
    };
    
    game.players.push(player);
    games.set(gameId, game);
    players.set(socket.id, { gameId, playerId: socket.id });
    
    socket.join(gameId);
    
    // Send the complete game state to the creator
    socket.emit('gameCreated', { gameId, player, game });
    
    console.log(`Game created: ${gameId} by player ${player.name}`);
  });
  
  // Join an existing game
  socket.on('joinGame', ({ gameId, playerName }) => {
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.phase !== 'waiting') {
      socket.emit('error', { message: 'Game already started' });
      return;
    }
    
    if (game.players.length >= 8) { // Increase max players to 8
      socket.emit('error', { message: 'Game is full' });
      return;
    }
    
    // Assign position based on number of players
    const position = game.players.length;
    
    const player = {
      id: socket.id,
      name: playerName || generatePlayerName(),
      chips: 1000,
      cards: [],
      bet: 0,
      folded: false,
      isDealer: false,
      isCurrentTurn: false,
      isConnected: true,
      position: position // Add position property
    };
    
    game.players.push(player);
    players.set(socket.id, { gameId, playerId: socket.id });
    
    socket.join(gameId);
    
    // First, send the complete game state to the joining player
    socket.emit('gameJoined', { gameId, player, game });
    
    // Then, notify all players in the game (including the one who just joined) about the updated game state
    io.to(gameId).emit('gameUpdated', { game });
    
    console.log(`Player ${player.name} joined game ${gameId}`);
  });
  
  // Start the game
  socket.on('startGame', () => {
    const { gameId } = players.get(socket.id) || {};
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    if (game.phase !== 'waiting') {
      socket.emit('error', { message: 'Game already started' });
      return;
    }
    
    // Reset the deck for a new game
    game.deck = createDeck();
    
    // Initialize the game
    game.phase = 'dealing';
    game.dealerIndex = 0;
    game.currentPlayerIndex = (game.dealerIndex + 3) % game.players.length; // Start with player after big blind
    
    // Set dealer, small blind, and big blind
    game.players.forEach((player, index) => {
      player.isDealer = index === game.dealerIndex;
      player.isCurrentTurn = index === game.currentPlayerIndex;
      
      // Deal 2 hole cards to each player
      const { cards, remainingDeck } = dealCards(game.deck, 2);
      player.cards = cards;
      game.deck = remainingDeck;
      
      // Small blind (player after dealer)
      if (index === (game.dealerIndex + 1) % game.players.length) {
        player.bet = game.smallBlind;
        player.chips -= game.smallBlind;
        game.pot += game.smallBlind;
      }
      
      // Big blind (player after small blind)
      if (index === (game.dealerIndex + 2) % game.players.length) {
        player.bet = game.bigBlind;
        player.chips -= game.bigBlind;
        game.pot += game.bigBlind;
        game.currentBet = game.bigBlind;
        game.lastRaisePlayerId = player.id;
      }
    });
    
    game.phase = 'betting';
    
    // Notify all players that the game has started
    io.to(gameId).emit('gameStarted', { game });
    
    console.log(`Game ${gameId} started with ${game.players.length} players`);
  });
  
  // Player actions: check, call, raise, fold
  socket.on('playerAction', ({ action, amount }) => {
    const { gameId } = players.get(socket.id) || {};
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1 || !game.players[playerIndex].isCurrentTurn) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    const player = game.players[playerIndex];
    
    switch (action) {
      case 'fold':
        player.folded = true;
        break;
        
      case 'check':
        if (game.currentBet > player.bet) {
          socket.emit('error', { message: 'Cannot check, must call or raise' });
          return;
        }
        break;
        
      case 'call':
        const callAmount = game.currentBet - player.bet;
        if (callAmount > player.chips) {
          // All-in
          game.pot += player.chips;
          player.bet += player.chips;
          player.chips = 0;
        } else {
          game.pot += callAmount;
          player.bet = game.currentBet;
          player.chips -= callAmount;
        }
        break;
        
      case 'raise':
        if (!amount || amount <= 0) {
          socket.emit('error', { message: 'Invalid raise amount' });
          return;
        }
        
        const minRaise = game.currentBet * 2;
        if (amount < minRaise) {
          socket.emit('error', { message: `Minimum raise is ${minRaise}` });
          return;
        }
        
        if (amount > player.chips) {
          socket.emit('error', { message: 'Not enough chips' });
          return;
        }
        
        const raiseAmount = amount - player.bet;
        game.pot += raiseAmount;
        player.bet = amount;
        player.chips -= raiseAmount;
        game.currentBet = amount;
        game.lastRaisePlayerId = player.id;
        break;
        
      default:
        socket.emit('error', { message: 'Invalid action' });
        return;
    }
    
    // Move to next player
    const nextPlayerIndex = findNextActivePlayer(game, playerIndex);
    
    // If we've gone around the table and back to the last player who raised, move to next phase
    if (nextPlayerIndex === -1 || (game.lastRaisePlayerId && game.players[nextPlayerIndex].id === game.lastRaisePlayerId)) {
      advanceToNextPhase(game);
    } else {
      // Update current player
      game.players.forEach((p, i) => {
        p.isCurrentTurn = i === nextPlayerIndex;
      });
      game.currentPlayerIndex = nextPlayerIndex;
    }
    
    io.to(gameId).emit('gameUpdated', { game, lastAction: { player, action, amount } });
  });
  
  // Advance to next game phase manually (for testing)
  socket.on('nextPhase', () => {
    const { gameId } = players.get(socket.id) || {};
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    advanceToNextPhase(game);
    io.to(gameId).emit('gameUpdated', { game });
  });
  
  // Disconnect handler
  socket.on('disconnect', () => {
    const playerData = players.get(socket.id);
    if (playerData) {
      const { gameId } = playerData;
      const game = games.get(gameId);
      
      if (game) {
        const playerIndex = game.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          // Mark player as disconnected
          game.players[playerIndex].isConnected = false;
          
          // If it was this player's turn, move to next player
          if (game.players[playerIndex].isCurrentTurn) {
            const nextPlayerIndex = findNextActivePlayer(game, playerIndex);
            if (nextPlayerIndex !== -1) {
              game.players.forEach((p, i) => {
                p.isCurrentTurn = i === nextPlayerIndex;
              });
              game.currentPlayerIndex = nextPlayerIndex;
            }
          }
          
          io.to(gameId).emit('playerDisconnected', { playerId: socket.id, game });
          
          // If all players disconnected, remove the game
          const connectedPlayers = game.players.filter(p => p.isConnected);
          if (connectedPlayers.length === 0) {
            games.delete(gameId);
          }
        }
      }
      
      players.delete(socket.id);
    }
    
    console.log(`Player disconnected: ${socket.id}`);
  });
});

// Find the next active player (not folded and has chips)
function findNextActivePlayer(game, currentIndex) {
  const { players } = game;
  let nextIndex = (currentIndex + 1) % players.length;
  
  // Go around the table once
  while (nextIndex !== currentIndex) {
    if (!players[nextIndex].folded && players[nextIndex].chips > 0 && players[nextIndex].isConnected) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % players.length;
  }
  
  return -1; // No active players found
}

// Advance the game to the next phase
function advanceToNextPhase(game) {
  // Reset bets for the new round
  game.players.forEach(player => {
    player.bet = 0;
  });
  
  game.currentBet = 0;
  game.lastRaisePlayerId = null;
  
  // Deal community cards based on the phase
  switch (game.phase) {
    case 'betting':
      game.phase = 'flop';
      // Deal 3 cards for the flop
      if (game.communityCards.length === 0) {
        const { cards, remainingDeck } = dealCards(game.deck, 3);
        game.communityCards = cards;
        game.deck = remainingDeck;
        console.log('Dealt flop:', game.communityCards);
      }
      break;
    case 'flop':
      game.phase = 'turn';
      // Deal 1 card for the turn
      if (game.communityCards.length === 3) {
        const { cards, remainingDeck } = dealCards(game.deck, 1);
        game.communityCards = [...game.communityCards, ...cards];
        game.deck = remainingDeck;
        console.log('Dealt turn:', game.communityCards);
      }
      break;
    case 'turn':
      game.phase = 'river';
      // Deal 1 card for the river
      if (game.communityCards.length === 4) {
        const { cards, remainingDeck } = dealCards(game.deck, 1);
        game.communityCards = [...game.communityCards, ...cards];
        game.deck = remainingDeck;
        console.log('Dealt river:', game.communityCards);
      }
      break;
    case 'river':
      game.phase = 'showdown';
      // Ensure all 5 community cards are available for determining the winner
      if (game.communityCards.length < 5) {
        const cardsNeeded = 5 - game.communityCards.length;
        const { cards, remainingDeck } = dealCards(game.deck, cardsNeeded);
        game.communityCards = [...game.communityCards, ...cards];
        game.deck = remainingDeck;
      }
      determineWinner(game);
      break;
    case 'showdown':
      resetGame(game);
      break;
    default:
      break;
  }
  
  // Set the first active player after the dealer as the current player
  if (game.phase !== 'showdown') {
    const nextPlayerIndex = findNextActivePlayer(game, game.dealerIndex);
    if (nextPlayerIndex !== -1) {
      game.players.forEach((p, i) => {
        p.isCurrentTurn = i === nextPlayerIndex;
      });
      game.currentPlayerIndex = nextPlayerIndex;
    }
  }
}

// Determine the winner based on poker hand rankings
function determineWinner(game) {
  const activePlayers = game.players.filter(p => !p.folded);
  
  // Reset winner status from previous rounds
  game.players.forEach(player => {
    player.isWinner = false;
    player.handDescription = null;
  });
  
  if (activePlayers.length === 0) {
    return; // No active players, no winner
  }
  
  if (activePlayers.length === 1) {
    // If only one player remains, they win by default
    const winner = activePlayers[0];
    winner.chips += game.pot;
    winner.isWinner = true;
    winner.handDescription = 'Win by default (all others folded)';
    
    // Announce the winner
    io.to(game.id).emit('gameUpdated', { 
      game,
      lastAction: {
        player: winner,
        action: 'win',
        amount: game.pot,
        description: 'wins by default (all other players folded)'
      }
    });
    
    console.log(`Player ${winner.name} wins pot of $${game.pot} by default (all others folded)`);
    game.pot = 0;
    
    return;
  }
  
  // For multiple active players, evaluate hand strength
  const playerHands = [];
  
  // Evaluate each player's hand
  for (const player of activePlayers) {
    // Combine player's hole cards with community cards
    const allCards = [...player.cards, ...game.communityCards];
    
    // Evaluate the hand (simplified for server-side)
    const handRank = evaluateHand(allCards);
    
    playerHands.push({
      player,
      handRank
    });
  }
  
  // Sort players by hand strength (highest first)
  playerHands.sort((a, b) => b.handRank.value - a.handRank.value);
  
  // The winner is the player with the highest hand value
  const winner = playerHands[0].player;
  const winningHand = playerHands[0].handRank;
  
  // Mark the winner and set hand description
  winner.isWinner = true;
  winner.handDescription = winningHand.description;
  
  // Award the pot to the winner
  winner.chips += game.pot;
  
  // Log the winner
  console.log(`Player ${winner.name} wins pot of $${game.pot} with ${winningHand.description}`);
  
  // Reset the pot
  const potAmount = game.pot;
  game.pot = 0;
  
  // Announce the winner to all players
  io.to(game.id).emit('gameUpdated', { 
    game,
    lastAction: {
      player: winner,
      action: 'win',
      amount: potAmount,
      description: winningHand.description
    }
  });
}

// Server-side hand evaluation (simplified version of the client-side function)
function evaluateHand(cards) {
  // Need at least 5 cards for a poker hand
  if (cards.length < 5) {
    return { rank: 'Invalid Hand', value: 0, description: 'Not enough cards' };
  }
  
  // Find the best 5-card hand if more than 5 cards are provided
  if (cards.length > 5) {
    return findBestHand(cards);
  }
  
  return evaluateFiveCardHand(cards);
}

// Find the best 5-card hand from a set of cards
function findBestHand(cards) {
  const combinations = getCombinations(cards, 5);
  let bestHand = { rank: 'High Card', value: 0, description: 'High Card' };
  
  for (const combo of combinations) {
    const evaluation = evaluateFiveCardHand(combo);
    if (evaluation.value > bestHand.value) {
      bestHand = evaluation;
    }
  }
  
  return bestHand;
}

// Get combinations of cards
function getCombinations(cards, k) {
  const result = [];
  
  function backtrack(start, current) {
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

// Evaluate a 5-card poker hand
function evaluateFiveCardHand(cards) {
  // Check for pairs, three of a kind, etc.
  const rankCounts = {};
  const rankValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  for (const card of cards) {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  }

  const ranks = Object.keys(rankCounts);
  const ranksSorted = ranks.sort((a, b) => rankValues[b] - rankValues[a]);
  
  // Group cards by count for easier evaluation
  const pairs = [];
  let threeOfAKind = null;
  let fourOfAKind = null;
  
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

// Get readable card name
function getCardName(rank) {
  if (rank === 'A') return 'Ace';
  if (rank === 'K') return 'King';
  if (rank === 'Q') return 'Queen';
  if (rank === 'J') return 'Jack';
  return rank;
}

// Reset the game for a new round
function resetGame(game) {
  // Reset game state
  game.phase = 'waiting';
  game.communityCards = [];
  game.pot = 0;
  game.currentBet = 0;
  game.lastRaisePlayerId = null;
  
  // Create a new shuffled deck
  game.deck = createDeck();
  
  // Move the dealer button to the next player
  game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
  
  // Reset player states
  game.players.forEach(player => {
    player.cards = [];
    player.bet = 0;
    player.folded = false;
    player.isCurrentTurn = false;
    player.isDealer = false;
    player.isWinner = false;
    player.handDescription = null;
  });
  
  // Set the new dealer
  if (game.players.length > 0) {
    game.players[game.dealerIndex].isDealer = true;
  }
  
  // Automatically start the next game after a short delay
  setTimeout(() => {
    // Only start a new game if we're still in waiting phase
    if (game.phase === 'waiting' && game.players.length >= 2) {
      // Initialize the game
      game.phase = 'dealing';
      game.currentPlayerIndex = (game.dealerIndex + 3) % game.players.length; // Start with player after big blind
      
      // Deal 2 hole cards to each player
      game.players.forEach((player, index) => {
        const { cards, remainingDeck } = dealCards(game.deck, 2);
        player.cards = cards;
        game.deck = remainingDeck;
        
        player.isDealer = index === game.dealerIndex;
        player.isCurrentTurn = index === game.currentPlayerIndex;
        
        // Small blind (player after dealer)
        if (index === (game.dealerIndex + 1) % game.players.length) {
          player.bet = game.smallBlind;
          player.chips -= game.smallBlind;
          game.pot += game.smallBlind;
        }
        
        // Big blind (player after small blind)
        if (index === (game.dealerIndex + 2) % game.players.length) {
          player.bet = game.bigBlind;
          player.chips -= game.bigBlind;
          game.pot += game.bigBlind;
          game.currentBet = game.bigBlind;
          game.lastRaisePlayerId = player.id;
        }
      });
      
      // Set the phase to betting
      game.phase = 'betting';
      
      // Notify all players that the game has started
      io.to(game.id).emit('gameStarted', { game });
      
      console.log(`New round started for game ${game.id}`);
    } else {
      // Just notify clients of the reset
      io.to(game.id).emit('gameUpdated', { game });
    }
  }, 3000); // 3 second delay before starting new round
  
  // Immediately notify clients that the game has been reset
  io.to(game.id).emit('gameUpdated', { game });
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 