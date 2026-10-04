import { NextResponse } from "next/server";
import { readContent, writeContent } from "@/lib/content.server";

// Reads and writes the JSON file, so it can never be prerendered or cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Error codes for a file system the app is not allowed to write to. */
const READ_ONLY = new Set(["EROFS", "EACCES", "EPERM"]);

export async function GET() {
  return NextResponse.json(await readContent());
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The content sent was not valid JSON." }, { status: 400 });
  }

  try {
    return NextResponse.json(await writeContent(body));
  } catch (error) {
    // Serverless hosts such as Vercel mount the app read-only, so the content
    // file cannot be written there. Say so, rather than surfacing EROFS.
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
    if (code && READ_ONLY.has(code)) {
      return NextResponse.json(
        {
          error:
            "Saving is not available on this host because its file system is read-only. Edit locally and redeploy, or connect a storage service.",
        },
        { status: 503 },
      );
    }
    throw error;
  }
}
