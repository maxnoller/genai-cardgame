import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Create a test game with a bot opponent (dev mode only)
export const createTestGame = mutation({
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

    // Create or get bot player
    let botPlayer = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", "bot-player-dev"))
      .first();

    if (!botPlayer) {
      const botId = await ctx.db.insert("players", {
        name: "🤖 Bot Player",
        email: "bot@test.local",
        authId: "bot-player-dev",
      });
      botPlayer = await ctx.db.get(botId);
    }

    if (!botPlayer) throw new Error("Failed to create bot player");

    // Create game with both players
    const gameId = await ctx.db.insert("games", {
      player1: player._id,
      player2: botPlayer._id,
      player1Life: 100,
      player2Life: 100,
      phase: "draft",
      status: "active",
    });

    // Create draft pool with some bot words already
    const botWords = [
      "ancient ruins",
      "crystal caves",
      "shadow beasts",
    ];

    await ctx.db.insert("draftPools", {
      gameId,
      words: botWords,
      player1Picks: [],
      player2Picks: [],
    });

    // Create field states
    await ctx.db.insert("fieldStates", {
      gameId,
      playerId: player._id,
      creatures: [],
      enchantments: [],
      artifacts: [],
      lands: [],
    });

    await ctx.db.insert("fieldStates", {
      gameId,
      playerId: botPlayer._id,
      creatures: [],
      enchantments: [],
      artifacts: [],
      lands: [],
    });

    return { gameId, botWords };
  },
});

// Bot auto-picks a word (called after player picks)
export const botAutoPick = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const botPlayer = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", "bot-player-dev"))
      .first();

    if (!botPlayer) return { picked: null, reason: "No bot player" };

    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!draft) return { picked: null, reason: "No draft" };

    // Check if it's bot's turn
    if (draft.currentPicker !== botPlayer._id) {
      return { picked: null, reason: "Not bot's turn" };
    }

    if (draft.words.length === 0) {
      return { picked: null, reason: "No words left" };
    }

    // Bot picks a random word
    const randomIndex = Math.floor(Math.random() * draft.words.length);
    const wordToPick = draft.words[randomIndex];

    // Remove word from pool
    const remainingWords = draft.words.filter((w) => w !== wordToPick);

    // Add to bot's picks (bot is always player2 in test games)
    const newPlayer2Picks = [...draft.player2Picks, wordToPick];

    // Switch picker back to player 1
    const nextPicker = game.player1;

    // Check if draft is complete
    const draftComplete =
      remainingWords.length === 0 ||
      (draft.player1Picks.length >= 3 && newPlayer2Picks.length >= 3);

    await ctx.db.patch(draft._id, {
      words: remainingWords,
      player2Picks: newPlayer2Picks,
      currentPicker: draftComplete ? undefined : nextPicker,
    });

    return {
      picked: wordToPick,
      draftComplete,
      remainingWords: remainingWords.length,
    };
  },
});

// Skip directly to play phase with generated world (for testing card generation)
export const skipToPlayPhase = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    // Set up mock world data
    await ctx.db.patch(args.gameId, {
      phase: "play",
      turnPhase: "draw",
      currentTurn: game.player1,
      worldDescription: `A realm where ancient crystalline ruins pierce through shadowy mists. The land pulses with forgotten magic, where spectral beasts roam between dimensions. Towering spires of living crystal hum with arcane energy, while the shadows themselves seem to breathe and watch. This is a world caught between light and darkness, where power flows through both stone and spirit.`,
      resourceTypes: [
        "Crystal Essence",
        "Shadow Mana",
        "Ancient Power",
        "Spectral Energy",
      ],
    });

    // Set mock picks if draft exists
    if (draft) {
      await ctx.db.patch(draft._id, {
        player1Picks: ["crystal caves", "ancient ruins"],
        player2Picks: ["shadow beasts"],
        currentPicker: undefined,
      });
    }

    return { success: true };
  },
});

// Get bot player ID for a game
export const getBotInfo = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const botPlayer = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", "bot-player-dev"))
      .first();

    return botPlayer;
  },
});
