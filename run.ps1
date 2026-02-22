# Activate venv and run the FastAPI app (use this so osmnx and other deps are found)
& "$PSScriptRoot\venv\Scripts\Activate.ps1"
Set-Location $PSScriptRoot
uvicorn backend.app.main:app --reload
