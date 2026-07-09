import { extractJson, getAnthropic, hasAI, MODEL } from "./client";

export interface ParsedInvoiceLine {
  product: string;
  quantity: number;
  unitPrice: number | null;
}

export interface ParsedInvoice {
  party: string | null;
  docType: "sale" | "purchase";
  lineItems: ParsedInvoiceLine[];
  total: number | null;
}

const SCHEMA = {
  type: "object",
  properties: {
    party: { type: ["string", "null"] },
    docType: { type: "string", enum: ["sale", "purchase"] },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: ["number", "null"] },
        },
        required: ["product", "quantity", "unitPrice"],
        additionalProperties: false,
      },
    },
    total: { type: ["number", "null"] },
  },
  required: ["party", "docType", "lineItems", "total"],
  additionalProperties: false,
} as const;

/**
 * Reads an invoice / order-slip / WhatsApp screenshot into structured data using
 * Claude's vision. Requires ANTHROPIC_API_KEY (there is no offline fallback for
 * image OCR).
 */
export async function parseInvoiceImage(
  base64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif",
): Promise<ParsedInvoice> {
  if (!hasAI()) {
    throw new Error(
      "Image OCR needs an Anthropic API key. Add ANTHROPIC_API_KEY to .env.local, or use text/manual input instead.",
    );
  }
  const client = getAnthropic()!;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text:
              "Extract this invoice / order slip / chat message into the schema. " +
              "docType is 'purchase' if it is a bill we received from a supplier, else 'sale'. " +
              "party is the other business/person named. Include every line item.",
          },
        ],
      },
    ],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  } as never);

  const parsed = extractJson<ParsedInvoice>((res as { content: unknown }).content);
  if (!parsed) throw new Error("Could not read a structured invoice from that image.");
  return {
    party: parsed.party ?? null,
    docType: parsed.docType === "purchase" ? "purchase" : "sale",
    lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
    total: parsed.total != null ? Number(parsed.total) : null,
  };
}
