// Fixed-window limit on enquiry submissions per client IP.
// Upstash Redis (REST) shares counts across serverless instances when configured; otherwise a
// per-instance memory map still stops rapid-fire scripts hitting one warm instance.
// Ghanaian mobile networks share IPs between many customers, so the limit is deliberately generous.
export const enquiryLimit = 10;
const windowSeconds = 60 * 60;
const memory = new Map<string, { count: number; reset: number }>();

export function clientIp(request: Request) {
  // Vercel overwrites these headers, so visitors cannot spoof them there.
  return request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

async function redisCount(key: string): Promise<number | undefined> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(windowSeconds)]]),
      signal: AbortSignal.timeout(3000),
    });
    const result: unknown = await response.json();
    const count = Array.isArray(result) ? (result[0] as { result?: unknown })?.result : undefined;
    if (response.ok && typeof count === 'number') return count;
  } catch {}
  console.error('Enquiry rate-limit store unavailable; falling back to in-memory counting.');
  return undefined;
}

export async function checkRateLimit(ip: string, now = Date.now()) {
  const bucket = Math.floor(now / 1000 / windowSeconds);
  const reset = (bucket + 1) * windowSeconds * 1000;
  const key = `enquiry:${ip}:${bucket}`;
  let count = await redisCount(key);
  if (count === undefined) {
    if (memory.size > 5000) for (const [stale, entry] of memory) if (entry.reset <= now) memory.delete(stale);
    const entry = memory.get(key) ?? { count: 0, reset };
    entry.count++;
    memory.set(key, entry);
    count = entry.count;
  }
  return { allowed: count <= enquiryLimit, retryAfter: Math.ceil((reset - now) / 1000) };
}
