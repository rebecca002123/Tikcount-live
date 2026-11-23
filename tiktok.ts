/** Extracts a TikTok video ID from a full URL or accepts a numeric ID. */
export function extractVideoId(input: string): string | null {
  const value = input.trim();
  if (/^\d{15,25}$/.test(value)) return value;
  const match = value.match(/\/video\/(\d{15,25})/);
  if (match) return match[1];
  const queryMatch = value.match(/[?&]id=(\d{15,25})/);
  return queryMatch?.[1] ?? null;
}
