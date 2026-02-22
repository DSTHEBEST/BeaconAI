from fastapi import FastAPI
from .api.routes import router

app = FastAPI(title="BeaconAI")

app.include_router(router)

@app.get("/")
def root():
    return {"message": "BeaconAI Evacuation Intelligence API"}