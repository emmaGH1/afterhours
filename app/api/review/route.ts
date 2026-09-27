import { readVerifiedPoolObservation } from "@/lib/pool-observation";
import { createReviewPostHandler } from "@/lib/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const POST = createReviewPostHandler({
  apiKey: () => process.env.OPENSERV_API_KEY,
  readPool: readVerifiedPoolObservation,
});
