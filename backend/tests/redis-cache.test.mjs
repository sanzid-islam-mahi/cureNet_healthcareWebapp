import test from 'node:test';
import assert from 'node:assert/strict';

process.env.REDIS_ENABLED = 'false';

const cache = await import('../src/lib/cache.js');

test('cache helper safely no-ops when redis is disabled', async () => {
  assert.equal(cache.cacheEnabled(), false);
  assert.equal(await cache.getJson('public:test:key'), null);
  assert.equal(await cache.setJson('public:test:key', { ok: true }, 60), false);
  assert.equal(await cache.delKey('public:test:key'), false);
});
