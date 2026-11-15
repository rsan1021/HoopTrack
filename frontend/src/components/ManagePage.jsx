import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

function EditPlayerForm({ player, onSave, onCancel }) {
  const [name, setName] = useState(player.name);
  const [jersey, setJersey] = useState(
    player.jersey_number != null ? String(player.jersey_number) : ""
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim() };
      payload.jersey_number = jersey === "" ? null : Number(jersey);
      await onSave(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 min-w-[8rem] bg-gray-700 text-white rounded-lg p-2"
      />
      <input
        type="number"
        min="0"
        max="99"
        value={jersey}
        onChange={(e) => setJersey(e.target.value)}
        className="w-16 bg-gray-700 text-white rounded-lg p-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="bg-gray-600 hover:bg-gray-500 text-white rounded-lg px-3 py-2 text-sm font-semibold"
      >
        Cancel
      </button>
      {error && <p className="text-red-400 text-sm w-full">{error}</p>}
    </form>
  );
}

function EditGameForm({ game, onSave, onCancel }) {
  const [opponent, setOpponent] = useState(game.opponent);
  const [gameDate, setGameDate] = useState(game.game_date);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!opponent.trim()) {
      setError("Opponent is required");
      return;
    }
    setBusy(true);
    try {
      await onSave({ opponent: opponent.trim(), game_date: gameDate });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        type="text"
        value={opponent}
        onChange={(e) => setOpponent(e.target.value)}
        className="flex-1 min-w-[8rem] bg-gray-700 text-white rounded-lg p-2"
      />
      <input
        type="date"
        value={gameDate}
        onChange={(e) => setGameDate(e.target.value)}
        className="bg-gray-700 text-white rounded-lg p-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="bg-gray-600 hover:bg-gray-500 text-white rounded-lg px-3 py-2 text-sm font-semibold"
      >
        Cancel
      </button>
      {error && <p className="text-red-400 text-sm w-full">{error}</p>}
    </form>
  );
}

export default function ManagePage({
  players,
  games,
  onUpdatePlayer,
  onDeletePlayer,
  onUpdateGame,
  onDeleteGame,
  onArchiveGame,
  onUnarchiveGame,
  error,
}) {
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingGameId, setEditingGameId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, id, label }
  const [rowError, setRowError] = useState("");

  const closeConfirm = () => setConfirm(null);

  const handleConfirmed = async () => {
    if (!confirm) return;
    setRowError("");
    try {
      if (confirm.type === "player") {
        await onDeletePlayer(confirm.id);
      } else if (confirm.type === "game") {
        await onDeleteGame(confirm.id);
      }
    } catch (err) {
      setRowError(err.message);
    } finally {
      closeConfirm();
    }
  };

  return (
    <section className="space-y-6">
      {(error || rowError) && (
        <div className="bg-red-800/60 border border-red-600 text-red-100 rounded-lg p-3 text-sm">
          {error || rowError}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-lg">Players</h2>
        {players.length === 0 && (
          <p className="text-gray-400 text-sm">No players yet.</p>
        )}
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id} className="bg-gray-700 rounded-lg p-3">
              {editingPlayerId === p.id ? (
                <EditPlayerForm
                  player={p}
                  onCancel={() => setEditingPlayerId(null)}
                  onSave={async (payload) => {
                    await onUpdatePlayer(p.id, payload);
                    setEditingPlayerId(null);
                  }}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white">
                    {p.name}
                    {p.jersey_number != null ? ` #${p.jersey_number}` : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPlayerId(p.id)}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          type: "player",
                          id: p.id,
                          label: `Delete player "${p.name}"? This cannot be undone.`,
                        })
                      }
                      className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-lg">Games</h2>
        {games.length === 0 && (
          <p className="text-gray-400 text-sm">No games yet.</p>
        )}
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id} className="bg-gray-700 rounded-lg p-3">
              {editingGameId === g.id ? (
                <EditGameForm
                  game={g}
                  onCancel={() => setEditingGameId(null)}
                  onSave={async (payload) => {
                    await onUpdateGame(g.id, payload);
                    setEditingGameId(null);
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-white">
                    vs {g.opponent} ({g.game_date})
                    {g.is_archived && (
                      <span className="ml-2 text-xs bg-yellow-700 text-yellow-100 rounded px-2 py-0.5">
                        Archived
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditingGameId(g.id)}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Edit
                    </button>
                    {g.is_archived ? (
                      <button
                        type="button"
                        onClick={() => onUnarchiveGame(g.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Unarchive
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onArchiveGame(g.id)}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          type: "game",
                          id: g.id,
                          label: `Delete game vs "${g.opponent}"? This cannot be undone.`,
                        })
                      }
                      className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Confirm Delete"
        message={confirm?.label}
        confirmLabel="Delete"
        onConfirm={handleConfirmed}
        onCancel={closeConfirm}
      />
    </section>
  );
}
