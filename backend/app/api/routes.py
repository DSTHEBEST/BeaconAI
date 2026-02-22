from fastapi import APIRouter
from backend.app.services.evacuation_service import compute_evacuation
from backend.app.api.schemas import EvacuationRequest

router = APIRouter()

@router.post("/evacuate")
def evacuate(payload: EvacuationRequest):
    result = compute_evacuation(payload.dict())
    return result
