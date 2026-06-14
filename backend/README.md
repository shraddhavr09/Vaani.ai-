# Vaani AI Backend

FastAPI backend for auth, Google sign-in verification, speech analysis, and local development storage.

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Environment

- `GEMINI_API_KEY` or `GOOGLE_API_KEY`: enables Gemini audio transcription and analysis.
- `GEMINI_MODEL`: optional Gemini model override.
- `GOOGLE_CLIENT_ID`: verifies Google ID tokens on `/auth/google`.
- `VAANI_DATA_DIR`: optional data directory. Defaults to `backend/data`.
- `CORS_ORIGINS`: frontend origins allowed to call this backend. Defaults to `http://localhost:3001`.

The frontend still works without this backend because it has a Next API fallback, but this service is ready for a separate deployment.
