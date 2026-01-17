import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Ability schema (embedded in Card)
const ability = v.object({
  mechanicId: v.string(), // e.g., "DEAL_DAMAGE", "BUFF_STATS"
  params: v.record(v.string(), v.any()), // e.g., { target: "creature", amount: 3 }
  flavoredText: v.string(), // e.g., "Deal 3 damage to target creature"
});

export default defineSchema({
  // Player table
  players: defineTable({
    name: v.string(),
    email: v.string(),
    authId: v.string(),
  }).index("by_auth", ["authId"]),

  // Game table
  games: defineTable({
    player1: v.id("players"),
    player2: v.optional(v.id("players")),
    currentTurn: v.optional(v.id("players")),
    phase: v.union(v.literal("waiting"), v.literal("draft"), v.literal("play")),
    turnPhase: v.optional(
      v.union(
        v.literal("untap"),
        v.literal("upkeep"),
        v.literal("draw"),
        v.literal("main1"),
        v.literal("combat"),
        v.literal("main2"),
        v.literal("end")
      )
    ),
    player1Life: v.number(),
    player2Life: v.optional(v.number()),
    worldDescription: v.optional(v.string()),
    resourceTypes: v.optional(v.array(v.string())),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("finished")
    ),
    winner: v.optional(v.id("players")),
  })
    .index("by_status", ["status"])
    .index("by_player1", ["player1"])
    .index("by_player2", ["player2"]),

  // Draft pool for vibe draft system
  draftPools: defineTable({
    gameId: v.id("games"),
    words: v.array(v.string()),
    player1Picks: v.array(v.string()),
    player2Picks: v.array(v.string()),
    currentPicker: v.optional(v.id("players")),
  }).index("by_game", ["gameId"]),

  // Cards table
  cards: defineTable({
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
    abilities: v.array(ability),
    power: v.optional(v.number()),
    toughness: v.optional(v.number()),
    flavorText: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    location: v.union(
      v.literal("hand"),
      v.literal("field"),
      v.literal("graveyard"),
      v.literal("exile")
    ),
    tapped: v.boolean(),
  })
    .index("by_game", ["gameId"])
    .index("by_owner", ["ownerId"])
    .index("by_game_and_location", ["gameId", "location"]),

  // Field state for each player
  fieldStates: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    creatures: v.array(v.id("cards")),
    enchantments: v.array(v.id("cards")),
    artifacts: v.array(v.id("cards")),
    lands: v.array(v.id("cards")),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"])
    .index("by_game_and_player", ["gameId", "playerId"]),
});
