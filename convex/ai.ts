"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// Initialize Google AI provider
const getGoogle = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return createGoogleGenerativeAI({ apiKey });
};

// Schema for world generation
const WorldSchema = z.object({
  worldDescription: z.string().describe("A concise 3-4 sentence description of the world - evocative but brief"),
  resourceTypes: z.array(z.string()).min(3).max(4).describe("3-4 unique resource/mana types"),
  worldName: z.string().describe("A cool name for this world (2-4 words)"),
});

// Schema for card abilities
const AbilitySchema = z.object({
  mechanicId: z.enum([
    "DEAL_DAMAGE",
    "DEAL_DAMAGE_AOE",
    "HEAL",
    "GAIN_LIFE",
    "DRAW_CARDS",
    "DISCARD_CARDS",
    "DESTROY",
    "EXILE",
    "RETURN_TO_HAND",
    "BUFF_STATS",
    "GRANT_KEYWORD",
    "TAP",
    "UNTAP",
    "COPY",
    "COUNTER",
    "ADD_MANA",
  ]).describe("The mechanical effect of this ability"),
  target: z.string().optional().describe("Target of the ability (e.g., 'creature', 'player', 'any')"),
  amount: z.number().optional().describe("Numeric value for the ability (damage, heal amount, cards to draw, etc.)"),
  flavoredText: z.string().describe("The in-game text describing what this ability does"),
});

// Schema for card generation
const CardSchema = z.object({
  name: z.string().describe("The card's name"),
  cardType: z.enum(["creature", "instant", "sorcery", "enchantment", "artifact"]).describe("The type of card"),
  manaCost: z.string().describe("Cost using the world's resource types"),
  power: z.number().optional().describe("Power stat (creatures only)"),
  toughness: z.number().optional().describe("Toughness stat (creatures only)"),
  abilities: z.array(AbilitySchema).describe("List of card abilities"),
  flavorText: z.string().describe("Evocative quote or description"),
  imagePrompt: z.string().describe("Detailed visual description for image generation"),
});

// Keywords for card generation
const KEYWORDS = [
  "FLYING",
  "TRAMPLE",
  "HASTE",
  "VIGILANCE",
  "DEATHTOUCH",
  "LIFELINK",
  "FIRST_STRIKE",
  "HEXPROOF",
];

// Generate world description from drafted themes
export const generateWorld = action({
  args: {
    gameId: v.id("games"),
    player1Themes: v.array(v.string()),
    player2Themes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const google = getGoogle();

    const { object: world } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: WorldSchema,
      prompt: `Create a fantasy card game world from these themes. BE CONCISE - 3-4 sentences max.

Themes: ${[...args.player1Themes, ...args.player2Themes].join(", ")}

Requirements:
- Weave all themes into ONE coherent setting
- Be evocative but BRIEF (3-4 sentences only)
- Generate 3-4 unique mana/resource types that fit the world

Keep it punchy and memorable, not verbose.`,
    });

    // Update the game with world info
    await ctx.runMutation(internal.internal.patchGameWorld, {
      gameId: args.gameId,
      worldDescription: world.worldDescription,
      resourceTypes: world.resourceTypes,
    });

    return world;
  },
});

// Generate a card
export const generateCard = action({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    worldDescription: v.string(),
    playerThemes: v.array(v.string()),
    resourceTypes: v.array(v.string()),
    fieldContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ cardId: Id<"cards">; card: z.infer<typeof CardSchema> }> => {
    const google = getGoogle();

    const { object: card } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: CardSchema,
      prompt: `You are a card designer for a Magic: The Gathering-style game. Generate a balanced, interesting card that fits the world and player's themes.

WORLD: ${args.worldDescription}

PLAYER'S THEMES: ${args.playerThemes.join(", ")}

AVAILABLE RESOURCE TYPES: ${args.resourceTypes.join(", ")}

AVAILABLE KEYWORDS: ${KEYWORDS.join(", ")}

${args.fieldContext ? `CURRENT FIELD STATE: ${args.fieldContext}` : ""}

Generate a single card. Important rules:
- Card types: creature, instant, sorcery, enchantment, artifact
- Creatures MUST have power and toughness (numbers)
- Non-creatures should NOT have power/toughness
- Mana cost should use the world's resource types (e.g., "2 Magma Essence, 1 Abyssal Coral")
- Balance: higher cost = stronger effects/stats
- Make it flavorful and tied to the world
- Include 1-3 abilities with clear mechanical effects`,
    });

    // Create the card in the database
    const cardId: Id<"cards"> = await ctx.runMutation(internal.internal.createCard, {
      gameId: args.gameId,
      ownerId: args.playerId,
      name: card.name,
      cardType: card.cardType,
      manaCost: card.manaCost,
      abilities: card.abilities.map((a) => ({
        mechanicId: a.mechanicId,
        params: { target: a.target, amount: a.amount },
        flavoredText: a.flavoredText,
      })),
      power: card.power,
      toughness: card.toughness,
      flavorText: card.flavorText,
    });

    // Generate image in background
    if (card.imagePrompt) {
      await ctx.scheduler.runAfter(0, internal.ai.generateCardImage, {
        cardId,
        imagePrompt: card.imagePrompt,
        worldDescription: args.worldDescription,
      });
    }

    return { cardId, card };
  },
});

// Generate card image (still using raw API for image generation)
export const generateCardImage = internalAction({
  args: {
    cardId: v.id("cards"),
    imagePrompt: v.string(),
    worldDescription: v.string(),
  },
  handler: async (ctx, args) => {
    // For image generation, we still need the raw Google GenAI SDK
    // as Vercel AI SDK doesn't support image generation yet
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    const genai = new GoogleGenAI({ apiKey });

    const fullPrompt = `Fantasy trading card game art, high quality illustration:
${args.imagePrompt}

Style: Epic fantasy card game art, detailed, vibrant colors, dramatic lighting.
World context: ${args.worldDescription.slice(0, 200)}`;

    try {
      const response = await genai.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: ["image", "text"],
        },
      });

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData);

      if (imagePart?.inlineData?.data) {
        const imageData = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType || "image/png";

        // Convert base64 to blob and store
        const blob = Buffer.from(imageData as string, "base64");
        const storageId = await ctx.storage.store(
          new Blob([blob], { type: mimeType })
        );

        // Update card with storage ID
        await ctx.runMutation(internal.internal.updateCardImage, {
          cardId: args.cardId,
          imageStorageId: storageId,
        });
      }
    } catch (e) {
      console.error("Failed to generate card image:", e);
      // Don't throw - card can exist without image
    }
  },
});
