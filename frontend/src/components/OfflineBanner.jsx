export default function OfflineBanner({ online, pendingCount }) {
  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 text-center text-sm font-semibold py-2 px-4 ${
        online ? "bg-yellow-600 text-white" : "bg-red-700 text-white"
      }`}
    >
      {online
        ? `Syncing ${pendingCount} queued ${pendingCount === 1 ? "entry" : "entries"}…`
        : `Offline — logging locally${pendingCount > 0 ? ` (${pendingCount} queued)` : ""}`}
    </div>
  );
}
