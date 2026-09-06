import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { defaultContent, mergeContent, type SiteContent } from "@/lib/content";

/**
 * Content storage.
 *
 * A JSON file on disk, not a database: the dashboard is a single-editor tool
 * and the site is small enough that a file is the honest shape for it. Works
 * under `next dev` and on any node host with a writable filesystem. On a
 * read-only or ephemeral filesystem (serverless), saves will not persist.
 */

const FILE = path.join(process.cwd(), "content", "site-content.json");

export async function readContent(): Promise<SiteContent> {
  try {
    const raw = await readFile(FILE, "utf8");
    return mergeContent(JSON.parse(raw));
  } catch {
    // No file yet, or unparseable. The defaults are the source of truth.
    return defaultContent;
  }
}

export async function writeContent(input: unknown): Promise<SiteContent> {
  const next = { ...mergeContent(input), updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
