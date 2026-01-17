import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new game
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get or create player
    let player = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
      .first();

    if (!player) {
      const playerId = await ctx.db.insert("players", {
        name: identity.name ?? "Anonymous",
        email: identity.email ?? "",
        authId: identity.subject,
      });
      player = await ctx.db.get(playerId);
    }

    if (!player) throw new Error("Failed to create player");

    // Create game
    const gameId = await ctx.db.insert("games", {
      player1: player._id,
      player1Life: 100,
      phase: "waiting",
      status: "waiting",
    });

    // Create empty draft pool
    await ctx.db.insert("draftPools", {
      gameId,
      words: [],
      player1Picks: [],
      player2Picks: [],
    });

    // Create field states for player 1
    await ctx.db.insert("fieldStates", {
      gameId,
      playerId: player._id,
      creatures: [],
      enchantments: [],
      artifacts: [],
      lands: [],
    });

    return gameId;
  },
});

// Join an existing game
export const join = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already started");
    if (game.player2) throw new Error("Game is full");

    // Get or create player
    let player = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
      .first();

    if (!player) {
      const playerId = await ctx.db.insert("players", {
        name: identity.name ?? "Anonymous",
        email: identity.email ?? "",
        authId: identity.subject,
      });
      player = await ctx.db.get(playerId);
    }

    if (!player) throw new Error("Failed to create player");

    // Can't join your own game
    if (game.player1 === player._id) {
      throw new Error("Cannot join your own game");
    }

    // Update game with player 2
    await ctx.db.patch(args.gameId, {
      player2: player._id,
      player2Life: 100,
      phase: "draft",
      status: "active",
    });

    // Create field state for player 2
    await ctx.db.insert("fieldStates", {
      gameId: args.gameId,
      playerId: player._id,
      creatures: [],
      enchantments: [],
      artifacts: [],
      lands: [],
    });

    return args.gameId;
  },
});

// Get game by ID
export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const player1 = await ctx.db.get(game.player1);
    const player2 = game.player2 ? await ctx.db.get(game.player2) : null;

    return {
      ...game,
      player1Data: player1,
      player2Data: player2,
    };
  },
});

// List open games waiting for players
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    const gamesWithPlayers = await Promise.all(
      games.map(async (game) => {
        const player1 = await ctx.db.get(game.player1);
        return {
          ...game,
          player1Data: player1,
        };
      })
    );

    return gamesWithPlayers;
  },
});

// Get current player's active games
export const myGames = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const player = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
      .first();

    if (!player) return [];

    const asPlayer1 = await ctx.db
      .query("games")
      .withIndex("by_player1", (q) => q.eq("player1", player._id))
      .collect();

    const asPlayer2 = await ctx.db
      .query("games")
      .withIndex("by_player2", (q) => q.eq("player2", player._id))
      .collect();

    const allGames = [...asPlayer1, ...asPlayer2].filter(
      (g) => g.status !== "finished"
    );

    return allGames;
  },
});
