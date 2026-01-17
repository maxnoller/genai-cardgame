# AGENTS.md

## Overview

An AI-generated MTG-like card game where cards are dynamically created by Google Gemini (text) and Nano Banana (images) in real-time. Features a vibe draft system, combination mechanics, and real-time multiplayer via Convex.

## Build & Test

```bash
# Install dependencies
npm install

# Run development server (starts both React frontend and Convex backend)
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Run Convex development
npx convex dev
```

## Architecture

**Frontend** (React + TanStack Router, hosted on Cloudflare Pages): Game UI, draft phase interface, and card display components. Connects to Convex via real-time subscriptions.

**Backend** (Convex): Handles database (games, players, cards, field state), real-time sync, authentication, file storage for card images, and actions for card generation.

**AI Services** (Google Gemini API): Text generation for card names/abilities/flavor text, and Nano Banana (`gemini-2.5-flash-image`) for card artwork.

Key data flow: Player draws card → Convex action generates card text via Gemini → Card image generated via Nano Banana → Stored in Convex file storage → Real-time sync to all clients.

## Code Style

- **Language**: TypeScript throughout (frontend and Convex backend)
- Use functional React components with hooks
- Follow Convex patterns for mutations, queries, and actions
- Card abilities use a hardcoded mechanical library (e.g., `DEAL_DAMAGE`, `BUFF_STATS`) flavored by the LLM
- Keep game logic in Convex actions, UI logic in React components

## Git Workflow

- Branch from `main` for features: `feature/description`
- Branch for bugs: `fix/description`
- Keep commits focused and atomic
- PR descriptions should explain what and why

## Important Constraints

- **Never hardcode API keys** - Use environment variables (`.env.local` for development)
- **Card generation must be server-side** - All Gemini API calls happen in Convex actions, not client-side
- **Ability mechanics are fixed** - LLM selects from the hardcoded ability library; it cannot invent new mechanics
- **Real-time sync is critical** - All game state changes must go through Convex mutations to ensure proper sync
- **Images are optimistically displayed** - Show card text immediately while image loads asynchronously

## Key Files

- `docs/DESIGN.md` - Full game design document with mechanics, abilities, and database schema
- `convex/` - Backend functions (mutations, queries, actions)
- `src/` - React frontend components

## Environment Variables

Required in `.env.local`:
```
CONVEX_DEPLOYMENT=<your-convex-deployment>
GOOGLE_API_KEY=<gemini-api-key>
```
