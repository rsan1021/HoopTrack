"""API regression tests; run from backend with python -m unittest discover -s tests."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app import db
from app.main import app


class StatEntryEndpointTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        db_patch = patch.object(db, "DB_PATH", str(Path(self.temp_dir.name) / "test.db"))
        db_patch.start()
        self.addCleanup(db_patch.stop)
        self.client = TestClient(app)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

        self.game = self.create("/games", {"opponent": "Visitors", "game_date": "2025-01-01"})
        self.other_game = self.create("/games", {"opponent": "Rivals", "game_date": "2025-01-02"})
        self.player = self.create("/players", {"name": "Alex", "jersey_number": 4})
        self.other_player = self.create("/players", {"name": "Sam", "jersey_number": 7})
        response = self.client.get("/stat_types")
        self.assertEqual(response.status_code, 200)
        self.stat_types = {item["code"]: item for item in response.json()}

    def create(self, path, payload):
        response = self.client.post(path, json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def create_entry(self, game, player, code):
        return self.create("/stat_entries", {
            "game_id": game["id"],
            "player_id": player["id"],
            "stat_type_id": self.stat_types[code]["id"],
        })

    def test_list_includes_all_game_players_in_id_order_and_full_metadata(self):
        first = self.create_entry(self.game, self.player, "FG_MADE_2")
        other = self.create_entry(self.other_game, self.player, "FG_MADE_3")
        second = self.create_entry(self.game, self.other_player, "REBOUND")

        response = self.client.get(f"/games/{self.game['id']}/stat_entries")
        self.assertEqual(response.status_code, 200)
        entries = response.json()
        self.assertEqual([entry["id"] for entry in entries], [first["id"], second["id"]])
        self.assertNotIn(other["id"], [entry["id"] for entry in entries])
        for entry, player, code in ((entries[0], self.player, "FG_MADE_2"),
                                    (entries[1], self.other_player, "REBOUND")):
            stat_type = self.stat_types[code]
            self.assertEqual(entry, {
                "id": entry["id"],
                "game_id": self.game["id"],
                "player_id": player["id"],
                "player_name": player["name"],
                "stat_type_id": stat_type["id"],
                "stat_code": code,
                "stat_label": stat_type["label"],
                "points_value": stat_type["points_value"],
                "created_at": entry["created_at"],
            })
            self.assertTrue(entry["created_at"])

    def test_list_empty_and_missing_game(self):
        response = self.client.get(f"/games/{self.game['id']}/stat_entries")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
        response = self.client.get("/games/999999/stat_entries")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Game not found"})

    def test_delete_removes_only_target_and_updates_stats(self):
        first = self.create_entry(self.game, self.player, "FG_MADE_2")
        target = self.create_entry(self.game, self.player, "FG_MADE_3")
        other_player = self.create_entry(self.game, self.other_player, "REBOUND")
        other_game = self.create_entry(self.other_game, self.player, "FT_MADE")

        response = self.client.delete(f"/stat_entries/{target['id']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"deleted_id": target["id"]})
        response = self.client.get(f"/games/{self.game['id']}/stat_entries")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([entry["id"] for entry in response.json()],
                         [first["id"], other_player["id"]])
        response = self.client.get(f"/games/{self.other_game['id']}/stat_entries")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([entry["id"] for entry in response.json()], [other_game["id"]])
        response = self.client.get(f"/boxscore/{self.game['id']}", params={"player_id": self.player["id"]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["points"], 2)
        self.assertEqual(response.json()["fg3m"], 0)

        response = self.client.delete(f"/stat_entries/{target['id']}")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Stat entry not found"})

    def test_delete_missing_entry_does_not_change_existing_entries(self):
        entry = self.create_entry(self.game, self.player, "ASSIST")
        response = self.client.delete("/stat_entries/999999")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Stat entry not found"})
        response = self.client.get(f"/games/{self.game['id']}/stat_entries")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [entry["id"]])

    def test_invalid_ids_are_rejected(self):
        for method, path in ((self.client.get, "/games/not-an-id/stat_entries"),
                             (self.client.delete, "/stat_entries/not-an-id")):
            with self.subTest(path=path):
                self.assertEqual(method(path).status_code, 422)


if __name__ == "__main__":
    unittest.main()
