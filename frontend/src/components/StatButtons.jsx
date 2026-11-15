const STAT_COLORS = {
  FG_MADE_2: "bg-green-600 hover:bg-green-500 active:bg-green-700",
  FG_MADE_3: "bg-green-600 hover:bg-green-500 active:bg-green-700",
  FT_MADE: "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700",
  FG_MISS_2: "bg-red-600 hover:bg-red-500 active:bg-red-700",
  FG_MISS_3: "bg-red-600 hover:bg-red-500 active:bg-red-700",
  FT_MISS: "bg-rose-600 hover:bg-rose-500 active:bg-rose-700",
  REBOUND: "bg-blue-600 hover:bg-blue-500 active:bg-blue-700",
  ASSIST: "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700",
  STEAL: "bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700",
  BLOCK: "bg-purple-600 hover:bg-purple-500 active:bg-purple-700",
  TURNOVER: "bg-orange-600 hover:bg-orange-500 active:bg-orange-700",
  FOUL: "bg-gray-600 hover:bg-gray-500 active:bg-gray-700",
};

const DEFAULT_COLOR = "bg-slate-600 hover:bg-slate-500 active:bg-slate-700";

export default function StatButtons({ statTypes, disabled, onLog }) {
  if (!statTypes.length) {
    return <p className="text-gray-400">Loading stat buttons...</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {statTypes.map((st) => (
        <button
          key={st.id}
          type="button"
          disabled={disabled}
          onClick={() => onLog(st)}
          className={`${
            STAT_COLORS[st.code] || DEFAULT_COLOR
          } text-white font-bold rounded-xl py-6 text-lg shadow-md transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
        >
          {st.label}
        </button>
      ))}
    </div>
  );
}
