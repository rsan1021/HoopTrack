import { useState } from "react";

export default function PlayerSelector({ players, selectedId, onSelect, onCreate }) {
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim() };
      if (jersey !== "") payload.jersey_number = Number(jersey);
      const player = await onCreate(payload);
      setName("");
      setJersey("");
      onSelect(player.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <h2 className="text-white font-semibold text-lg">Player</h2>

      <select
        className="w-full bg-gray-700 text-white rounded-lg p-2"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(Number(e.target.value) || null)}
      >
        <option value="">Select a player…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.jersey_number != null ? ` #${p.jersey_number}` : ""}
          </option>
        ))}
      </select>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          placeholder="New player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-gray-700 text-white rounded-lg p-2"
        />
        <input
          type="number"
          placeholder="#"
          min="0"
          max="99"
          value={jersey}
          onChange={(e) => setJersey(e.target.value)}
          className="w-16 bg-gray-700 text-white rounded-lg p-2"
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
