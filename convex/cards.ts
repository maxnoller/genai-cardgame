import { v } from "convex/values";
import { query } from "./_generated/server";

// Get cards in player's hand for a game
export const getMyHand = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const player = await ctx.db
      .query("players")
      .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
      .first();

    if (!player) return [];

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_owner", (q) => q.eq("ownerId", player._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("gameId"), args.gameId),
          q.eq(q.field("location"), "hand")
        )
      )
      .collect();

    return cards;
  },
});

// Get all cards on the field for a game
export const getField = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_game_and_location", (q) =>
        q.eq("gameId", args.gameId).eq("location", "field")
      )
      .collect();

    return cards;
  },
});

// Get a specific card
export const get = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.cardId);
  },
});
