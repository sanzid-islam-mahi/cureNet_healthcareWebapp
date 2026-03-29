import { createClient } from 'redis';

const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let client = null;
let clientPromise = null;
let connectWarned = false;
let runtimeWarned = false;

function warnConnect(err) {
  if (connectWarned) return;
  connectWarned = true;
  console.warn('Redis unavailable, falling back to direct database reads:', err?.message || err);
}

function warnRuntime(err) {
  if (runtimeWarned) return;
  runtimeWarned = true;
  console.warn('Redis operation failed, continuing without cache:', err?.message || err);
}

async function getClient() {
  if (!REDIS_ENABLED) return null;
  if (client?.isOpen) return client;
  if (!clientPromise) {
    const next = createClient({ url: REDIS_URL });
    next.on('error', warnRuntime);
    clientPromise = next.connect()
      .then(() => {
        client = next;
        return next;
      })
      .catch((err) => {
        warnConnect(err);
        clientPromise = null;
        client = null;
        return null;
      });
  }
  const connected = await clientPromise;
  if (!connected) clientPromise = null;
  return connected;
}

export function cacheEnabled() {
  return REDIS_ENABLED;
}

export async function getJson(key) {
  try {
    const redis = await getClient();
    if (!redis) return null;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    warnRuntime(err);
    return null;
  }
}

export async function setJson(key, value, ttlSeconds) {
  try {
    const redis = await getClient();
    if (!redis) return false;
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, payload, { EX: ttlSeconds });
    } else {
      await redis.set(key, payload);
    }
    return true;
  } catch (err) {
    warnRuntime(err);
    return false;
  }
}

export async function delKey(key) {
  try {
    const redis = await getClient();
    if (!redis) return false;
    await redis.del(key);
    return true;
  } catch (err) {
    warnRuntime(err);
    return false;
  }
}
