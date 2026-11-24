import { GoogleGenAI } from '@google/genai';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { collectionPoints, deliveryZones, promotions, storeSettings } from '../db/schema.ts';
import { getCatalogueGroundingContext } from './products.ts';

export const chatTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().trim().min(1).max(2000),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Please enter a question.').max(1500),
  history: z.array(chatTurnSchema).max(24).optional().default([]),
});

export async function generateStorefrontChatReply(
  input: z.infer<typeof chatRequestSchema>
): Promise<{ reply: string; model: string }> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error(
      'GEMINI_API_KEY is not configured in the server environment yet.'
    );
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  const parsed = chatRequestSchema.parse(input);

  const [catalogueContext, zones, pickups, activePromos, settingsRows] = await Promise.all([
    getCatalogueGroundingContext(),
    db
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.isActive, true))
      .orderBy(asc(deliveryZones.sortOrder)),
    db
      .select()
      .from(collectionPoints)
      .where(eq(collectionPoints.isActive, true))
      .orderBy(asc(collectionPoints.name)),
    db.select().from(promotions).where(eq(promotions.isActive, true)),
    db.select().from(storeSettings).limit(1),
  ]);

  const settings = settingsRows[0];
  const zoneLines = zones
    .map(
      (z) =>
        `- ${z.county} (${z.areaLabel}): Fee ${
          z.feeCents === 0 ? 'Free' : `KSh ${Math.round(z.feeCents / 100)}`
        }${
          z.freeThresholdCents !== null
            ? `, Free from KSh ${Math.round(z.freeThresholdCents / 100)}`
            : ''
        }, Min order KSh ${Math.round(z.minOrderCents / 100)}. ${z.estimateText}.`
    )
    .join('\n');

  const pickupLines = pickups
    .map(
      (cp) =>
        `- ${cp.name} (${cp.county}): ${cp.addressLine}. Hours: ${cp.hoursText}. Pickup fee: ${
          cp.feeCents === 0 ? 'Free' : `KSh ${Math.round(cp.feeCents / 100)}`
        }.`
    )
    .join('\n');

  const promoLines = activePromos
    .map((pr) => `- Code **${pr.code}**: ${pr.description}`)
    .join('\n');

  const systemInstruction = [
    `You are the Blendy Kenya Storefront Concierge — warm, concise, accurate, and helpful.`,
    `You help shoppers compare Blendy's real-fruit smoothie flavours, 330ml vs 1L Family Bottle sizing, ingredients, allergens, nutrition facts, promo codes, M-Pesa checkout, and Kenyan delivery / pickup points.`,
    ``,
    `STRICT FACTUAL GROUNDING RULES:`,
    `- Only quote flavours, KES prices, nutrition values, delivery zones, pickup points, and promo codes listed below.`,
    `- Never invent flavours, medical claims, discount codes, or delivery counties that are not listed below.`,
    `- If a user asks about something outside Blendy's published catalogue or delivery areas, clearly state what Blendy offers and suggest contacting ${settings?.supportEmail || 'hello@blendy.co.ke'} or ${settings?.supportPhone || '+254 700 123 456'}.`,
    `- Keep answers crisp (2–5 sentences or clean bullet points) and reference KES / KSh pricing accurately.`,
    ``,
    `STORE INFO:`,
    `- Brand: ${settings?.brandName || 'Blendy'} (${settings?.strapline || 'Real fruit smoothies'})`,
    `- Address: ${settings?.physicalAddress || 'Westlands, Nairobi'}`,
    `- Support: ${settings?.supportPhone || ''} | ${settings?.supportEmail || ''}`,
    `- Hours: ${settings?.operatingHours || ''}`,
    ``,
    `PUBLISHED SMOOTHIE CATALOGUE:`,
    catalogueContext,
    ``,
    `ACTIVE KENYAN DELIVERY ZONES:`,
    zoneLines || 'None currently published.',
    ``,
    `ACTIVE PICKUP COLLECTION POINTS:`,
    pickupLines || 'None currently published.',
    ``,
    `ACTIVE PROMO CODES:`,
    promoLines || 'No active promo codes.',
  ].join('\n');

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const history = parsed.history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const model = 'gemini-4-hydrogen';
  const chat = ai.chats.create({
    model,
    history,
    config: {
      systemInstruction,
    },
  });

  const response = await chat.sendMessage({ message: parsed.message });
  const reply = (response.text || '').trim();
  if (!reply) {
    throw new Error('Empty response received from Gemini.');
  }

  return { reply, model };
}
