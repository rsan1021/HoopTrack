import { useState } from "react";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function GameSelector({ games, selectedId, onSelect, onCreate }) {
  const [opponent, setOpponent] = useState("");
  const [gameDate, setGameDate] = useState(todayIso());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!opponent.trim()) {
      setError("Opponent is required");
      return;
    }
    setBusy(true);
    try {
      const game = await onCreate({ opponent: opponent.trim(), game_date: gameDate });
      setOpponent("");
      setGameDate(todayIso());
      onSelect(game.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold text-lg">Game</h2>

      <select
        className="w-full bg-gray-700 text-white rounded-lg p-2"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(Number(e.target.value) || null)}
      >
        <option value="">Select a game…</option>
        {games.map((g) => (
          <option key={g.id} value={g.id}>
            vs {g.opponent} ({g.game_date})
          </option>
        ))}
      </select>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          placeholder="Opponent"
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          className="flex-1 bg-gray-700 text-white rounded-lg p-2"
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
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
