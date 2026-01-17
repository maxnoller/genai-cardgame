# GenAI Card Game

An AI-generated MTG-like card game where cards are dynamically created by large language models and images are generated in real-time.

## Features

- **AI-Generated Cards**: Every card is unique, generated in real-time when drawn
- **Vibe Draft System**: Players contribute words to a shared pool, then draft to build their deck's theme
- **Dynamic World Building**: The game creates a unified world from all drafted themes
- **Combination Mechanic**: Merge permanents to create entirely new cards
- **Real-time Multiplayer**: Powered by Convex for instant synchronization

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Frontend**: [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router + React Query)
- **Backend**: [Convex](https://convex.dev)
- **Auth**: [WorkOS AuthKit](https://workos.com/docs/authkit)
- **AI**: [Google Gemini](https://ai.google.dev) (text + image generation)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com)

## Documentation

- [Design Document](./docs/DESIGN.md) - Full game mechanics, abilities, and database schema

## Development

### Prerequisites

- [Bun](https://bun.sh) installed
- [Convex](https://convex.dev) account
- [WorkOS](https://workos.com) account (for auth)
- [Google AI Studio](https://aistudio.google.com) API key

### Setup

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Start Convex backend (first time will prompt for project setup)
bun run dev:backend

# In another terminal, start the full dev server
bun run dev
```

### Available Scripts

```bash
bun run dev          # Start frontend + backend
bun run dev:frontend # Start only frontend
bun run dev:backend  # Start only Convex
bun run build        # Production build
bun run typecheck    # TypeScript check
bun run lint         # ESLint
bun run format       # Prettier
```

## License

MIT
