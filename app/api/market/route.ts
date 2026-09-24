import { NextResponse } from "next/server";
import { parsePythResponse, PYTH_FEEDS } from "@/lib/pyth";

export const dynamic = "force-dynamic";

const PYTH_URL = "https://pyth-lazer.dourolabs.app/v1/latest_price";

export async function GET() {
  const apiKey = process.env.PYTH_PRO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        error: "PYTH_PRO_API_KEY is not configured. The interface must remain in labelled scenario mode.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(PYTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        priceFeedIds: [PYTH_FEEDS.underlying.id, PYTH_FEEDS.tokenized.id],
        properties: [
          "price",
          "exponent",
          "confidence",
          "publisherCount",
          "marketSession",
          "feedUpdateTimestamp",
        ],
        formats: ["solana"],
        channel: "fixed_rate@1000ms",
        ignoreInvalidFeeds: false,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { configured: true, error: `Pyth returned ${response.status}.`, detail: detail.slice(0, 300) },
        { status: 502 },
      );
    }

    const market = parsePythResponse(await response.json());
    return NextResponse.json({
      configured: true,
      snapshot: market.snapshot,
      signedPayload: market.signedPayload,
      verification: "Signed Pyth payload received; onchain verification is not yet implemented.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Pyth adapter failure.";
    return NextResponse.json({ configured: true, error: message }, { status: 502 });
  }
}
