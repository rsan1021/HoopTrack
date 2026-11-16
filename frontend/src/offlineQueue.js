const STORAGE_KEY = "hooptrack_pending_entries";

// Storage failures must propagate: treating an unreadable queue as empty could
// overwrite pending entries, and treating a failed write as success loses undo.
function readQueue() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(queue)) throw new Error("Invalid offline queue in storage");
  return queue;
}

function writeQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

let queueIdCounter = 0;
let activeFlush = null;
let inFlightQueueId = null;

export function getQueue() {
  return readQueue();
}

export function enqueueEntry(entry) {
  const queue = readQueue();
  const queued = {
    ...entry,
    queueId: `q-${Date.now()}-${queueIdCounter++}`,
    queued_at: new Date().toISOString(),
  };
  queue.push(queued);
  writeQueue(queue);
  return queued;
}

export function isQueueItemInFlight(queueId) {
  return inFlightQueueId !== null && inFlightQueueId === queueId;
}

export function removeFromQueue(queueId) {
  if (isQueueItemInFlight(queueId)) {
    throw new Error("Cannot remove an offline queue item while it is being submitted");
  }
  const existing = readQueue();
  if (!existing.some((item) => item.queueId === queueId)) {
    throw new Error("This queued entry has already changed or synced. Refresh the game before undoing it.");
  }
  const queue = existing.filter((item) => item.queueId !== queueId);
  writeQueue(queue);
  return queue;
}

export function clearQueue() {
  if (inFlightQueueId !== null) {
    throw new Error("Cannot clear the offline queue while an item is being submitted");
  }
  writeQueue([]);
}

/**
 * Submit the items present at the start, in order, stopping at the first
 * submission failure. Removed items are skipped; newly queued items are left
 * for a later flush. Concurrent callers share one flush within this module.
 * Storage errors reject rather than reporting a deletion that did not persist.
 */
export function flushQueue(submitFn) {
  if (activeFlush) return activeFlush;

  let ids;
  try {
    ids = readQueue().map((item) => item.queueId);
  } catch (error) {
    return Promise.reject(error);
  }
  // Defer callbacks until the lock is installed, even for synchronous callbacks.
  activeFlush = Promise.resolve().then(async () => {
    const submitted = [];

    for (const id of ids) {
      const item = readQueue().find((queued) => queued.queueId === id);
      if (!item) continue;

      inFlightQueueId = id;
      try {
        let saved;
        try {
          saved = await submitFn(item);
        } catch {
          // Stop on first submission failure (likely still offline).
          break;
        }
        // Re-read after the await so concurrent removals and additions survive.
        const remaining = readQueue().filter((queued) => queued.queueId !== id);
        writeQueue(remaining);
        submitted.push({ item, saved });
      } finally {
        inFlightQueueId = null;
      }
    }

    return { submitted, remaining: readQueue() };
  }).finally(() => {
    activeFlush = null;
  });

  return activeFlush;
}
