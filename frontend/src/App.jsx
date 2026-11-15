import { useEffect, useMemo, useState } from "react";
import {
  archiveGame,
  createGame,
  createPlayer,
  createStatEntry,
  deleteGame,
  deleteLatestStatEntry,
  deletePlayer,
  getBoxscore,
  getCareerStats,
  getGames,
  getPlayers,
  getStatEntries,
  getStatTypes,
  isNetworkError,
  unarchiveGame,
  updateGame,
  updatePlayer,
} from "./api";
import BoxscorePage from "./components/BoxscorePage";
import CareerPage from "./components/CareerPage";
import GameSelector from "./components/GameSelector";
import ManagePage from "./components/ManagePage";
import OfflineBanner from "./components/OfflineBanner";
import PlayerSelector from "./components/PlayerSelector";
import StatButtons from "./components/StatButtons";
import { vibrate } from "./haptics";
import { enqueueEntry, flushQueue, getQueue } from "./offlineQueue";
import { useOnlineStatus } from "./useOnlineStatus";

let tempIdCounter = -1;

export default function App() {
  const online = useOnlineStatus();
  const [pendingQueue, setPendingQueue] = useState(() => getQueue());
  const [view, setView] = useState("tracker"); // "tracker" | "boxscore" | "career" | "manage"
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [statTypes, setStatTypes] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [undoBusy, setUndoBusy] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [manageError, setManageError] = useState("");

  // Boxscore page state
  const [boxPlayerId, setBoxPlayerId] = useState(null);
  const [boxGameId, setBoxGameId] = useState(null);
  const [boxscore, setBoxscore] = useState(null);
  const [boxLoading, setBoxLoading] = useState(false);
  const [boxError, setBoxError] = useState("");

  // Career page state
  const [careerPlayerId, setCareerPlayerId] = useState(null);
  const [career, setCareer] = useState(null);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState("");

  // Load reference data once.
  useEffect(() => {
    (async () => {
      try {
        const [playersRes, gamesRes, statTypesRes] = await Promise.all([
          getPlayers(),
          getGames(),
          getStatTypes(),
        ]);
        setPlayers(playersRes);
        setGames(gamesRes);
        setStatTypes(statTypesRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, []);

  // Load entries whenever the selected game changes.
  useEffect(() => {
    if (!selectedGameId) {
      setEntries([]);
      return;
    }
    (async () => {
      try {
        const res = await getStatEntries(selectedGameId);
        setEntries(res);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [selectedGameId]);

  // Fetch boxscore whenever the boxscore player/game selection changes.
  useEffect(() => {
    if (!boxPlayerId || !boxGameId) {
      setBoxscore(null);
      return;
    }
    setBoxError("");
    setBoxLoading(true);
    (async () => {
      try {
        const res = await getBoxscore(boxGameId, boxPlayerId);
        setBoxscore(res);
      } catch (err) {
        setBoxscore(null);
        setBoxError(err.message);
      } finally {
        setBoxLoading(false);
      }
    })();
  }, [boxPlayerId, boxGameId]);

  // Fetch career stats whenever the career player selection changes.
  useEffect(() => {
    if (!careerPlayerId) {
      setCareer(null);
      return;
    }
    setCareerError("");
    setCareerLoading(true);
    (async () => {
      try {
        const res = await getCareerStats(careerPlayerId);
        setCareer(res);
      } catch (err) {
        setCareer(null);
        setCareerError(err.message);
      } finally {
        setCareerLoading(false);
      }
    })();
  }, [careerPlayerId]);

  // Retry queued stat entries whenever we come back online (and once on
  // mount, in case entries were queued in a previous offline session).
  useEffect(() => {
    if (!online) return;
    if (pendingQueue.length === 0) return;

    (async () => {
      const { remaining } = await flushQueue(async (item) => {
        const saved = await createStatEntry({
          game_id: item.game_id,
          player_id: item.player_id,
          stat_type_id: item.stat_type_id,
        });
        // Reflect the now-synced entry in the visible list if we're still
        // looking at that game.
        if (item.game_id === selectedGameId) {
          setEntries((prev) =>
            prev.map((entry) =>
              entry.queueId === item.queueId ? { ...saved, _pending: false } : entry
            )
          );
        }
        return saved;
      });
      setPendingQueue(remaining);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId) || null,
    [players, selectedPlayerId]
  );

  const activeGames = useMemo(() => games.filter((g) => !g.is_archived), [games]);

  const canLog = Boolean(selectedPlayerId && selectedGameId);

  const handleCreatePlayer = async (payload) => {
    const player = await createPlayer(payload);
    setPlayers((prev) => [...prev, player]);
    return player;
  };

  const handleCreateGame = async (payload) => {
    const game = await createGame(payload);
    setGames((prev) => [...prev, game]);
    return game;
  };

  const handleUpdatePlayer = async (playerId, payload) => {
    const updated = await updatePlayer(playerId, payload);
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? updated : p)));
  };

  const handleDeletePlayer = async (playerId) => {
    await deletePlayer(playerId);
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    if (selectedPlayerId === playerId) setSelectedPlayerId(null);
  };

  const handleUpdateGame = async (gameId, payload) => {
    const updated = await updateGame(gameId, payload);
    setGames((prev) => prev.map((g) => (g.id === gameId ? updated : g)));
  };

  const handleDeleteGame = async (gameId) => {
    await deleteGame(gameId);
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    if (selectedGameId === gameId) setSelectedGameId(null);
  };

  const handleArchiveGame = async (gameId) => {
    setManageError("");
    try {
      const updated = await archiveGame(gameId);
      setGames((prev) => prev.map((g) => (g.id === gameId ? updated : g)));
      if (selectedGameId === gameId) setSelectedGameId(null);
    } catch (err) {
      setManageError(err.message);
    }
  };

  const handleUnarchiveGame = async (gameId) => {
    setManageError("");
    try {
      const updated = await unarchiveGame(gameId);
      setGames((prev) => prev.map((g) => (g.id === gameId ? updated : g)));
    } catch (err) {
      setManageError(err.message);
    }
  };

  const handleLogStat = async (statType) => {
    if (!canLog) return;
    setError("");

    const tempId = tempIdCounter--;
    const optimisticEntry = {
      id: tempId,
      game_id: selectedGameId,
      player_id: selectedPlayerId,
      player_name: selectedPlayer?.name ?? "",
      stat_type_id: statType.id,
      stat_code: statType.code,
      stat_label: statType.label,
      points_value: statType.points_value,
      created_at: new Date().toISOString(),
      _pending: true,
    };

    // Optimistic update + haptic feedback right away.
    setEntries((prev) => [...prev, optimisticEntry]);
    vibrate(15);

    try {
      const saved = await createStatEntry({
        game_id: selectedGameId,
        player_id: selectedPlayerId,
        stat_type_id: statType.id,
      });
      setEntries((prev) =>
        prev.map((entry) => (entry.id === tempId ? saved : entry))
      );
    } catch (err) {
      if (isNetworkError(err) || !online) {
        // Offline (or connectivity drop mid-request): keep the optimistic
        // entry visible, queue it locally, and retry automatically once
        // we're back online.
        const queued = enqueueEntry({
          game_id: selectedGameId,
          player_id: selectedPlayerId,
          stat_type_id: statType.id,
        });
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === tempId
              ? { ...entry, queueId: queued.queueId, _pending: true, _queued: true }
              : entry
          )
        );
        setPendingQueue(getQueue());
        vibrate(15);
      } else {
        // Genuine API error (validation, 404, 500, etc) — roll back.
        setEntries((prev) => prev.filter((entry) => entry.id !== tempId));
        setError(err.message);
        vibrate([10, 40, 10]);
      }
    }
  };

  const handleUndo = async () => {
    if (!selectedGameId || entries.length === 0 || undoBusy) return;
    setError("");
    setUndoBusy(true);

    const lastEntry = entries[entries.length - 1];
    // Optimistically remove immediately.
    setEntries((prev) => prev.slice(0, -1));
    vibrate(25);

    try {
      await deleteLatestStatEntry(selectedGameId);
    } catch (err) {
      // Roll back on failure — restore the entry.
      setEntries((prev) => [...prev, lastEntry]);
      setError(err.message);
    } finally {
      setUndoBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <OfflineBanner online={online} pendingCount={pendingQueue.length} />

      <header className="p-4 text-center space-y-3">
        <h1 className="text-2xl font-bold">HoopTrack</h1>
        <nav className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setView("tracker")}
            className={`px-4 py-2 rounded-lg font-semibold ${
              view === "tracker"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Tracker
          </button>
          <button
            type="button"
            onClick={() => setView("boxscore")}
            className={`px-4 py-2 rounded-lg font-semibold ${
              view === "boxscore"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Boxscore
          </button>
          <button
            type="button"
            onClick={() => setView("career")}
            className={`px-4 py-2 rounded-lg font-semibold ${
              view === "career"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Career
          </button>
          <button
            type="button"
            onClick={() => setView("manage")}
            className={`px-4 py-2 rounded-lg font-semibold ${
              view === "manage"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Manage
          </button>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-4 space-y-4">
        {view === "tracker" ? (
          <>
            {error && (
              <div className="bg-red-800/60 border border-red-600 text-red-100 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <PlayerSelector
                players={players}
                selectedId={selectedPlayerId}
                onSelect={setSelectedPlayerId}
                onCreate={handleCreatePlayer}
              />
              <GameSelector
                games={activeGames}
                selectedId={selectedGameId}
                onSelect={setSelectedGameId}
                onCreate={handleCreateGame}
              />
            </div>

            <section className="bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">
                  Log Stat{selectedPlayer ? ` — ${selectedPlayer.name}` : ""}
                </h2>
                <span className="text-sm text-gray-400">
                  {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                </span>
              </div>

              {loadingInitial ? (
                <p className="text-gray-400">Loading…</p>
              ) : !canLog ? (
                <p className="text-gray-400">
                  Select (or create) a player and a game to start logging.
                </p>
              ) : (
                <StatButtons
                  statTypes={statTypes}
                  disabled={!canLog}
                  onLog={handleLogStat}
                />
              )}
            </section>
          </>
        ) : view === "boxscore" ? (
          <BoxscorePage
            players={players}
            games={games}
            selectedPlayerId={boxPlayerId}
            selectedGameId={boxGameId}
            onSelectPlayer={setBoxPlayerId}
            onSelectGame={setBoxGameId}
            boxscore={boxscore}
            loading={boxLoading}
            error={boxError}
          />
        ) : view === "career" ? (
          <CareerPage
            players={players}
            selectedPlayerId={careerPlayerId}
            onSelectPlayer={setCareerPlayerId}
            career={career}
            loading={careerLoading}
            error={careerError}
          />
        ) : (
          <ManagePage
            players={players}
            games={games}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onUpdateGame={handleUpdateGame}
            onDeleteGame={handleDeleteGame}
            onArchiveGame={handleArchiveGame}
            onUnarchiveGame={handleUnarchiveGame}
            error={manageError}
          />
        )}
      </main>

      {view === "tracker" && selectedGameId && entries.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-3 flex justify-center">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoBusy}
            className="bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white font-bold rounded-xl px-8 py-3 shadow-lg disabled:opacity-50"
          >
            {undoBusy ? "Undoing…" : "Undo Last Entry"}
          </button>
        </div>
      )}
    </div>
  );
}
