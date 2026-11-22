import { redirect } from "next/navigation";
import { blendedSignInUrl } from "@/lib/blended/links.server";

export const dynamic = "force-dynamic";

/**
 * "Student login > Blended learning" in the header. Sends the learner to
 * Pulse 8 Blended Learning's sign-in page, read from BLENDED_LEARNING_URL on
 * each request, so moving BL to its own domain needs no rebuild. While BL is
 * not configured it falls back to the blended courses section.
 */
export function GET() {
  redirect(blendedSignInUrl() ?? "/courses#blended-learning");
}
