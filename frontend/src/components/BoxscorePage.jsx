function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-700 rounded-xl p-4 flex flex-col items-center justify-center text-center">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-sm text-gray-300 mt-1">{label}</span>
      {sub && <span className="text-xs text-gray-500 mt-0.5">{sub}</span>}
    </div>
  );
}

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

export default function BoxscorePage({
  players,
  games,
  selectedPlayerId,
  selectedGameId,
  onSelectPlayer,
  onSelectGame,
  boxscore,
  loading,
  error,
}) {
  return (
    <section className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Player</label>
          <select
            className="w-full bg-gray-700 text-white rounded-lg p-2"
            value={selectedPlayerId ?? ""}
            onChange={(e) => onSelectPlayer(Number(e.target.value) || null)}
          >
            <option value="">Select a player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.jersey_number != null ? ` #${p.jersey_number}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Game</label>
          <select
            className="w-full bg-gray-700 text-white rounded-lg p-2"
            value={selectedGameId ?? ""}
            onChange={(e) => onSelectGame(Number(e.target.value) || null)}
          >
            <option value="">Select a game…</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                vs {g.opponent} ({g.game_date})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-800/60 border border-red-600 text-red-100 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {!selectedPlayerId || !selectedGameId ? (
        <p className="text-gray-400 text-center py-8">
          Select a player and a game to view the boxscore.
        </p>
      ) : loading ? (
        <p className="text-gray-400 text-center py-8">Loading boxscore…</p>
      ) : boxscore ? (
        <div className="bg-gray-800 rounded-xl p-4 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">{boxscore.player_name}</h2>
            <p className="text-3xl font-extrabold text-orange-400">
              {boxscore.points} PTS
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="FG%"
              value={pct(boxscore.fg_pct)}
              sub={`${boxscore.fgm}/${boxscore.fga}`}
            />
            <StatCard
              label="2P%"
              value={pct(boxscore.fg2_pct)}
              sub={`${boxscore.fg2m}/${boxscore.fg2a}`}
            />
            <StatCard
              label="3P%"
              value={pct(boxscore.fg3_pct)}
              sub={`${boxscore.fg3m}/${boxscore.fg3a}`}
            />
            <StatCard
              label="FT%"
              value={pct(boxscore.ft_pct)}
              sub={`${boxscore.ftm}/${boxscore.fta}`}
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <StatCard label="Rebounds" value={boxscore.rebounds} />
            <StatCard label="Assists" value={boxscore.assists} />
            <StatCard label="Steals" value={boxscore.steals} />
            <StatCard label="Blocks" value={boxscore.blocks} />
            <StatCard label="Turnovers" value={boxscore.turnovers} />
            <StatCard label="Fouls" value={boxscore.fouls} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
