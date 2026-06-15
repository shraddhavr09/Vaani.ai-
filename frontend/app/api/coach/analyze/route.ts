import { NextRequest, NextResponse } from "next/server";

type CoachRequest = {
  language: string;
  level: string;
  goal: string;
  focusAreas: string[];
  duration: number;
};

type PronunciationFinding = {
  word: string;
  heardAs: string;
  correctPronunciation: string;
  phoneticHint: string;
  issue: string;
  practiceLine: string;
};

type CoachAssessment = {
  scores: Record<string, number>;
  transcript: string;
  summary: string;
  strengths: string[];
  areasOfImprovement: string[];
  actionableFeedback: string[];
  drill: string;
  spokenFeedback: string;
  pronunciationFindings: PronunciationFinding[];
  nativityLevel: string;
  nativityExplanation: string;
  source: "gemini" | "local";
  translation?: {
    summary: string;
    strengths: string[];
    areasOfImprovement: string[];
    actionableFeedback: string[];
    drill: string;
    spokenFeedback: string;
    nativityExplanation: string;
  };
};

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

const fallbackScores: Record<string, number> = {
  Tone: 76,
  Clarity: 82,
  Pronunciation: 78,
  Pacing: 74,
  Confidence: 80,
  Fluency: 79,
};

const languageGuidance: Record<string, string> = {
  tamil:
    "Tamil: transcribe in Tamil script when audible, include simple Latin transliteration only inside pronunciation hints, and correct Tamil sounds using Tamil phoneme descriptions rather than English syllable splits.",
  telugu:
    "Telugu: transcribe in Telugu script when audible, include simple Latin transliteration only inside pronunciation hints, and correct Telugu sounds using Telugu phoneme descriptions rather than English syllable splits.",
  kannada:
    "Kannada: transcribe in Kannada script when audible, include simple Latin transliteration only inside pronunciation hints, and correct Kannada sounds using Kannada phoneme descriptions rather than English syllable splits.",
  hindi:
    "Hindi: transcribe in Devanagari when audible, include simple Latin transliteration only inside pronunciation hints, and correct Hindi sounds using Hindi phoneme descriptions.",
  hinglish:
    "Hinglish: preserve the code-mixed Hindi-English wording. Use Devanagari only when the speaker clearly uses Hindi words and keep English words in English.",
  arabic:
    "Arabic: transcribe in modern standard Arabic script when audible, include simple Latin transliteration only inside pronunciation hints, and provide coaching in Arabic script.",
};

function getLanguageGuidance(language: string) {
  return (
    languageGuidance[language.toLowerCase()] ||
    "Use the selected language as the primary transcription and coaching language. Do not force English pronunciation rules onto non-English speech."
  );
}

function toText(value: FormDataEntryValue | null, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseFocusAreas(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return ["Tone", "Clarity", "Confidence"];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length
      ? parsed.filter((item) => typeof item === "string")
      : ["Tone", "Clarity", "Confidence"];
  } catch {
    return ["Tone", "Clarity", "Confidence"];
  }
}

function createLocalAssessment(request: CoachRequest): CoachAssessment {
  const durationBonus = Math.min(Math.floor(request.duration / 4), 10);
  const scores = request.focusAreas.reduce<Record<string, number>>(
    (current, area, index) => ({
      ...current,
      [area]: Math.min(72 + durationBonus + index * 2, 92),
    }),
    { ...fallbackScores }
  );

  return {
    scores,
    transcript:
      "AI transcription is unavailable for this clip. Vaani captured the clip and prepared a coaching plan from your selected setup and recording length.",
    summary: `Your ${request.language} session is ready for ${request.goal.toLowerCase()}. The coach focused on ${request.focusAreas.join(", ").toLowerCase()}.`,
    strengths: [
      "You completed a full spoken take, which gives the coach a useful baseline.",
      `Your setup is focused on ${request.focusAreas[0]?.toLowerCase() || "clarity"}, so feedback can stay specific.`,
    ],
    areasOfImprovement: [
      "Pause for one beat after your opening sentence so the answer feels more controlled.",
      "Keep the final words of each sentence crisp; endings carry confidence.",
      `For the next take, improve one area first: ${request.focusAreas[0] || "Clarity"}.`,
    ],
    actionableFeedback: [
      "Record one shorter version under 30 seconds.",
      "Repeat the answer once with slower pacing.",
      "Compare the second take against this baseline.",
    ],
    drill:
      request.focusAreas.includes("Tone")
        ? "Repeat the same answer with a warmer first line and a calmer final sentence."
        : "Record the same answer again using one idea, one example, and one closing line.",
    spokenFeedback:
      "I could not hear enough exact pronunciation detail to name specific words. Record again with the microphone close, then I will call out each word gently and show a natural way to say it.",
    pronunciationFindings: [],
    nativityLevel: request.level === "Beginner" ? "A2" : request.level === "Advanced" ? "C1" : "B2",
    nativityExplanation: `Based on your selected ${request.level.toLowerCase()} profile, you demonstrate ${request.level === "Advanced" ? "high" : "moderate"} fluency with some areas for refinement in ${request.language}.`,
    source: "local",
  };
}

function clampScore(value: unknown, fallback: number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function getGeminiMimeType(mimeType: string) {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();

  if (normalized === "audio/webm") {
    return "video/webm";
  }

  if (normalized === "audio/mpeg") {
    return "audio/mp3";
  }

  return normalized || "video/webm";
}

function sanitizeGeminiError(error: string) {
  if (error.includes("API key not valid")) {
    return "Gemini rejected the API key. Add a valid GEMINI_API_KEY and restart the dev server.";
  }

  if (error.includes("PERMISSION_DENIED") || error.includes("403")) {
    return "Gemini API access is denied for this key. Enable the Gemini API in Google Cloud or use an AI Studio Gemini key.";
  }

  if (error.includes("INVALID_ARGUMENT") || error.includes("400")) {
    return "Gemini rejected the audio request. The format might be unsupported or the audio is too short.";
  }

  if (error.includes("429") || error.includes("RESOURCE_EXHAUSTED")) {
    return "Gemini rate limit was reached. Try again shortly.";
  }

  if (error.includes("not found") || error.includes("404")) {
    return "The Gemini model was not found. Check your GEMINI_MODEL setting or use a standard model like gemini-2.5-flash.";
  }

  if (error.includes("AI response did not include JSON")) {
    return "Gemini returned a non-JSON response. This can happen with very short audio or safety filter triggers.";
  }

  return `Gemini analysis error: ${error.length > 100 ? error.substring(0, 100) + "..." : error}`;
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not include JSON.");
  }

  return JSON.parse(candidate.slice(start, end + 1)) as Partial<CoachAssessment>;
}

function normalizeAssessment(
  assessment: Partial<CoachAssessment>,
  request: CoachRequest
): CoachAssessment {
  const local = createLocalAssessment(request);
  const pronunciationFindings = Array.isArray(assessment.pronunciationFindings)
    ? assessment.pronunciationFindings
        .map((finding) => ({
          word: String(finding?.word || "").trim(),
          heardAs: String(finding?.heardAs || "").trim(),
          correctPronunciation: String(finding?.correctPronunciation || "").trim(),
          phoneticHint: String(finding?.phoneticHint || "").trim(),
          issue: String(finding?.issue || "").trim(),
          practiceLine: String(finding?.practiceLine || "").trim(),
        }))
        .filter((finding) => finding.word && finding.correctPronunciation)
    : local.pronunciationFindings;

  return {
    scores: Object.fromEntries(
      Object.entries({ ...local.scores, ...(assessment.scores || {}) }).map(
        ([key, value]) => [key, clampScore(value, local.scores[key] || 70)]
      )
    ),
    transcript: assessment.transcript || local.transcript,
    summary: assessment.summary || local.summary,
    strengths: assessment.strengths?.length ? assessment.strengths : local.strengths,
    areasOfImprovement: assessment.areasOfImprovement?.length ? assessment.areasOfImprovement : local.areasOfImprovement,
    actionableFeedback: assessment.actionableFeedback?.length
      ? assessment.actionableFeedback
      : local.actionableFeedback,
    drill: assessment.drill || local.drill,
    spokenFeedback: assessment.spokenFeedback || local.spokenFeedback,
    pronunciationFindings,
    nativityLevel: assessment.nativityLevel || local.nativityLevel,
    nativityExplanation: assessment.nativityExplanation || local.nativityExplanation,
    translation: assessment.translation ? {
      summary: String(assessment.translation.summary || "").trim(),
      strengths: Array.isArray(assessment.translation.strengths) ? assessment.translation.strengths.map(s => String(s)) : [],
      areasOfImprovement: Array.isArray(assessment.translation.areasOfImprovement) ? assessment.translation.areasOfImprovement.map(s => String(s)) : [],
      actionableFeedback: Array.isArray(assessment.translation.actionableFeedback) ? assessment.translation.actionableFeedback.map(s => String(s)) : [],
      drill: String(assessment.translation.drill || "").trim(),
      spokenFeedback: String(assessment.translation.spokenFeedback || "").trim(),
      nativityExplanation: String(assessment.translation.nativityExplanation || "").trim(),
    } : undefined,
    source: "gemini",
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  parts: GeminiPart[],
  temperature = 0.2
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error(`Model ${model} returned no text.`);
  }

  return text;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audio = formData.get("audio");
  const duration = Number(toText(formData.get("duration"), "0"));
  const coachRequest: CoachRequest = {
    language: toText(formData.get("language"), "English"),
    level: toText(formData.get("level"), "Intermediate"),
    goal: toText(formData.get("goal"), "Interview confidence"),
    focusAreas: parseFocusAreas(formData.get("focusAreas")),
    duration: Number.isFinite(duration) ? duration : 0,
  };

  if (!(audio instanceof File)) {
    return NextResponse.json(
      { error: "Audio file is required." },
      { status: 400 }
    );
  }

  const backendUrl = process.env.VAANI_BACKEND_URL?.replace(/\/$/, "");

  if (backendUrl) {
    try {
      const response = await fetch(`${backendUrl}/coach/analyze`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Fall through to the built-in Gemini/local analyzer.
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ...createLocalAssessment(coachRequest),
      error:
        "GEMINI_API_KEY is not loaded. Add it to frontend/.env.local and restart the Next dev server.",
    });
  }

  const audioBuffer = Buffer.from(await audio.arrayBuffer());
  const audioBase64 = audioBuffer.toString("base64");
  const mimeType = getGeminiMimeType(audio.type || "audio/webm");
  const models = Array.from(
    new Set([
      process.env.GEMINI_MODEL || "gemini-2.5-flash",
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ])
  );

  const analysisPrompt = `You are Vaani AI, a supportive speech and communication coach.

Analyze this user audio and return only valid JSON with this exact shape:
{
  "scores": { "Tone": number, "Clarity": number, "Pronunciation": number, "Pacing": number, "Confidence": number, "Fluency": number, "Articulation": number, "Filler words": number, "Pauses": number, "Intonation": number, "Expression": number, "Vocabulary": number },
  "transcript": string,
  "summary": string,
  "strengths": string[],
  "areasOfImprovement": string[],
  "actionableFeedback": string[],
  "drill": string,
  "spokenFeedback": string,
  "pronunciationFindings": [
    {
      "word": string,
      "heardAs": string,
      "correctPronunciation": string,
      "phoneticHint": string,
      "issue": string,
      "practiceLine": string
    }
  ],
  "nativityLevel": string,
  "nativityExplanation": string,
  "translation": {
    "summary": string,
    "strengths": string[],
    "areasOfImprovement": string[],
    "actionableFeedback": string[],
    "drill": string,
    "spokenFeedback": string,
    "nativityExplanation": string
  }
}

Context:
- Language: ${coachRequest.language}
- Language-specific instruction: ${getLanguageGuidance(coachRequest.language)}
- Proficiency: ${coachRequest.level}
- Goal: ${coachRequest.goal}
- Selected work areas: ${coachRequest.focusAreas.join(", ")}
- Approx duration: ${coachRequest.duration} seconds

Scoring rules:
- Scores must be integers from 0 to 100.
- Scores must reflect the actual audio. Do not give high scores for silence, very short clips, or unclear audio.
- Make feedback specific, kind, and actionable. Never use vague phrasing like "work on pronunciation" without naming the exact word or sound.
- Prioritize the selected work areas.
- If transcription is uncertain, use [unclear] and say why instead of inventing exact words.
- Mention filler words, pauses, pacing, and pronunciation only when the audio supports it.

Nativity/Proficiency Level rules:
- In "nativityLevel", guess the speaker's current level in the target language using the CEFR scale (A1, A2, B1, B2, C1, or C2).
- C2 represents native or near-native mastery; A1 represents total beginner.
- In "nativityExplanation", provide a 1-2 sentence explanation of why you assigned this level based on their vocabulary, grammar, and pronunciation in the audio.

Translation rules:
- If the language is NOT English, you MUST provide an English translation of the summary, strengths, areasOfImprovement, actionableFeedback, drill, spokenFeedback, and nativityExplanation in the "translation" object.
- If the language IS English, return the "translation" object as null or omit it.

Pronunciation rules:
- In pronunciationFindings, include only words you can identify from the audio/transcript.
- For every faltered or mispronounced word, give the exact word, what it sounded like if detectable, the natural correct pronunciation, a simple phonetic hint, the specific issue, and one short practice line.
- Do not split words into exaggerated syllables unless the split is unquestionably correct for that language. Prefer a natural full-word pronunciation, native script where relevant, and a short mouth-position cue.
- For Tamil, Telugu, Kannada, Hindi, and other Indic languages, use native-script words plus simple romanization in phoneticHint. Do not approximate them with English-only syllables.
- If no exact word-level pronunciation issue is supported by the audio, return an empty pronunciationFindings array and say that exact word-level issues were not audible.
- spokenFeedback must sound like a warm human coach talking directly to the learner. Use short conversational sentences, name the exact words from pronunciationFindings, and tell the learner how to say them naturally. Avoid being robotic; sound like a supportive mentor.`;

  let lastError = "";

  for (const model of models) {
    try {
      const audioPart = {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      };

      const text = await callGemini(
        apiKey,
        model,
        [{ text: analysisPrompt }, audioPart],
        0.15
      );

      try {
        const assessment = normalizeAssessment(extractJson(text), coachRequest);

        return NextResponse.json({
          ...assessment,
          model,
        });
      } catch {
        lastError = `Model ${model} returned invalid JSON.`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini fetch failed.";

      // Fatal errors: don't bother retrying with other models
      if (
        lastError.includes("API key not valid") ||
        lastError.includes("PERMISSION_DENIED") ||
        lastError.includes("403")
      ) {
        break;
      }

      // For other errors (404, 429, 500s, etc.), try the next model
      continue;
    }
  }

  return NextResponse.json(
    {
      ...createLocalAssessment(coachRequest),
      source: "local",
      error:
        lastError.includes("high demand") || lastError.includes("UNAVAILABLE")
          ? "Gemini is busy right now, so Vaani used a local coaching report. Try again in a moment."
          : sanitizeGeminiError(lastError),
    },
    { status: 200 }
  );
}
