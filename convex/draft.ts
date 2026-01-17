import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get draft pool for a game
export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    return draft;
  },
});

// Submit words to the draft pool (each player submits ~3 words)
export const submitWords = mutation({
  args: {
    gameId: v.id("games"),
    words: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.phase !== "draft") throw new Error("Game not in draft phase");

    const player = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
      .first();

    if (!player) throw new Error("Player not found");

    // Verify player is in this game
    const isPlayer1 = game.player1 === player._id;
    const isPlayer2 = game.player2 === player._id;
    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this game");
    }

    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!draft) throw new Error("Draft pool not found");

    // Clean and validate words
    const cleanedWords = args.words
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && w.length <= 50)
      .slice(0, 5); // Max 5 words per player

    if (cleanedWords.length === 0) {
      throw new Error("Please submit at least one word");
    }

    // Add words to pool (with player marker for tracking who submitted, but shuffled later)
    const newWords = [...draft.words, ...cleanedWords];

    await ctx.db.patch(draft._id, {
      words: newWords,
    });

    return { submitted: cleanedWords.length };
  },
});

// Start the picking phase (called after both players submit words)
export const startPicking = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.phase !== "draft") throw new Error("Game not in draft phase");

    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!draft) throw new Error("Draft pool not found");

    // Need at least 4 words to draft
    if (draft.words.length < 4) {
      throw new Error("Need at least 4 words in the pool to start picking");
    }

    // Shuffle the words
    const shuffled = [...draft.words].sort(() => Math.random() - 0.5);

    // Player 1 picks first
    await ctx.db.patch(draft._id, {
      words: shuffled,
      currentPicker: game.player1,
    });

    return { started: true };
  },
});

// Pick a word from the pool
export const pickWord = mutation({
  args: {
    gameId: v.id("games"),
    word: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.phase !== "draft") throw new Error("Game not in draft phase");

    const player = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
      .first();

    if (!player) throw new Error("Player not found");

    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!draft) throw new Error("Draft pool not found");
    if (!draft.currentPicker) throw new Error("Picking has not started");
    if (draft.currentPicker !== player._id) {
      throw new Error("It's not your turn to pick");
    }

    // Verify word is in pool
    if (!draft.words.includes(args.word)) {
      throw new Error("Word not in pool");
    }

    // Remove word from pool
    const remainingWords = draft.words.filter((w) => w !== args.word);

    // Add to player's picks
    const isPlayer1 = game.player1 === player._id;
    const newPlayer1Picks = isPlayer1
      ? [...draft.player1Picks, args.word]
      : draft.player1Picks;
    const newPlayer2Picks = !isPlayer1
      ? [...draft.player2Picks, args.word]
      : draft.player2Picks;

    // Switch picker
    const nextPicker = isPlayer1 ? game.player2 : game.player1;

    // Check if draft is complete (each player gets 3 picks, or pool is empty)
    const draftComplete =
      remainingWords.length === 0 ||
      (newPlayer1Picks.length >= 3 && newPlayer2Picks.length >= 3);

    await ctx.db.patch(draft._id, {
      words: remainingWords,
      player1Picks: newPlayer1Picks,
      player2Picks: newPlayer2Picks,
      currentPicker: draftComplete ? undefined : nextPicker,
    });

    return {
      picked: args.word,
      draftComplete,
      remainingWords: remainingWords.length,
    };
  },
});

// Start world generation (transitions to generating phase)
export const startWorldGeneration = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!draft) throw new Error("Draft pool not found");

    // Transition to generating phase
    await ctx.db.patch(args.gameId, {
      phase: "generating",
    });

    // Clear the currentPicker to indicate picking is done
    await ctx.db.patch(draft._id, {
      currentPicker: undefined,
    });

    return {
      player1Picks: draft.player1Picks,
      player2Picks: draft.player2Picks,
    };
  },
});

// Get current player's role in the game
export const getMyRole = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const player = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
      .first();

    if (!player) return null;

    if (game.player1 === player._id) return { role: "player1" as const, playerId: player._id };
    if (game.player2 === player._id) return { role: "player2" as const, playerId: player._id };
    return null;
  },
});
