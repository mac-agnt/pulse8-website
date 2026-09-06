import { NextResponse } from "next/server";
import { readContent, writeContent } from "@/lib/content.server";

// Reads and writes the JSON file, so it can never be prerendered or cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readContent());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await writeContent(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save content";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
