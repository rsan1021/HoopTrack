# Contributing

1. Read the README and developer documents in `docs/`; use a separate copy of the database for development where possible.
2. Create a branch for each change and describe the problem and solution in the pull request.
3. Run the relevant checks described in the README, and describe any manual testing and limitations.
4. Update documentation and `CHANGELOG.md` when behavior, setup, or operations change.
5. Never commit credentials, `.env` files, database journals, or generated dependencies. The supplied `data/hoops.db` is intentionally tracked; review any changes to it before committing and avoid committing incidental runtime changes.
6. Back up the database and test migrations on a copy before deploying database changes.

Run each block separately from the repository root for the frontend queue tests and backend API regression tests (use a Python virtual environment for backend dependencies):

```sh
cd frontend && npm test
```

```sh
cd backend
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

Backend tests use temporary databases. Add tests when changing behavior and document manual browser/end-to-end coverage, including undo and offline sync limitations where relevant.
