# Multiplayer Poker App

A real-time multiplayer Texas Hold'em poker game built with Next.js, React, TypeScript, Tailwind CSS, and Socket.IO.

## Features

- Real-time multiplayer gameplay with WebSockets
- Create and join games with shareable game IDs
- Beautiful card visuals
- Game state management with Zustand
- Responsive design
- Full poker actions: check, call, raise, fold

## Game Rules

This is a simplified version of Texas Hold'em poker:

1. Each player is dealt 2 cards
2. Betting round
3. 3 community cards are dealt (the flop)
4. Betting round
5. 1 more community card is dealt (the turn)
6. Betting round
7. 1 final community card is dealt (the river)
8. Final betting round
9. Showdown - best hand wins

## How to Play

- Create a new game or join an existing one with a game ID
- Share your game ID with friends so they can join
- When it's your turn, you can:
  - Check (if no one has bet)
  - Call (match the current bet)
  - Raise (increase the bet)
  - Fold (give up your hand)
- The winner is determined automatically at the showdown

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/poker-app.git
cd poker-app
```

2. Install dependencies:
```bash
npm install
```

3. Run both the client and server concurrently:
```bash
npm run dev:all
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

5. To play with friends, they need to:
   - Run the app on their own computer
   - Click "Join Game" and enter the game ID you share with them

## Technologies Used

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Socket.IO (for real-time communication)
- Zustand (for state management)

## Project Structure

- `/src/app` - Next.js app directory
  - `/components` - React components
  - `/lib` - Utility functions and services
  - `/store` - Zustand state management
- `/server` - WebSocket server for multiplayer functionality

## Future Improvements

- Add more sophisticated hand evaluation
- Add animations for card dealing and chip movement
- Add sound effects
- Add user authentication
- Add different poker variants
- Add tournament mode

## License

This project is licensed under the MIT License - see the LICENSE file for details.
