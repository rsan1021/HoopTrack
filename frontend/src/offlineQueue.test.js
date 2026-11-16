import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearQueue, enqueueEntry, flushQueue, getQueue, isQueueItemInFlight, removeFromQueue,
} from "./offlineQueue.js";

const key = "hooptrack_pending_entries";
let data;
let storage;

beforeEach(() => {
  data = new Map();
  storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  globalThis.localStorage = storage;
});
afterEach(() => { delete globalThis.localStorage; });

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function ids() { return getQueue().map((item) => item.queueId); }

test("remove persists and does not permit callers to supply a duplicate queue ID", () => {
  const first = enqueueEntry({ value: 1 });
  const second = enqueueEntry({ queueId: first.queueId, value: 2 });
  assert.notEqual(first.queueId, second.queueId);
  assert.deepEqual(removeFromQueue(first.queueId), [second]);
  assert.deepEqual(getQueue(), [second]);
  clearQueue();
  assert.deepEqual(getQueue(), []);
});

test("flush skips removed snapshot items and preserves new items during submission", async () => {
  const first = enqueueEntry({ value: 1 });
  const second = enqueueEntry({ value: 2 });
  const third = enqueueEntry({ value: 3 });
  const gate = deferred();
  const started = deferred();
  const calls = [];
  const flush = flushQueue(async (item) => {
    calls.push(item.value);
    if (item.queueId === first.queueId) {
      started.resolve();
      await gate.promise;
    }
    return `saved ${item.value}`;
  });
  await started.promise;
  removeFromQueue(second.queueId);
  const added = enqueueEntry({ value: 4 });
  gate.resolve();
  const result = await flush;
  assert.deepEqual(calls, [1, 3]);
  assert.deepEqual(result.submitted.map(({ item, saved }) => [item.queueId, saved]), [
    [first.queueId, "saved 1"], [third.queueId, "saved 3"],
  ]);
  assert.deepEqual(result.remaining, [added]);
  assert.deepEqual(ids(), [added.queueId]);
});

test("only one flush runs, exposes in-flight state and rejects undo/clear", async () => {
  const first = enqueueEntry({ value: 1 });
  const second = enqueueEntry({ value: 2 });
  const gate = deferred();
  const started = deferred();
  let calls = 0;
  const firstFlush = flushQueue(async () => {
    calls++;
    started.resolve();
    await gate.promise;
    return "saved";
  });
  const secondFlush = flushQueue(() => { throw new Error("must not be called"); });
  assert.strictEqual(firstFlush, secondFlush);
  await started.promise;
  assert.equal(isQueueItemInFlight(first.queueId), true);
  assert.equal(isQueueItemInFlight(second.queueId), false);
  assert.throws(() => removeFromQueue(first.queueId), /being submitted/);
  assert.throws(() => clearQueue(), /being submitted/);
  removeFromQueue(second.queueId);
  gate.resolve();
  const [a, b] = await Promise.all([firstFlush, secondFlush]);
  assert.strictEqual(a, b);
  assert.equal(calls, 1);
  assert.equal(isQueueItemInFlight(first.queueId), false);
  assert.deepEqual(getQueue(), []);
});

test("failed submission stops in order, retains queue and releases the lock", async () => {
  const first = enqueueEntry({ value: 1 });
  const second = enqueueEntry({ value: 2 });
  let calls = 0;
  const result = await flushQueue(() => { calls++; throw new Error("offline"); });
  assert.equal(calls, 1);
  assert.deepEqual(result, { submitted: [], remaining: [first, second] });
  assert.equal(isQueueItemInFlight(first.queueId), false);
  const retry = await flushQueue((item) => item.value);
  assert.deepEqual(retry.submitted.map((entry) => entry.saved), [1, 2]);
  assert.deepEqual(retry.remaining, []);
});

test("a failed in-flight submission reports the current queue, not a stale snapshot", async () => {
  const first = enqueueEntry({ value: 1 });
  const second = enqueueEntry({ value: 2 });
  const gate = deferred();
  const started = deferred();
  const flush = flushQueue(() => { started.resolve(); return gate.promise; });
  await started.promise;
  removeFromQueue(second.queueId);
  const added = enqueueEntry({ value: 3 });
  gate.reject(new Error("offline"));
  assert.deepEqual(await flush, { submitted: [], remaining: [first, added] });
  assert.deepEqual(getQueue(), [first, added]);
});

test("snapshot excludes items added before the submission callback starts", async () => {
  const first = enqueueEntry({ value: 1 });
  const flush = flushQueue((item) => item.value);
  const added = enqueueEntry({ value: 2 });
  const result = await flush;
  assert.deepEqual(result.submitted.map(({ item }) => item.queueId), [first.queueId]);
  assert.deepEqual(result.remaining, [added]);
});

test("storage write failures are observable for remove, clear, enqueue and flush", async () => {
  const first = enqueueEntry({ value: 1 });
  const error = new Error("quota exceeded");
  storage.setItem = () => { throw error; };
  assert.throws(() => removeFromQueue(first.queueId), (err) => err === error);
  assert.throws(() => clearQueue(), (err) => err === error);
  assert.throws(() => enqueueEntry({ value: 2 }), (err) => err === error);
  await assert.rejects(flushQueue(() => "saved"), (err) => err === error);
  assert.equal(isQueueItemInFlight(first.queueId), false);
  assert.deepEqual(getQueue(), [first]);
  storage.setItem = (key, value) => data.set(key, value);
  assert.deepEqual((await flushQueue(() => "saved again")).remaining, []);
});

test("read and malformed data failures never overwrite pending storage", async () => {
  const error = new Error("storage unavailable");
  storage.getItem = () => { throw error; };
  assert.throws(() => removeFromQueue("missing"), (err) => err === error);
  assert.throws(() => enqueueEntry({}), (err) => err === error);
  await assert.rejects(flushQueue(() => {}), (err) => err === error);
  storage.getItem = (key) => data.get(key) ?? null;
  data.set(key, "not json");
  assert.throws(() => removeFromQueue("missing"), SyntaxError);
  assert.equal(data.get(key), "not json");
  data.set(key, "{}");
  assert.throws(() => getQueue(), /Invalid offline queue/);
});
