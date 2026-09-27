import { NextResponse } from "next/server";
import { PoolObservationError, readVerifiedPoolObservation } from "@/lib/pool-observation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pool = await readVerifiedPoolObservation(request.signal);
    return NextResponse.json({
      configured: true,
      network: "devnet",
      ...pool,
      source: "onchain-reserve-accounts",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof PoolObservationError) {
      return NextResponse.json({ configured: false, error: error.message }, {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ configured: false, error: "Could not verify devnet pool reserves." }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
