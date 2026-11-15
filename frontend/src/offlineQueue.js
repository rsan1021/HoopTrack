const STORAGE_KEY = "hooptrack_pending_entries";

function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* localStorage unavailable (e.g. private mode) — queue just won't persist */
  }
}

let queueIdCounter = 0;

export function getQueue() {
  return readQueue();
}

export function enqueueEntry(entry) {
  const queue = readQueue();
  const queued = {
    queueId: `q-${Date.now()}-${queueIdCounter++}`,
    queued_at: new Date().toISOString(),
    ...entry,
  };
  queue.push(queued);
  writeQueue(queue);
  return queued;
}

export function removeFromQueue(queueId) {
  const queue = readQueue().filter((item) => item.queueId !== queueId);
  writeQueue(queue);
  return queue;
}

export function clearQueue() {
  writeQueue([]);
}

/**
 * Attempts to submit every queued entry (in order) using the provided
 * submitFn(entry) => Promise<savedEntry>. Successfully submitted entries are
 * removed from the queue. Stops at the first failure so ordering/undo stays
 * consistent, and returns { submitted, remaining }.
 */
export async function flushQueue(submitFn) {
  const queue = readQueue();
  const submitted = [];

  while (queue.length > 0) {
    const item = queue[0];
    try {
      const saved = await submitFn(item);
      submitted.push({ item, saved });
      queue.shift();
      writeQueue(queue);
    } catch {
      // Stop on first failure (likely still offline); leave remaining queued.
      break;
    }
  }

  return { submitted, remaining: queue };
}
