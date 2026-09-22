import { NextResponse } from "next/server";
import { fetchVocabularyFromGoogleDocs } from "@/lib/google-docs";
import { VocabApiResponse } from "@/lib/types";

// Force dynamic execution for serverless route
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<VocabApiResponse>> {
  try {
    // 1. Fetch & parse from Google Docs API
    const items = await fetchVocabularyFromGoogleDocs();

    // 2. Output extracted results to server console as required
    console.log("==================================================");
    console.log(`[Google Docs Sync] Successfully extracted ${items.length} vocabulary items:`);
    console.log(JSON.stringify(items, null, 2));
    console.log("==================================================");

    const dates = Array.from(new Set(items.map((i) => i.date)));

    return NextResponse.json({
      success: true,
      count: items.length,
      dates,
      data: items,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    console.error("[Google Docs Sync Error]:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: [],
      },
      { status: 500 }
    );
  }
}
