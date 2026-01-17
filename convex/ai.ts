"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { GoogleGenAI } from "@google/genai";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey });
};

// Generate world description from drafted themes
export const generateWorld = action({
  args: {
    gameId: v.id("games"),
    player1Themes: v.array(v.string()),
    player2Themes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const genai = getGenAI();

    const prompt = `You are a creative world-builder for a fantasy card game. Given the following themes drafted by two players, create a unified, cohesive world that incorporates ALL of them.

Player 1's themes: ${args.player1Themes.join(", ")}
Player 2's themes: ${args.player2Themes.join(", ")}

Create a world description that:
1. Weaves all themes together into a single coherent setting
2. Has a unique aesthetic and atmosphere
3. Suggests what kinds of creatures, magic, and conflicts might exist
4. Is evocative and inspiring for card generation

Also generate 3-5 unique resource/mana types that fit this world (like "Magma Essence", "Abyssal Coral", "Sacred Steam").

Respond in JSON format:
{
  "worldDescription": "A 2-3 paragraph vivid description of the world",
  "resourceTypes": ["Resource1", "Resource2", "Resource3"],
  "worldName": "A cool name for this world"
}`;

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";

    try {
      const result = JSON.parse(text);

      // Update the game with world info
      await ctx.runMutation(internal.internal.patchGameWorld, {
        gameId: args.gameId,
        worldDescription: result.worldDescription,
        resourceTypes: result.resourceTypes,
      });

      return result;
    } catch (e) {
      console.error("Failed to parse world generation response:", text);
      throw new Error("Failed to generate world");
    }
  },
});

// Ability types for structured card generation
const ABILITY_TYPES = [
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
];

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
  handler: async (ctx, args): Promise<{ cardId: Id<"cards">; card: any }> => {
    const genai = getGenAI();

    const prompt = `You are a card designer for a Magic: The Gathering-style game. Generate a balanced, interesting card that fits the world and player's themes.

WORLD: ${args.worldDescription}

PLAYER'S THEMES: ${args.playerThemes.join(", ")}

AVAILABLE RESOURCE TYPES: ${args.resourceTypes.join(", ")}

AVAILABLE ABILITY MECHANICS (choose from these):
${ABILITY_TYPES.join(", ")}

AVAILABLE KEYWORDS:
${KEYWORDS.join(", ")}

${args.fieldContext ? `CURRENT FIELD STATE: ${args.fieldContext}` : ""}

Generate a card. Card types: creature, instant, sorcery, enchantment, artifact.
- Creatures have power/toughness
- Mana cost should use the world's resource types (e.g., "2 Magma Essence, 1 Abyssal Coral")
- Balance: higher cost = stronger effects/stats
- Make it flavorful and tied to the world

Respond in JSON:
{
  "name": "Card Name",
  "cardType": "creature|instant|sorcery|enchantment|artifact",
  "manaCost": "Cost using resource types",
  "power": 3,
  "toughness": 4,
  "abilities": [
    {
      "mechanicId": "DEAL_DAMAGE",
      "params": { "target": "creature", "amount": 2 },
      "flavoredText": "Deal 2 damage to target creature"
    }
  ],
  "flavorText": "Evocative quote or description",
  "imagePrompt": "Detailed visual description for image generation"
}

For non-creatures, omit power/toughness.`;

    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";

    try {
      const card = JSON.parse(text);

      // Create the card in the database
      const cardId: Id<"cards"> = await ctx.runMutation(internal.internal.createCard, {
        gameId: args.gameId,
        ownerId: args.playerId,
        name: card.name,
        cardType: card.cardType,
        manaCost: card.manaCost,
        abilities: card.abilities || [],
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
    } catch (e) {
      console.error("Failed to parse card generation response:", text);
      throw new Error("Failed to generate card");
    }
  },
});

// Generate card image
export const generateCardImage = internalAction({
  args: {
    cardId: v.id("cards"),
    imagePrompt: v.string(),
    worldDescription: v.string(),
  },
  handler: async (ctx, args) => {
    const genai = getGenAI();

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
