from fastapi import FastAPI

from .db import init_db
from .routes import router

app = FastAPI(title="HoopTrack API")
app.include_router(router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}
