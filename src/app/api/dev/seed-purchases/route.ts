import { NextResponse } from "next/server";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and } from "drizzle-orm";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const PRODUCTS = [
  { name: "Rice Bag 25kg",      price: 1100 },
  { name: "Sugar Packet 1kg",   price: 42   },
  { name: "Cooking Oil 1L",     price: 130  },
  { name: "Wheat Flour 10kg",   price: 340  },
  { name: "Tea Powder 500g",    price: 210  },
  { name: "Salt 1kg",           price: 18   },
  { name: "Masala Pack 200g",   price: 85   },
  { name: "Pulses 5kg",         price: 480  },
  { name: "Biscuits Carton",    price: 620  },
  { name: "Soap Box x12",       price: 360  },
];

export async function GET() {
  try {
    // Get the first business
    const [biz] = await db.select().from(s.businesses).limit(1);
    if (!biz) {
      return NextResponse.json({ error: "No business found. Log in first to initialise the DB." }, { status: 400 });
    }

    // Get all suppliers for this business
    const suppliers = await db
      .select()
      .from(s.parties)
      .where(and(eq(s.parties.businessId, biz.id), eq(s.parties.type, "supplier")));

    if (suppliers.length === 0) {
      return NextResponse.json({ error: "No suppliers found." }, { status: 400 });
    }

    // Count existing purchases to generate sequential reference numbers
    const existing = await db
      .select({ referenceNumber: s.purchases.referenceNumber })
      .from(s.purchases)
      .where(eq(s.purchases.businessId, biz.id));

    const maxRef = existing.reduce((max, r) => {
      const n = parseInt(r.referenceNumber.replace(/\D/g, ""), 10) || 0;
      return Math.max(max, n);
    }, 0);

    const now = Date.now();
    const day = 86_400_000;
    const inserted: string[] = [];

    for (let i = 0; i < 30; i++) {
      const refNum = maxRef + i + 1;
      const refStr = `PO-${String(refNum).padStart(4, "0")}`;

      // Pick a random supplier
      const supplier = suppliers[i % suppliers.length];

      // Pick 1–3 random products
      const lineCount = randBetween(1, 3);
      const lines = Array.from({ length: lineCount }, () => {
        const product = PRODUCTS[randBetween(0, PRODUCTS.length - 1)];
        const qty = randBetween(5, 50);
        return { ...product, qty, lineTotal: product.price * qty };
      });

      const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
      const tax = round2(subtotal * (biz.taxRate / 100));
      const total = round2(subtotal + tax);

      // Randomise payment status
      const rand = Math.random();
      let amountPaid = 0;
      let paymentStatus = "unpaid";
      if (rand > 0.7) {
        amountPaid = total;
        paymentStatus = "paid";
      } else if (rand > 0.4) {
        amountPaid = round2(total * (0.3 + Math.random() * 0.5));
        paymentStatus = "partial";
      }

      // Spread over the last 60 days
      const createdAt = new Date(now - randBetween(0, 60) * day);

      const [pur] = await db
        .insert(s.purchases)
        .values({
          businessId: biz.id,
          partyId: supplier.id,
          referenceNumber: refStr,
          subtotal,
          tax,
          total,
          amountPaid,
          paymentStatus,
          source: "form",
          createdAt,
        })
        .returning();

      await db.insert(s.purchaseItems).values(
        lines.map((l) => ({
          purchaseId: pur.id,
          description: l.name,
          quantity: l.qty,
          unitPrice: l.price,
          lineTotal: l.lineTotal,
        })),
      );

      inserted.push(refStr);
    }

    return NextResponse.json({
      ok: true,
      inserted: inserted.length,
      refs: inserted,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
