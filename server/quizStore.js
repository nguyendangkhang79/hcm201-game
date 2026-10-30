const TTL = 48 * 60 * 60;
const PREFIX = "vnr202:quiz:v1:";

// Development/test only. Production always uses durable Redis.
export function createMemoryStore() {
  const attempts = new Map();
  const actors = new Map();
  const limits = new Map();
  return {
    async start(actor, attempt) {
      const existing = attempts.get(actors.get(actor));
      if (existing && !existing.finishedAt) return structuredClone(existing);
      actors.set(actor, attempt.id);
      attempts.set(attempt.id, structuredClone(attempt));
      return structuredClone(attempt);
    },
    async get(id) {
      return attempts.has(id) ? structuredClone(attempts.get(id)) : null;
    },
    async active(actor) {
      return actors.get(actor) || null;
    },
    async compareAndSet(id, revision, value) {
      if (attempts.get(id)?.revision !== revision) return false;
      attempts.set(id, structuredClone(value));
      return true;
    },
    async limit(key, max, seconds) {
      const now = Date.now();
      const entry = limits.get(key);
      const next =
        entry && entry.until > now
          ? { ...entry, count: entry.count + 1 }
          : { count: 1, until: now + seconds * 1000 };
      limits.set(key, next);
      return next.count <= max;
    },
  };
}

export function createRedisStore({ url, token, fetcher = fetch }) {
  if (!url || !token || !url.startsWith("https://"))
    throw new Error("Quiz Redis configuration missing");
  async function command(args) {
    const response = await fetcher(url.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Quiz storage unavailable");
    const data = await response.json();
    if (data.error) throw new Error("Quiz storage command failed");
    return data.result;
  }
  return {
    async start(actor, attempt) {
      const script = `local id=redis.call('GET',KEYS[1]); if id then local old=redis.call('GET',ARGV[1]..id); if old and cjson.decode(old).finishedAt==cjson.null then return old end end; redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3]); redis.call('SET',KEYS[1],ARGV[4],'EX',ARGV[3]); return ARGV[2]`;
      return JSON.parse(
        await command([
          "EVAL",
          script,
          2,
          `${PREFIX}actor:${actor}`,
          `${PREFIX}attempt:${attempt.id}`,
          `${PREFIX}attempt:`,
          JSON.stringify(attempt),
          TTL,
          attempt.id,
        ]),
      );
    },
    async get(id) {
      const value = await command(["GET", `${PREFIX}attempt:${id}`]);
      return value ? JSON.parse(value) : null;
    },
    async active(actor) {
      return command(["GET", `${PREFIX}actor:${actor}`]);
    },
    async compareAndSet(id, revision, value) {
      const script = `local old=redis.call('GET',KEYS[1]); if not old or cjson.decode(old).revision~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'KEEPTTL'); return 1`;
      return (
        (await command([
          "EVAL",
          script,
          1,
          `${PREFIX}attempt:${id}`,
          revision,
          JSON.stringify(value),
        ])) === 1
      );
    },
    async limit(key, max, seconds) {
      const script = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`;
      return (
        (await command(["EVAL", script, 1, `${PREFIX}rate:${key}`, seconds])) <=
        max
      );
    },
  };
}
