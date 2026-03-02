from pydantic import BaseModel
from typing import Optional


class EvacuationRequest(BaseModel):
    city: Optional[str] = None
    source_lat: float
    source_lon: float
    dest_lat: float
    dest_lon: float
    hazard_lat: float
    hazard_lon: float
    time_step: int = 1