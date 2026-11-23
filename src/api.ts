import type { StatsResponse } from "./types";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

/**
 * Expected backend contract:
 * GET {API_BASE}/video-stats?videoId=123
 * -> { videoId, title?, coverUrl?, views, likes, comments, shares, updatedAt? }
 *
 * Keep the TikTok/TokCount data provider on your own backend. Do not put private
 * API keys or undocumented third-party endpoints in the mobile app.
 */
export async function fetchVideoStats(videoId: string): Promise<StatsResponse> {
  if (!API_BASE) {
    throw new Error("Add EXPO_PUBLIC_API_BASE_URL to your .env file to connect live data.");
  }
  const response = await fetch(
    `${API_BASE}/video-stats?videoId=${encodeURIComponent(videoId)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error(`Stats service returned ${response.status}.`);
  const data = await response.json();
  for (const key of ["views", "likes", "comments", "shares"] as const) {
    if (typeof data[key] !== "number" || !Number.isFinite(data[key])) {
      throw new Error(`Stats response is missing a valid ${key} value.`);
    }
  }
  return data as StatsResponse;
}
