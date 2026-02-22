from pydantic import BaseModel

class EvacuationRequest(BaseModel):
    city: str
    source_lat: float
    source_lon: float
    dest_lat: float
    dest_lon: float
    hazard_lat: float
    hazard_lon: float
    time_step: int