#!/usr/bin/env node

import { performance } from 'node:perf_hooks';

function parseArgs(argv) {
  const args = {
    baseUrl: 'http://localhost:5000',
    path: '/api/health',
    requests: 50,
    concurrency: 5,
    method: 'GET',
    thresholdMs: 500,
    timeoutMs: 10000,
    body: null,
    headerPairs: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--base-url') args.baseUrl = next, i += 1;
    else if (arg === '--path') args.path = next, i += 1;
    else if (arg === '--requests') args.requests = Number(next), i += 1;
    else if (arg === '--concurrency') args.concurrency = Number(next), i += 1;
    else if (arg === '--method') args.method = String(next).toUpperCase(), i += 1;
    else if (arg === '--threshold-ms') args.thresholdMs = Number(next), i += 1;
    else if (arg === '--timeout-ms') args.timeoutMs = Number(next), i += 1;
    else if (arg === '--body') args.body = next, i += 1;
    else if (arg === '--header') args.headerPairs.push(next), i += 1;
  }

  return args;
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

async function runSingleRequest({ url, method, headers, body, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    await response.text();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: performance.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: 'ERR',
      durationMs: performance.now() - started,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = new URL(args.path, args.baseUrl).toString();
  const headers = Object.fromEntries(
    args.headerPairs.map((pair) => {
      const splitIndex = pair.indexOf(':');
      if (splitIndex === -1) return [pair.trim(), ''];
      return [pair.slice(0, splitIndex).trim(), pair.slice(splitIndex + 1).trim()];
    }),
  );

  if (args.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const queue = Array.from({ length: args.requests }, (_, index) => index);
  const results = [];
  const wallStart = performance.now();

  async function worker() {
    while (queue.length > 0) {
      queue.pop();
      const result = await runSingleRequest({
        url,
        method: args.method,
        headers,
        body: args.body,
        timeoutMs: args.timeoutMs,
      });
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(args.concurrency, args.requests) }, () => worker());
  await Promise.all(workers);
  const wallDurationMs = performance.now() - wallStart;

  const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
  const successCount = results.filter((item) => item.ok).length;
  const failureCount = results.length - successCount;
  const averageMs = durations.reduce((sum, value) => sum + value, 0) / (durations.length || 1);
  const minMs = durations[0] || 0;
  const maxMs = durations[durations.length - 1] || 0;
  const p95Ms = percentile(durations, 95);
  const p99Ms = percentile(durations, 99);
  const throughput = results.length / (wallDurationMs / 1000 || 1);

  console.log(`API Load Test Report`);
  console.log(`URL: ${url}`);
  console.log(`Method: ${args.method}`);
  console.log(`Requests: ${args.requests}`);
  console.log(`Concurrency: ${args.concurrency}`);
  console.log(`Threshold: ${args.thresholdMs} ms`);
  console.log(``);
  console.log(`Successful responses: ${successCount}`);
  console.log(`Failed responses: ${failureCount}`);
  console.log(`Total wall time: ${wallDurationMs.toFixed(2)} ms`);
  console.log(`Throughput: ${throughput.toFixed(2)} req/s`);
  console.log(`Average response time: ${averageMs.toFixed(2)} ms`);
  console.log(`Min response time: ${minMs.toFixed(2)} ms`);
  console.log(`P95 response time: ${p95Ms.toFixed(2)} ms`);
  console.log(`P99 response time: ${p99Ms.toFixed(2)} ms`);
  console.log(`Max response time: ${maxMs.toFixed(2)} ms`);

  if (failureCount > 0) {
    const sample = results.find((item) => !item.ok);
    console.log(``);
    console.log(`Sample failure: status=${sample.status} error=${sample.error || 'n/a'}`);
  }

  const passed = failureCount === 0 && p95Ms <= args.thresholdMs;
  console.log(``);
  console.log(`Result: ${passed ? 'PASS' : 'FAIL'} (P95 ${passed ? '<=' : '>'} ${args.thresholdMs} ms)`);
  process.exitCode = passed ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
