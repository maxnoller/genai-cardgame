# AGENTS.md

## Overview

An AI-generated MTG-like card game where cards are dynamically created by Google Gemini (text) and Gemini 2.5 Flash Image (images) in real-time. Features a vibe draft system, combination mechanics, and real-time multiplayer via Convex.

## Build & Test

```bash
# Install dependencies
bun install

# Run development server (starts both frontend and Convex backend)
bun run dev

# Run only frontend
bun run dev:frontend

# Run only Convex backend
bun run dev:backend

# Build for production
bun run build

# Type checking
bun run typecheck

# Lint
bun run lint

# Format code
bun run format
```

## Architecture

**Frontend** (TanStack Start + React, hosted on Cloudflare Pages): Full-stack React framework with SSR, file-based routing, and React Query integration. Game UI, draft phase interface, and card display components.

**Backend** (Convex): Handles database (games, players, cards, field state), real-time sync, authentication via WorkOS AuthKit, file storage for card images, and actions for AI generation.

**AI Services** (Google Gemini API): `@google/genai` SDK for text generation (card names/abilities/flavor text) and `gemini-2.5-flash-image` for card artwork.

**Data Flow**: Player draws card → Convex action generates card text via Gemini → Card image generated via Gemini 2.5 Flash Image → Stored in Convex file storage → Real-time sync to all clients via React Query + Convex subscriptions.

## Tech Stack

- **Runtime**: Bun
- **Frontend**: TanStack Start (React 19 + TanStack Router + React Query)
- **Backend**: Convex
- **Auth**: WorkOS AuthKit
- **AI**: Google Gemini (`@google/genai`)
- **Styling**: Tailwind CSS v4
- **Hosting**: Cloudflare Pages

## Code Style

- **Language**: TypeScript throughout (frontend and Convex backend)
- Use functional React components with hooks
- Use `useSuspenseQuery` with Convex React Query for data fetching
- Follow Convex patterns for mutations, queries, and actions
- Card abilities use a hardcoded mechanical library (e.g., `DEAL_DAMAGE`, `BUFF_STATS`) flavored by the LLM
- Keep game logic in Convex actions, UI logic in React components

## Project Structure

```
src/
├── routes/           # TanStack file-based routes
│   ├── __root.tsx    # Root layout
│   └── index.tsx     # Home page
├── router.tsx        # Router configuration with Convex providers
├── app.css           # Global styles (Tailwind)
└── start.ts          # TanStack Start entry point

convex/
├── _generated/       # Auto-generated API types (never edit)
├── schema.ts         # Database schema definitions
└── auth.config.ts    # WorkOS AuthKit configuration

docs/
└── DESIGN.md         # Full game design document
```

## Git Workflow

- Branch from `main` for features: `feature/description`
- Branch for bugs: `fix/description`
- Keep commits focused and atomic
- PR descriptions should explain what and why

## Important Constraints

- **Never hardcode API keys** - Use environment variables (`.env.local` for development)
- **Card generation must be server-side** - All Gemini API calls happen in Convex actions, not client-side
- **Ability mechanics are fixed** - LLM selects from the hardcoded ability library; it cannot invent new mechanics
- **Real-time sync is critical** - All game state changes must go through Convex mutations
- **Images are optimistically displayed** - Show card text immediately while image loads asynchronously
- **Use `"use node"`** at top of Convex action files that use Node.js dependencies

## Environment Variables

Required in `.env.local`:
```
VITE_CONVEX_URL=<your-convex-deployment-url>
CONVEX_DEPLOYMENT=<your-convex-deployment>
WORKOS_API_KEY=<workos-api-key>
WORKOS_CLIENT_ID=<workos-client-id>
WORKOS_REDIRECT_URI=<your-redirect-uri>
WORKOS_COOKIE_PASSWORD=<32-char-password>
```

Set in Convex dashboard (for actions):
```
GEMINI_API_KEY=<google-gemini-api-key>
```

## Key Files

- `docs/DESIGN.md` - Full game design document with mechanics, abilities, and database schema
- `convex/schema.ts` - Convex database schema
- `src/router.tsx` - Router setup with Convex + React Query providers
- `src/routes/` - TanStack file-based routes
