from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routers import auth as auth_router

app = FastAPI(title="Data Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
