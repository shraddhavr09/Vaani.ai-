from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token
except Exception:  # pragma: no cover - optional at runtime
    google_requests = None
    id_token = None


DATA_DIR = Path(os.getenv("VAANI_DATA_DIR", Path(__file__).resolve().parents[1] / "data"))
USERS_FILE = DATA_DIR / "users.json"

DEFAULT_FOCUS = ["Tone", "Clarity", "Confidence"]
DEFAULT_SCORES = {
    "Tone": 76,
    "Clarity": 82,
    "Pronunciation": 78,
    "Pacing": 74,
    "Confidence": 80,
    "Fluency": 79,
}

LANGUAGE_GUIDANCE = {
    "tamil": (
        "Tamil: transcribe in Tamil script when audible, include simple Latin "
        "transliteration only inside pronunciation hints, and correct Tamil "
        "sounds using Tamil phoneme descriptions rather than English syllable splits."
    ),
    "telugu": (
        "Telugu: transcribe in Telugu script when audible, include simple Latin "
        "transliteration only inside pronunciation hints, and correct Telugu "
        "sounds using Telugu phoneme descriptions rather than English syllable splits."
    ),
    "kannada": (
        "Kannada: transcribe in Kannada script when audible, include simple Latin "
        "transliteration only inside pronunciation hints, and correct Kannada "
        "sounds using Kannada phoneme descriptions rather than English syllable splits."
    ),
    "hindi": (
        "Hindi: transcribe in Devanagari when audible, include simple Latin "
        "transliteration only inside pronunciation hints, and correct Hindi sounds "
        "using Hindi phoneme descriptions."
    ),
    "hinglish": (
        "Hinglish: preserve the code-mixed Hindi-English wording. Use Devanagari "
        "only when the speaker clearly uses Hindi words and keep English words in English."
    ),
}

app = FastAPI(title="Vaani AI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuthRequest(BaseModel):
    name: str | None = None
    email: str
    password: str | None = Field(default=None, min_length=4)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        cleaned = value.strip().lower()

        if "@" not in cleaned or "." not in cleaned.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")

        return cleaned


class GoogleAuthRequest(BaseModel):
    credential: str


class UserProfile(BaseModel):
    name: str
    email: str
    provider: str = "email"


class AuthResponse(BaseModel):
    token: str
    profile: UserProfile


class PronunciationFinding(BaseModel):
    word: str
    heardAs: str = ""
    correctPronunciation: str
    phoneticHint: str = ""
    issue: str = ""
    practiceLine: str = ""


class AnalyzeResponse(BaseModel):
    scores: dict[str, int]
    transcript: str
    summary: str
    strengths: list[str]
    feedback: list[str]
    nextActions: list[str]
    drill: str
    spokenFeedback: str = ""
    pronunciationFindings: list[PronunciationFinding] = Field(default_factory=list)
    source: str
    model: str | None = None
    error: str | None = None


def read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


def write_json(path: Path, payload: Any) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return f"{salt}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split(":", 1)
    except ValueError:
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return secrets.compare_digest(candidate.hex(), digest)


def make_token(email: str) -> str:
    payload = f"{email}:{datetime.now(timezone.utc).isoformat()}:{secrets.token_hex(16)}"
    return base64.urlsafe_b64encode(payload.encode()).decode()


def clamp_score(value: Any, fallback: int) -> int:
    try:
        number = round(float(value))
    except (TypeError, ValueError):
        return fallback

    return max(0, min(100, number))


def get_language_guidance(language: str) -> str:
    return LANGUAGE_GUIDANCE.get(
        language.lower(),
        (
            "Use the selected language as the primary transcription and coaching "
            "language. Do not force English pronunciation rules onto non-English speech."
        ),
    )


def parse_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")

    if start == -1 or end <= start:
        raise ValueError("AI response did not include JSON.")

    return json.loads(cleaned[start : end + 1])


def local_assessment(
    *,
    language: str,
    level: str,
    goal: str,
    focus_areas: list[str],
    duration: int,
) -> AnalyzeResponse:
    base = 62 if level == "Beginner" else 78 if level == "Advanced" else 70
    duration_bonus = min(duration // 4, 10)
    scores = DEFAULT_SCORES.copy()

    for index, area in enumerate(focus_areas or DEFAULT_FOCUS):
        scores[area] = min(base + duration_bonus + index * 2, 92)

    primary = (focus_areas or DEFAULT_FOCUS)[0]

    return AnalyzeResponse(
        scores=scores,
        transcript=(
            "AI transcription is unavailable for this clip. Vaani captured the "
            "recording and prepared a coaching plan from setup and duration."
        ),
        summary=(
            f"Your {language} session is ready for {goal.lower()}. "
            f"The coach focused on {', '.join(focus_areas or DEFAULT_FOCUS).lower()}."
        ),
        strengths=[
            "You completed a usable spoken take for baseline coaching.",
            f"Your setup gives Vaani a clear first priority: {primary.lower()}.",
        ],
        feedback=[
            "Pause for one beat after your opening sentence so the answer feels more controlled.",
            "Keep the final words of each sentence crisp; endings carry confidence.",
            f"For the next take, improve one area first: {primary}.",
        ],
        nextActions=[
            "Record one shorter version under 30 seconds.",
            "Repeat the answer once with slower pacing.",
            "Compare the second take against this baseline.",
        ],
        drill=(
            "Repeat the same answer with a warmer first line and a calmer final sentence."
            if "Tone" in focus_areas
            else "Record again using one idea, one example, and one closing line."
        ),
        spokenFeedback=(
            "I could not hear enough exact pronunciation detail to name a specific "
            "faltered word. Record again with the microphone close, and I will call "
            "out the exact word and correction."
        ),
        pronunciationFindings=[],
        source="local",
    )


async def gemini_generate(api_key: str, model: str, parts: list[dict[str, Any]], temperature: float) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": api_key},
            json={
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": temperature,
                },
            },
        )
        response.raise_for_status()
        data = response.json()

    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")

    if not isinstance(text, str):
        raise ValueError("Gemini returned no text.")

    return text


def normalize_ai(payload: dict[str, Any], fallback: AnalyzeResponse) -> AnalyzeResponse:
    raw_scores = payload.get("scores") if isinstance(payload.get("scores"), dict) else {}
    scores = {
        key: clamp_score(value, fallback.scores.get(key, 70))
        for key, value in {**fallback.scores, **raw_scores}.items()
    }
    raw_findings = payload.get("pronunciationFindings")
    pronunciation_findings = fallback.pronunciationFindings

    if isinstance(raw_findings, list):
        pronunciation_findings = []
        for finding in raw_findings:
            if not isinstance(finding, dict):
                continue
            word = str(finding.get("word") or "").strip()
            correct = str(finding.get("correctPronunciation") or "").strip()
            if not word or not correct:
                continue
            pronunciation_findings.append(
                PronunciationFinding(
                    word=word,
                    heardAs=str(finding.get("heardAs") or "").strip(),
                    correctPronunciation=correct,
                    phoneticHint=str(finding.get("phoneticHint") or "").strip(),
                    issue=str(finding.get("issue") or "").strip(),
                    practiceLine=str(finding.get("practiceLine") or "").strip(),
                )
            )

    return AnalyzeResponse(
        scores=scores,
        transcript=str(payload.get("transcript") or fallback.transcript),
        summary=str(payload.get("summary") or fallback.summary),
        strengths=payload.get("strengths") if isinstance(payload.get("strengths"), list) else fallback.strengths,
        feedback=payload.get("feedback") if isinstance(payload.get("feedback"), list) else fallback.feedback,
        nextActions=payload.get("nextActions") if isinstance(payload.get("nextActions"), list) else fallback.nextActions,
        drill=str(payload.get("drill") or fallback.drill),
        spokenFeedback=str(payload.get("spokenFeedback") or fallback.spokenFeedback),
        pronunciationFindings=pronunciation_findings,
        source="gemini",
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "vaani-backend"}


@app.post("/auth/signup", response_model=AuthResponse)
def signup(payload: AuthRequest) -> AuthResponse:
    if not payload.name or not payload.password:
        raise HTTPException(status_code=400, detail="Name and password are required.")

    users = read_json(USERS_FILE, {})
    email = payload.email.lower()

    if email in users:
        raise HTTPException(status_code=409, detail="Account already exists.")

    users[email] = {
        "name": payload.name,
        "email": email,
        "password": hash_password(payload.password),
        "provider": "email",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    write_json(USERS_FILE, users)

    return AuthResponse(
        token=make_token(email),
        profile=UserProfile(name=payload.name, email=email, provider="email"),
    )


@app.post("/auth/signin", response_model=AuthResponse)
def signin(payload: AuthRequest) -> AuthResponse:
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required.")

    users = read_json(USERS_FILE, {})
    email = payload.email.lower()
    user = users.get(email)

    if not user or not verify_password(payload.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return AuthResponse(
        token=make_token(email),
        profile=UserProfile(name=user["name"], email=email, provider=user.get("provider", "email")),
    )


@app.post("/auth/google", response_model=AuthResponse)
def google_signin(payload: GoogleAuthRequest) -> AuthResponse:
    client_id = os.getenv("GOOGLE_CLIENT_ID")

    if not client_id or not id_token or not google_requests:
        raise HTTPException(status_code=503, detail="Google verification is not configured.")

    try:
        info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Google credential.") from exc

    email = str(info.get("email", "")).lower()

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email.")

    name = str(info.get("name") or email.split("@")[0])
    users = read_json(USERS_FILE, {})
    users[email] = {
        "name": name,
        "email": email,
        "provider": "google",
        "createdAt": users.get(email, {}).get("createdAt", datetime.now(timezone.utc).isoformat()),
    }
    write_json(USERS_FILE, users)

    return AuthResponse(
        token=make_token(email),
        profile=UserProfile(name=name, email=email, provider="google"),
    )


@app.post("/coach/analyze", response_model=AnalyzeResponse)
async def analyze(
    audio: UploadFile = File(...),
    language: str = Form("English"),
    level: str = Form("Intermediate"),
    goal: str = Form("Interview confidence"),
    focusAreas: str = Form("[]"),
    duration: int = Form(0),
) -> AnalyzeResponse:
    try:
        focus_areas = json.loads(focusAreas)
    except json.JSONDecodeError:
        focus_areas = DEFAULT_FOCUS

    if not isinstance(focus_areas, list) or not focus_areas:
        focus_areas = DEFAULT_FOCUS

    focus_areas = [str(area) for area in focus_areas if str(area).strip()] or DEFAULT_FOCUS
    fallback = local_assessment(
        language=language,
        level=level,
        goal=goal,
        focus_areas=focus_areas,
        duration=duration,
    )
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        return fallback

    audio_bytes = await audio.read()
    audio_part = {
        "inlineData": {
            "mimeType": audio.content_type or "audio/webm",
            "data": base64.b64encode(audio_bytes).decode(),
        }
    }
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    prompt = f"""You are Vaani AI, a precise speech coach.

Return only valid JSON:
{{
  "scores": {{ "Tone": number, "Clarity": number, "Pronunciation": number, "Pacing": number, "Confidence": number, "Fluency": number, "Articulation": number, "Filler words": number, "Pauses": number, "Intonation": number, "Expression": number, "Vocabulary": number }},
  "transcript": string,
  "summary": string,
  "strengths": string[],
  "feedback": string[],
  "nextActions": string[],
  "drill": string,
  "spokenFeedback": string,
  "pronunciationFindings": [
    {{
      "word": string,
      "heardAs": string,
      "correctPronunciation": string,
      "phoneticHint": string,
      "issue": string,
      "practiceLine": string
    }}
  ]
}}

Context:
- Language: {language}
- Language-specific instruction: {get_language_guidance(language)}
- Level: {level}
- Goal: {goal}
- Focus areas: {", ".join(focus_areas)}
- Duration: {duration} seconds

Rules:
- Transcribe only what is audible. Use [unclear] instead of guessing.
- For Tamil, Telugu, Kannada, Hindi, and other non-English languages, keep the transcript in the correct native script when the speech is identifiable.
- If the speaker mixes languages, preserve the mixed-language wording instead of translating it all to English.
- Scores must be integers from 0 to 100 and must reflect the actual recording.
- Be supportive, specific, and concise.
- Never give vague pronunciation feedback. Name the exact faltered word when the audio supports it.
- pronunciationFindings must include only words you can identify from the audio/transcript.
- For every faltered or mispronounced word, give the exact word, what it sounded like if detectable, the natural correct pronunciation, a simple phonetic hint, the specific issue, and one short practice line.
- Do not split words into exaggerated syllables unless the split is unquestionably correct for that language. Prefer a natural full-word pronunciation, native script where relevant, and a short mouth-position cue.
- For Tamil, Telugu, Kannada, Hindi, and other Indic languages, use native-script words plus simple romanization in phoneticHint. Do not approximate them with English-only syllables.
- If no exact word-level pronunciation issue is audible, return an empty pronunciationFindings array and say that in spokenFeedback.
- spokenFeedback must sound like a warm human coach talking directly to the learner and must name the exact words from pronunciationFindings."""

    try:
        text = await gemini_generate(api_key, model, [{"text": prompt}, audio_part], 0.15)
        result = normalize_ai(parse_json_object(text), fallback)
        result.model = model
        return result
    except Exception as exc:
        fallback.error = f"Gemini analysis failed, so Vaani used local coaching. {exc}"
        return fallback
