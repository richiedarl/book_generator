/**
 * Claude Availability Check API Route
 *
 * Lightweight check to determine whether the Anthropic API key is configured.
 * This allows the UI to show a clear error before attempting generation
 * rather than silently failing.
 *
 * Returns:
 * {
 *   "claude": {
 *     "configured": true,
 *     "model": "claude-opus-5"
 *   }
 * }
 */

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const apiKeys = process.env.ANTHROPIC_API_KEYS;
  // Also check for proxy auth token (used in local development)
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;

  const hasKey =
    (apiKey && apiKey.trim().length > 0) ||
    (apiKeys && apiKeys.split(",").filter((k) => k.trim()).length > 0) ||
    (authToken && authToken.trim().length > 0 && baseUrl && baseUrl.trim().length > 0);

  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

  return NextResponse.json({
    claude: {
      configured: hasKey,
      model,
    },
  });
}
