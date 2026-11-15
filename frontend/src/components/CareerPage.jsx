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

export default function CareerPage({
  players,
  selectedPlayerId,
  onSelectPlayer,
  career,
  loading,
  error,
}) {
  return (
    <section className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-4">
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

      {error && (
        <div className="bg-red-800/60 border border-red-600 text-red-100 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {!selectedPlayerId ? (
        <p className="text-gray-400 text-center py-8">
          Select a player to view career stats.
        </p>
      ) : loading ? (
        <p className="text-gray-400 text-center py-8">Loading career stats…</p>
      ) : career ? (
        <div className="bg-gray-800 rounded-xl p-4 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">{career.player_name}</h2>
            <p className="text-sm text-gray-400">
              {career.games_played} game{career.games_played === 1 ? "" : "s"} played
            </p>
            <p className="text-3xl font-extrabold text-orange-400">
              {career.ppg} PPG
            </p>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm mb-2 uppercase tracking-wide">
              Averages
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <StatCard label="PPG" value={career.ppg} />
              <StatCard label="RPG" value={career.rpg} />
              <StatCard label="APG" value={career.apg} />
              <StatCard label="SPG" value={career.spg} />
              <StatCard label="BPG" value={career.bpg} />
              <StatCard label="TOPG" value={career.topg} />
            </div>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm mb-2 uppercase tracking-wide">
              Shooting (Career Totals)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="FG%"
                value={pct(career.fg_pct)}
                sub={`${career.fgm}/${career.fga}`}
              />
              <StatCard
                label="2P%"
                value={pct(career.fg2_pct)}
                sub={`${career.fg2m}/${career.fg2a}`}
              />
              <StatCard
                label="3P%"
                value={pct(career.fg3_pct)}
                sub={`${career.fg3m}/${career.fg3a}`}
              />
              <StatCard
                label="FT%"
                value={pct(career.ft_pct)}
                sub={`${career.ftm}/${career.fta}`}
              />
            </div>
          </div>

          <div>
            <h3 className="text-gray-400 text-sm mb-2 uppercase tracking-wide">
              Totals
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <StatCard label="Points" value={career.points} />
              <StatCard label="Rebounds" value={career.rebounds} />
              <StatCard label="Assists" value={career.assists} />
              <StatCard label="Steals" value={career.steals} />
              <StatCard label="Blocks" value={career.blocks} />
              <StatCard label="Turnovers" value={career.turnovers} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
