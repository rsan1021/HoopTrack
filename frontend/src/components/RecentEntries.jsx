import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

function formatTime(value) {
  if (!value) return "";
  // SQLite timestamps are UTC but do not contain a timezone suffix.
  const utcValue = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(utcValue);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function RecentEntries({ entries, busy, onUndo }) {
  const [confirmEntry, setConfirmEntry] = useState(null);
  const recent = entries.slice(-20).reverse();

  return (
    <section className="bg-gray-800 rounded-xl p-4 space-y-3" aria-label="Recent stat entries">
      <div>
        <h2 className="text-white font-semibold text-lg">Recent Entries</h2>
        <p className="text-gray-400 text-sm">Showing up to 20 entries for this game, newest first. Undo removes only the selected entry.</p>
      </div>
      {recent.length === 0 ? (
        <p className="text-gray-400">No entries for this game yet.</p>
      ) : (
        <ol className="space-y-2">
          {recent.map((entry) => (
            <li key={entry.queueId || entry.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-700 p-3">
              <div className="min-w-0">
                <p className="font-semibold">{entry.stat_label} — {entry.player_name}</p>
                <p className="text-xs text-gray-300">{formatTime(entry.created_at)}{entry._queued ? " · Queued offline" : entry._pending ? " · Saving…" : ""}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmEntry(entry)}
                disabled={busy || (entry._pending && !entry._queued)}
                aria-label={`Undo ${entry.stat_label} for ${entry.player_name}`}
                className="shrink-0 bg-yellow-700 hover:bg-yellow-600 text-white font-semibold rounded-lg px-4 py-2 disabled:opacity-50"
              >
                Undo
              </button>
            </li>
          ))}
        </ol>
      )}
      <ConfirmDialog
        open={Boolean(confirmEntry)}
        title="Undo this entry?"
        message={confirmEntry ? `${confirmEntry.stat_label} for ${confirmEntry.player_name} (${formatTime(confirmEntry.created_at)}). ${confirmEntry._queued ? "This cancels the queued retry on this device, but a failed request may already have reached the server. Check the game after reconnecting." : "This removes only this entry."}` : ""}
        confirmLabel="Undo entry"
        onCancel={() => setConfirmEntry(null)}
        onConfirm={() => {
          const entry = confirmEntry;
          setConfirmEntry(null);
          onUndo(entry);
        }}
      />
    </section>
  );
}
