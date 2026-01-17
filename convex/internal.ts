import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Internal mutation to start world generation (sets phase to generating)
export const startWorldGeneration = internalMutation({
  args: {
    gameId: v.id("games"),
    player1Picks: v.array(v.string()),
    player2Picks: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Store the picks for display during generation
    const draft = await ctx.db
      .query("draftPools")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (draft) {
      await ctx.db.patch(draft._id, {
        player1Picks: args.player1Picks,
        player2Picks: args.player2Picks,
        currentPicker: undefined, // Clear picker to indicate picking is done
      });
    }

    await ctx.db.patch(args.gameId, {
      phase: "generating",
    });
  },
});

// Internal mutation to update game with world info
export const patchGameWorld = internalMutation({
  args: {
    gameId: v.id("games"),
    worldDescription: v.string(),
    resourceTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    await ctx.db.patch(args.gameId, {
      worldDescription: args.worldDescription,
      resourceTypes: args.resourceTypes,
      phase: "play",
      turnPhase: "draw",
      currentTurn: game?.player1, // Player 1 starts
    });
  },
});

// Internal mutation to create a card
export const createCard = internalMutation({
  args: {
    gameId: v.id("games"),
    ownerId: v.id("players"),
    name: v.string(),
    cardType: v.union(
      v.literal("creature"),
      v.literal("instant"),
      v.literal("sorcery"),
      v.literal("enchantment"),
      v.literal("artifact"),
      v.literal("land")
    ),
    manaCost: v.string(),
    abilities: v.array(
      v.object({
        mechanicId: v.string(),
        params: v.record(v.string(), v.any()),
        flavoredText: v.string(),
      })
    ),
    power: v.optional(v.number()),
    toughness: v.optional(v.number()),
    flavorText: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cards", {
      ...args,
      location: "hand",
      tapped: false,
    });
  },
});

// Internal mutation to update card with image
export const updateCardImage = internalMutation({
  args: {
    cardId: v.id("cards"),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.imageStorageId);
    await ctx.db.patch(args.cardId, {
      imageStorageId: args.imageStorageId,
      imageUrl: url ?? undefined,
    });
  },
});
