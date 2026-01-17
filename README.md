# GenAI Card Game

An AI-generated MTG-like card game where cards are dynamically created by large language models and images are generated in real-time.

## Features

- **AI-Generated Cards**: Every card is unique, generated in real-time when drawn
- **Vibe Draft System**: Players contribute words to a shared pool, then draft to build their deck's theme
- **Dynamic World Building**: The game creates a unified world from all drafted themes
- **Combination Mechanic**: Merge permanents to create entirely new cards
- **Real-time Multiplayer**: Powered by Convex for instant synchronization

## Tech Stack

- **Frontend**: React + TanStack Router
- **Backend**: Convex
- **Hosting**: Cloudflare Pages
- **AI**: Google Gemini (text) + Nano Banana (images)

## Documentation

- [Design Document](./docs/DESIGN.md)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## License

MIT
