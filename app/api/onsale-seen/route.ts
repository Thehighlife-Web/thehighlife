import { NextResponse } from "next/server";
import { getSaleSeen } from "@/lib/saleSeen";

/**
 * When each product first appeared on sale — the note the site keeps because
 * Proteus publishes no sale date (see lib/saleSeen.ts).
 *
 * The shop's ordering runs in the browser (ProteusSortFix intercepts JSCart's
 * own requests), so the note has to be reachable from there. This is that door.
 *
 * Rendered per request: the whole point is that it changes. The short
 * Cache-Control lets a browser and the CDN hold it briefly — the note itself
 * only refreshes every ten minutes, so serving one up to five minutes old costs
 * nothing and keeps this off the critical path.
 *
 * Always answers 200 with a map, even when the store is unreachable. A caller
 * that gets {} simply orders by product id, which is what the site did before
 * any of this existed.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const { firstSeen, updatedAt } = await getSaleSeen();
  return NextResponse.json(
    { firstSeen, updatedAt },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
