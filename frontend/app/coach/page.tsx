"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

type Profile = {
  name: string;
  email: string;
};

type Onboarding = {
  language: string;
  level: string;
  goal: string;
  focusAreas?: string[];
};

type Assessment = {
  scores: Record<string, number>;
  transcript: string;
  summary: string;
  strengths: string[];
  areasOfImprovement: string[];
  actionableFeedback: string[];
  drill: string;
  spokenFeedback?: string;
  pronunciationFindings?: {
    word: string;
    heardAs: string;
    correctPronunciation: string;
    phoneticHint: string;
    issue: string;
    practiceLine: string;
  }[];
  translation?: {
    summary: string;
    strengths: string[];
    areasOfImprovement: string[];
    actionableFeedback: string[];
    drill: string;
    spokenFeedback: string;
    nativityExplanation: string;
  };
  nativityLevel?: string;
  nativityExplanation?: string;
  source: "gemini" | "local";
  error?: string;
  model?: string;
};

type StoredSession = {
  id: string;
  name: string;
  date: string;
  mode: string;
  score: number;
  focus: string;
  source: "gemini" | "local";
  createdAt: string;
};

const fallbackProfile: Profile = {
  name: "Vaani learner",
  email: "",
};

const fallbackOnboarding: Onboarding = {
  language: "English",
  level: "Intermediate",
  goal: "Interview confidence",
  focusAreas: ["Tone", "Clarity", "Confidence"],
};

const languageVoiceCodes: Record<string, string> = {
  english: "en-IN",
  hindi: "hi-IN",
  hinglish: "hi-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  kannada: "kn-IN",
  marathi: "mr-IN",
  bengali: "bn-IN",
  gujarati: "gu-IN",
  malayalam: "ml-IN",
  punjabi: "pa-IN",
  urdu: "ur-PK",
  odia: "or-IN",
  assamese: "as-IN",
  sanskrit: "sa-IN",
  konkani: "kok-IN",
  sindhi: "sd-IN",
  nepali: "ne-NP",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  japanese: "ja-JP",
  korean: "ko-KR",
  chinese: "zh-CN",
  mandarin: "zh-CN",
  arabic: "ar-SA",
  portuguese: "pt-BR",
  italian: "it-IT",
  russian: "ru-RU",
  turkish: "tr-TR",
  dutch: "nl-NL",
  polish: "pl-PL",
  indonesian: "id-ID",
  thai: "th-TH",
  vietnamese: "vi-VN",
  greek: "el-GR",
  hebrew: "he-IL",
  swedish: "sv-SE",
  danish: "da-DK",
  finnish: "fi-FI",
  norwegian: "no-NO",
  czech: "cs-CZ",
  hungarian: "hu-HU",
  romanian: "ro-RO",
  slovak: "sk-SK",
  ukrainian: "uk-UA",
};

const googleCloudVoices: Record<string, string> = {
  "en-IN": "en-IN-Neural2-B",
  "hi-IN": "hi-IN-Neural2-A",
  "ta-IN": "ta-IN-Neural2-A",
  "te-IN": "te-IN-Neural2-A",
  "kn-IN": "kn-IN-Wavenet-A",
  "mr-IN": "mr-IN-Wavenet-A",
  "bn-IN": "bn-IN-Wavenet-A",
  "gu-IN": "gu-IN-Wavenet-A",
  "ml-IN": "ml-IN-Wavenet-A",
  "pa-IN": "pa-IN-Wavenet-A",
  "ur-PK": "ur-PK-Wavenet-A",
  "ur-IN": "ur-PK-Wavenet-A",
  "es-ES": "es-ES-Neural2-A",
  "fr-FR": "fr-FR-Neural2-A",
  "de-DE": "de-DE-Neural2-A",
  "ja-JP": "ja-JP-Neural2-C",
  "ko-KR": "ko-KR-Neural2-A",
  "zh-CN": "zh-CN-Neural2-A",
  "ar-SA": "ar-XA-Neural2-A",
  "ar-XA": "ar-XA-Neural2-A",
  "pt-BR": "pt-BR-Wavenet-A",
  "it-IT": "it-IT-Neural2-C",
  "ru-RU": "ru-RU-Wavenet-A",
};


let lastProfileRaw: string | null = null;
let lastProfileSnapshot: Profile = fallbackProfile;
let lastOnboardingRaw: string | null = null;
let lastOnboardingSnapshot: Onboarding = fallbackOnboarding;

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.localStorage.getItem(key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getProfileSnapshot() {
  const raw = window.localStorage.getItem("vaani-profile");

  if (raw === lastProfileRaw) {
    return lastProfileSnapshot;
  }

  lastProfileRaw = raw;
  lastProfileSnapshot = readStored("vaani-profile", fallbackProfile);

  return lastProfileSnapshot;
}

function getOnboardingSnapshot() {
  const raw = window.localStorage.getItem("vaani-onboarding");

  if (raw === lastOnboardingRaw) {
    return lastOnboardingSnapshot;
  }

  lastOnboardingRaw = raw;
  lastOnboardingSnapshot = readStored("vaani-onboarding", fallbackOnboarding);

  return lastOnboardingSnapshot;
}

function getFocusAreas(onboarding: Onboarding) {
  return onboarding.focusAreas?.length
    ? onboarding.focusAreas
    : fallbackOnboarding.focusAreas || [];
}

function formatFocusAreas(onboarding: Onboarding) {
  return getFocusAreas(onboarding).join(", ");
}

function getSpeechLanguage(language: string) {
  const normalized = language.trim().toLowerCase();
  
  // Specific overrides for robustness (Standard Locales for Browser Fallback)
  if (normalized.includes("arab")) return "ar-SA";
  if (normalized.includes("hind")) return "hi-IN";
  if (normalized.includes("tami")) return "ta-IN";
  if (normalized.includes("telu")) return "te-IN";
  if (normalized.includes("kann")) return "kn-IN";
  if (normalized.includes("mara")) return "mr-IN";
  if (normalized.includes("beng")) return "bn-IN";
  if (normalized.includes("guja")) return "gu-IN";
  if (normalized.includes("mala")) return "ml-IN";
  if (normalized.includes("punj")) return "pa-IN";
  if (normalized.includes("urdu")) return "ur-PK";

  const keys = Object.keys(languageVoiceCodes).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (normalized === key || normalized.includes(key) || key.includes(normalized)) {
      return languageVoiceCodes[key];
    }
  }
  return "en-IN";
}

function isLikelyNaturalVoice(voice: SpeechSynthesisVoice) {
  return /natural|neural|online|google|microsoft|zira|heera|kalpana|ravi|lekha|sangeeta|ananya|madhur|neel|vishwa|shruthi|arvind|vani|kavya|nishi|vijay|vidya|hemant|pallavi|swara|valluvar|kanya/i.test(
    voice.name
  );
}

function findBestVoice(
  voices: SpeechSynthesisVoice[],
  language: string,
  preferredName: string
) {
  if (!voices.length) return null;

  const speechLanguage = getSpeechLanguage(language);
  const langPrefix = speechLanguage.split("-")[0].toLowerCase();

  // 1. Try preferred voice ONLY if it matches the language family
  if (preferredName && !preferredName.startsWith("ai-") && !preferredName.startsWith("google-")) {
    const preferredVoice = voices.find((v) => v.name === preferredName);
    if (
      preferredVoice &&
      preferredVoice.lang.toLowerCase().startsWith(langPrefix)
    ) {
      return preferredVoice;
    }
  }

  // 2. Try Google voice for exact language locale (Highest quality browser voice)
  const googleExact = voices.find(
    (v) => v.lang.toLowerCase() === speechLanguage.toLowerCase() && /google/i.test(v.name)
  );
  if (googleExact) return googleExact;

  // 3. Try natural voice for exact language locale
  const naturalExact = voices.find(
    (v) => v.lang.toLowerCase() === speechLanguage.toLowerCase() && isLikelyNaturalVoice(v)
  );
  if (naturalExact) return naturalExact;

  // 4. Try any voice for exact language locale
  const anyExact = voices.find((v) => v.lang.toLowerCase() === speechLanguage.toLowerCase());
  if (anyExact) return anyExact;

  // 5. Try Google voice for same language family
  const googleFamily = voices.find(
    (v) => v.lang.toLowerCase().startsWith(langPrefix) && /google/i.test(v.name)
  );
  if (googleFamily) return googleFamily;

  // 6. Try natural voice for same language family
  const naturalFamily = voices.find(
    (v) => v.lang.toLowerCase().startsWith(langPrefix) && isLikelyNaturalVoice(v)
  );
  if (naturalFamily) return naturalFamily;

  // 7. Try any voice for same language family
  const anyFamily = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (anyFamily) return anyFamily;

  // 8. Fallback to English Google
  const engGoogle = voices.find(
    (v) => v.lang.toLowerCase().startsWith("en") && /google/i.test(v.name)
  );
  if (engGoogle) return engGoogle;

  // 9. Fallback to English natural
  const engNatural = voices.find(
    (v) => v.lang.toLowerCase().startsWith("en") && isLikelyNaturalVoice(v)
  );
  if (engNatural) return engNatural;

  // 10. Absolute fallback
  return voices[0] || null;
}

function getAverageScore(scores: Record<string, number>) {
  const values = Object.values(scores).filter((value) => Number.isFinite(value));

  if (!values.length) {
    return 0;
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length
  );
}

function encodeWav(buffers: Float32Array[], sampleRate: number) {
  const length = buffers.reduce((total, buffer) => total + buffer.length, 0);
  const wavBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuffer);
  let offset = 0;

  function writeString(value: string) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
    offset += value.length;
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + length * 2, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * 2, true);
  offset += 4;
  view.setUint16(offset, 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, length * 2, true);
  offset += 4;

  for (const buffer of buffers) {
    for (let index = 0; index < buffer.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, buffer[index]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
}

function saveCoachSession(
  assessment: Assessment,
  onboarding: Onboarding,
  clipDuration: number
) {
  if (typeof window === "undefined") {
    return;
  }

  const id = `session-${Date.now()}`;
  const focusAreas = getFocusAreas(onboarding);
  const createdAt = new Date().toISOString();
  const session: StoredSession = {
    id,
    name: `${onboarding.goal} practice`,
    date: new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
    mode: onboarding.goal,
    score: getAverageScore(assessment.scores),
    focus: assessment.drill || `Focus on ${focusAreas[0] || "clarity"}.`,
    source: assessment.source,
    createdAt,
  };

  const raw = window.localStorage.getItem("vaani-sessions");
  let existing: StoredSession[] = [];

  try {
    existing = raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    existing = [];
  }
  const nextSessions = [session, ...existing].slice(0, 20);

  window.localStorage.setItem("vaani-sessions", JSON.stringify(nextSessions));
  window.localStorage.setItem(
    `vaani-session-${id}`,
    JSON.stringify({
      ...assessment,
      duration: clipDuration,
      language: onboarding.language,
      level: onboarding.level,
      goal: onboarding.goal,
      focusAreas,
      createdAt,
    })
  );
  window.dispatchEvent(new Event("vaani-sessions-change"));
}

function createAssessment(duration: number, onboarding: Onboarding): Assessment {
  const base =
    onboarding.level === "Beginner"
      ? 62
      : onboarding.level === "Advanced"
        ? 78
        : 70;
  const durationBonus = Math.min(Math.floor(duration / 3), 12);
  const focusAreas = getFocusAreas(onboarding);
  const primaryFocus = focusAreas[0]?.toLowerCase() || "clarity";

  return {
    scores: {
      Clarity: Math.min(base + durationBonus + 8, 96),
      Confidence: Math.min(base + durationBonus + 3, 94),
      Pacing: Math.min(base + durationBonus - 2, 90),
      Fluency: Math.min(base + durationBonus + 5, 95),
      Tone: Math.min(base + durationBonus + 4, 94),
      Pronunciation: Math.min(base + durationBonus + 2, 92),
    },
    transcript:
      "AI transcription is unavailable for this clip. This local report is based on your selected setup and recording length.",
    summary: `Your ${onboarding.language} baseline is ready for ${onboarding.goal.toLowerCase()}. This pass focused on ${focusAreas.join(", ").toLowerCase()}.`,
    strengths: [
      "You completed a usable spoken take for baseline coaching.",
      "Your setup gives Vaani clear priorities for the next recording.",
    ],
    areasOfImprovement: [
      onboarding.level === "Beginner"
        ? "Use shorter sentences and finish each thought before adding detail."
        : "Your structure is clear; add a stronger opening line before examples.",
      `Your main work area is ${primaryFocus}. Keep one deliberate improvement in mind before the next take.`,
      focusAreas.includes("Filler words")
        ? "Replace filler words with a short pause so the answer sounds more intentional."
        : "Add a one-second pause after the first sentence to make the answer sound more controlled.",
      focusAreas.includes("Pronunciation")
        ? "Slow down on key terms and finish consonant sounds cleanly."
        : "Keep the last three words of each sentence crisp. Endings are where confidence is easiest to hear.",
    ],
    actionableFeedback: [
      "Record a second take with one deliberate improvement.",
      "Keep the next answer under 30 seconds.",
      "Review the score that matches your top work area first.",
    ],
    drill:
      focusAreas.includes("Tone")
        ? "Record the same answer again with a warmer first sentence and a steadier ending."
        : onboarding.goal === "Presentation clarity"
        ? "Record a 30-second intro with one idea, one example, and one closing line."
        : "Record the same answer again, but start with: My strongest example is...",
    spokenFeedback:
      "I could not hear enough exact pronunciation detail to name a specific faltered word. Record again with a clear microphone position, and I will call out the exact word and correction.",
    pronunciationFindings: [],
    nativityLevel: onboarding.level === "Beginner" ? "A2" : onboarding.level === "Advanced" ? "C1" : "B2",
    nativityExplanation: `Based on your selected ${onboarding.level.toLowerCase()} profile, you demonstrate ${onboarding.level === "Advanced" ? "high" : "moderate"} fluency with some areas for refinement in ${onboarding.language}.`,
    source: "local",
  };
}

export default function CoachPage() {
  const profile = useSyncExternalStore(
    subscribeToStorage,
    getProfileSnapshot,
    () => fallbackProfile
  );
  const onboarding = useSyncExternalStore(
    subscribeToStorage,
    getOnboardingSnapshot,
    () => fallbackOnboarding
  );
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [error, setError] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBuffersRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44100);
  const durationRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !window.localStorage.getItem("vaani-onboarding")
    ) {
      window.location.replace("/onboarding");
    }
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = window.setInterval(() => {
      setDuration((current) => {
        const next = current + 1;
        durationRef.current = next;
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioContextRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      const targetLanguage = showEnglish ? "English" : onboarding.language;
      const speechLanguage = getSpeechLanguage(targetLanguage);
      const gVoice = googleCloudVoices[speechLanguage] || `${speechLanguage}-Wavenet-A`;
      const defaultVoice = `google-${gVoice}`;
      
      const savedVoice = window.localStorage.getItem(`vaani-coach-voice-${targetLanguage.toLowerCase()}`) || defaultVoice;
      
      if (savedVoice.startsWith("ai-") || savedVoice.startsWith("google-")) {
        setSelectedVoiceName(savedVoice);
      } else {
        const bestVoice = findBestVoice(voices, targetLanguage, savedVoice);
        setSelectedVoiceName(bestVoice?.name || defaultVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [onboarding.language, showEnglish]);

  const prompt = useMemo(() => {
    return `Speak for 20 seconds in ${onboarding.language}: introduce yourself and explain why ${onboarding.goal.toLowerCase()} matters to you. Vaani will focus on ${formatFocusAreas(onboarding).toLowerCase()}.`;
  }, [onboarding]);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setAssessment(null);
    setAudioUrl("");
    setDuration(0);
    durationRef.current = 0;
    setShowEnglish(false);

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Try to get duration from audio element
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const clipDuration = Math.round(audio.duration) || 10;
      setDuration(clipDuration);
      analyzeRecording(file, clipDuration);
    };
    audio.onerror = () => {
      // If metadata loading fails, use a default duration
      analyzeRecording(file, 10);
    };
  }

  async function startRecording() {
    setError("");
    setAssessment(null);
    setAudioUrl("");
    setDuration(0);
    durationRef.current = 0;
    setShowEnglish(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      
      // Ensure the AudioContext is running (needed for some browsers)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      audioBuffersRef.current = [];
      sampleRateRef.current = audioContext.sampleRate;
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        audioBuffersRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsRecording(true);
    } catch {
      setError("Microphone access was blocked. Allow the mic and try again.");
    }
  }

  async function stopRecording() {
    if (!isRecording) {
      return;
    }

    setIsRecording(false);
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current?.state !== "closed") {
      await audioContextRef.current?.close();
      audioContextRef.current = null;
    }

    const clipDuration = Math.max(1, durationRef.current);
    const blob = encodeWav(audioBuffersRef.current, sampleRateRef.current);

    if (!blob.size || audioBuffersRef.current.length === 0) {
      setError("No audio was captured. Check your microphone and try again.");
      return;
    }

    setDuration(clipDuration);
    setAudioUrl(URL.createObjectURL(blob));
    analyzeRecording(blob, clipDuration);
  }

  async function analyzeRecording(blob: Blob, clipDuration: number) {
    setIsAnalyzing(true);
    setError("");

    const formData = new FormData();
    formData.append("audio", blob, "vaani-recording.wav");
    formData.append("language", onboarding.language);
    formData.append("level", onboarding.level);
    formData.append("goal", onboarding.goal);
    formData.append("focusAreas", JSON.stringify(getFocusAreas(onboarding)));
    formData.append("duration", String(clipDuration));

    try {
      const response = await fetch("/api/coach/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({ error: "Failed to parse server response." }));

      if (!response.ok) {
        throw new Error(result.error || `Analysis failed with status ${response.status}`);
      }

      const assessmentResult = result as Assessment;
      setAssessment(assessmentResult);
      saveCoachSession(assessmentResult, onboarding, clipDuration);

      if (assessmentResult.error) {
        setError(assessmentResult.error);
      }
    } catch (err) {
      const localAssessment = createAssessment(clipDuration, onboarding);
      setAssessment(localAssessment);
      saveCoachSession(localAssessment, onboarding, clipDuration);
      setError(err instanceof Error ? err.message : "AI analysis is unavailable, so Vaani generated a local coaching report.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const scores = assessment
    ? Object.entries(assessment.scores).slice(0, 8)
    : getFocusAreas(onboarding).map((area) => [area, 0] as [string, number]);
  const pronunciationFindings = assessment?.pronunciationFindings || [];

  async function playVoiceFeedback() {
    let message = "";
    const isEnglishUI = showEnglish;

    if (assessment) {
      const data = isEnglishUI && assessment.translation ? assessment.translation : assessment;
      const lang = (isEnglishUI ? "English" : onboarding.language).toLowerCase();
      
      // Language-specific headers for a more natural flow
      const headers: Record<string, { strengths: string; improvement: string; drill: string }> = {
        hindi: { strengths: "आपकी खूबियां हैं:", improvement: "सुधार के क्षेत्र:", drill: "आपका अगला अभ्यास है:" },
        arabic: { strengths: "نقاط قوتك هي:", improvement: "مجالات التحسين:", drill: "تمرينك القادم هو:" },
        tamil: { strengths: "உங்கள் பலங்கள்:", improvement: "மேம்படுத்த வேண்டிய பகுதிகள்:", drill: "உங்கள் அடுத்த பயிற்சி:" },
        telugu: { strengths: "మీ బలాలు:", improvement: "మెరుగుపరచవలసిన అంశాలు:", drill: "మీ తదుపరి డ్రిల్:" },
        kannada: { strengths: "ನಿಮ್ಮ ಸಾಮರ್ಥ್ಯಗಳು:", improvement: "ಸುಧಾರಿಸಬೇಕಾದ ಅಂಶಗಳು:", drill: "ನಿಮ್ಮ ಮುಂದಿನ ಡ್ರಿಲ್:" },
        marathi: { strengths: "तुमची बलस्थाने आहेत:", improvement: "सुधारणेची क्षेत्रे:", drill: "तुमचा पुढचा सराव आहे:" },
        bengali: { strengths: "আপনার শক্তিগুলি হলো:", improvement: "উন্নতির ক্ষেত্রগুলি:", drill: "আপনার পরবর্তী ড্রিল হলো:" },
        gujarati: { strengths: "તમારી શક્તિઓ છે:", improvement: "સુધારણા માટેના ક્ષેત્રો:", drill: "તમારી આગામી કવાયત છે:" },
        malayalam: { strengths: "നിങ്ങളുടെ കരുത്തുകൾ:", improvement: "മെച്ചപ്പെടുത്തേണ്ട മേഖലകൾ:", drill: "നിങ്ങളുടെ അടുത്ത ഡ്രിൽ:" },
        punjabi: { strengths: "ਤੁਹਾਡੀਆਂ ਮਜ਼ਬੂਤ ​​points ਹਨ:", improvement: "ਸੁਧਾਰ ਦੇ ਖੇਤਰ:", drill: "ਤੁਹਾਡਾ ਅਗਲਾ ਅਭਿਆਸ ਹੈ:" },
        spanish: { strengths: "Tus fortalezas son:", improvement: "Áreas a mejorar:", drill: "Tu próximo ejercicio es:" },
        french: { strengths: "Vos points forts sont:", improvement: "Points à améliorer:", drill: "Votre prochain exercice est:" },
        german: { strengths: "Ihre Stärken sind:", improvement: "Verbesserungsbereiche:", drill: "Ihre nächste Übung ist:" },
      };

      const h = headers[lang] || { strengths: "Your strengths are:", improvement: "Areas to improve:", drill: "Your next drill is:" };
      
      // Build a full comprehensive message
      const parts = [
        data.spokenFeedback || data.summary,
        data.strengths.length > 0 ? `${h.strengths} ${data.strengths.join(". ")}` : "",
        data.areasOfImprovement.length > 0 ? `${h.improvement} ${data.areasOfImprovement.join(". ")}` : "",
        data.drill ? `${h.drill} ${data.drill}` : ""
      ];

      message = parts.filter(Boolean).join(". ");
    }

    if (!message && pronunciationFindings.length) {
      message = pronunciationFindings
        .map(
          (finding) =>
            `${finding.word}. Say it like this: ${finding.correctPronunciation}. ${finding.practiceLine}`
        )
        .join(" ");
    }

    if (!message) {
      setError("Voice feedback content is missing.");
      return;
    }

    // Stop any current audio or speech
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const targetLanguage = showEnglish ? "English" : onboarding.language;
    const speechLanguage = getSpeechLanguage(targetLanguage);

    // 1. Try Google Cloud Neural TTS (Selected or Default)
    if (selectedVoiceName.startsWith("google-") || selectedVoiceName === "" || selectedVoiceName === "ai-nova") {
      let voiceToUse = "";
      let cloudLangCode = speechLanguage;

      if (selectedVoiceName.startsWith("google-")) {
        voiceToUse = selectedVoiceName.replace("google-", "");
        // Extract language code from voice name (e.g., ar-XA-Neural2-A -> ar-XA)
        const parts = voiceToUse.split("-");
        if (parts.length >= 2) {
          cloudLangCode = `${parts[0]}-${parts[1]}`;
        }
      } else {
        voiceToUse = googleCloudVoices[speechLanguage] || `${speechLanguage}-Neural2-A`;
        const parts = voiceToUse.split("-");
        if (parts.length >= 2) {
          cloudLangCode = `${parts[0]}-${parts[1]}`;
        }
      }
        
      try {
        const response = await fetch("/api/coach/tts-google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: message,
            languageCode: cloudLangCode,
            voiceName: voiceToUse,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
          };

          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            setError("Playback failed. Try a different voice or check your connection.");
          };

          await audio.play();
          setError(""); 
          return;
        } else {
          const errorData = await response.json();
          if (selectedVoiceName.startsWith("google-")) {
            setError(`Google AI voice failed: ${errorData.error}`);
          }
        }
      } catch (e) {
        console.error("Google TTS error:", e);
      }
    }

    // 2. Try OpenAI TTS (If Google fails or selected)
    if (selectedVoiceName.startsWith("ai-") || selectedVoiceName === "") {
      const aiVoice = selectedVoiceName.startsWith("ai-") ? selectedVoiceName.replace("ai-", "") : "nova";
      try {
        const response = await fetch("/api/coach/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message, voice: aiVoice }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
          };

          await audio.play();
          setError("");
          return;
        } else if (selectedVoiceName.startsWith("ai-")) {
          const errorData = await response.json();
          setError(`OpenAI AI voice failed: ${errorData.error}`);
        }
      } catch (e) {
        console.error("OpenAI TTS error:", e);
      }
    }

    // 3. Fallback to browser SpeechSynthesis (Last resort)
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("Voice feedback is not available in this browser.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    const voice = findBestVoice(
      availableVoices,
      targetLanguage,
      selectedVoiceName
    );

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = speechLanguage;
    }
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    
    utterance.onstart = () => setError("");
    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      // Only show error if it's not a 'canceled' error, which happens when we call .cancel()
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        setError(`Browser voice synthesis failed: ${e.error || 'Unknown error'}`);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="min-h-screen bg-[#040712] px-5 py-8 text-[#f4fbff] sm:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#040712_0%,#071a36_46%,#0b3765_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(114,226,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(114,226,255,0.13)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-[#72e2ff]/50 bg-[#72e2ff]/12 font-black text-[#a9f1ff]">
            V
          </span>
          <span className="text-xl font-semibold">Vaani AI</span>
        </Link>
        <Link
          className="rounded-md border border-white/14 px-3 py-2 text-sm font-bold text-[#d7f4ff]"
          href="/recordings"
        >
          Progress
        </Link>
      </div>

      <section className="mx-auto grid max-w-7xl gap-5 py-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="rounded-lg border border-[#72e2ff]/16 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9f1ff]">
            AI Coach
          </p>
          <h1 className="mt-4 text-4xl font-black leading-none">
            Baseline speaking assessment
          </h1>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-md border border-white/10 bg-[#06162d] p-4">
              <p className="font-bold text-[#d7f4ff]/62">Learner</p>
              <p className="mt-1 text-lg font-black">{profile.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/10 bg-[#06162d] p-4">
                <p className="font-bold text-[#d7f4ff]/62">Language</p>
                <p className="mt-1 font-black">{onboarding.language}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-[#06162d] p-4">
                <p className="font-bold text-[#d7f4ff]/62">Level</p>
                <p className="mt-1 font-black">{onboarding.level}</p>
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-[#06162d] p-4">
              <p className="font-bold text-[#d7f4ff]/62">Work areas</p>
              <p className="mt-1 font-black">{formatFocusAreas(onboarding)}</p>
            </div>
          </div>
          <div className="mt-6 rounded-md border border-[#72e2ff]/30 bg-[#72e2ff]/10 p-4">
            <p className="text-sm font-bold text-[#a9f1ff]">Prompt</p>
            <p className="mt-2 leading-7 text-[#d7f4ff]">{prompt}</p>
          </div>
        </aside>

        <div className="grid gap-5">
          <section className="rounded-lg border border-[#72e2ff]/16 bg-[#06162d]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold text-[#a9f1ff]">
                  Record coaching clip
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {isRecording
                    ? "Listening..."
                    : isAnalyzing
                      ? "Analyzing your voice..."
                      : "Ready when you are"}
                </h2>
              </div>
              <span className="rounded-md border border-white/12 bg-[#040712] px-4 py-3 text-2xl font-black">
                {String(Math.floor(duration / 60)).padStart(2, "0")}:
                {String(duration % 60).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-6 flex h-32 items-end gap-2 rounded-md border border-[#72e2ff]/16 bg-[#020611] px-4 py-5">
              {Array.from({ length: 42 }).map((_, index) => (
                <span
                  className={`flex-1 rounded-sm ${
                    isRecording ? "bg-[#72e2ff]" : "bg-[#d7f4ff]/18"
                  }`}
                  key={index}
                  style={{
                    height: `${
                      isRecording
                        ? 22 + (((index + duration) * 19) % 70)
                        : 18 + ((index * 11) % 32)
                    }%`,
                    opacity: isRecording ? 0.34 + ((index % 6) * 0.1) : 0.32,
                  }}
                />
              ))}
            </div>

            {error ? (
              <p className="mt-4 rounded-md border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 p-3 text-sm font-bold text-[#ffb8b8]">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-md bg-[#72e2ff] px-5 py-4 font-black text-[#04111c] transition hover:bg-[#a9f1ff] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isRecording || isAnalyzing}
                onClick={startRecording}
                type="button"
              >
                Start recording
              </button>
              <button
                className="rounded-md border border-white/14 px-5 py-4 font-black text-white transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isRecording || isAnalyzing}
                onClick={stopRecording}
                type="button"
              >
                Stop and assess
              </button>
              <input
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="rounded-md border border-[#72e2ff]/30 px-5 py-4 font-black text-[#a9f1ff] transition hover:border-[#72e2ff]/60 hover:bg-[#72e2ff]/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isRecording || isAnalyzing}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Upload audio
              </button>
            </div>

            {audioUrl ? (
              <audio className="mt-5 w-full" controls key={audioUrl} preload="metadata" src={audioUrl}>
                <track kind="captions" />
              </audio>
            ) : null}
          </section>

          <section className="rounded-lg border border-[#72e2ff]/16 bg-white/[0.045] p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9f1ff]">
                  Coach assessment
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {assessment
                    ? "AI feedback ready"
                    : isAnalyzing
                      ? "Analyzing clip"
                      : "Awaiting clip"}
                </h2>
              </div>
              <span className="rounded-md bg-[#72e2ff]/10 px-3 py-2 text-sm font-bold text-[#a9f1ff]">
                {assessment?.source === "gemini"
                  ? `Gemini coach${assessment.model ? ` - ${assessment.model}` : ""}`
                  : "Local fallback"}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {scores.map(([label, value]) => (
                <div
                  className="rounded-md border border-white/10 bg-[#06162d] p-4"
                  key={label}
                >
                  <p className="text-sm font-bold text-[#d7f4ff]/62">{label}</p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                </div>
              ))}
            </div>

            {assessment ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-md border border-[#72e2ff]/24 bg-[#72e2ff]/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[#a9f1ff]">
                      {showEnglish ? "Summary (English)" : "Summary"}
                    </p>
                    {assessment.translation && (
                      <button
                        className="text-xs font-bold uppercase tracking-wider text-[#72e2ff] hover:underline"
                        onClick={() => setShowEnglish(!showEnglish)}
                        type="button"
                      >
                        {showEnglish ? "Show Native" : "Switch to English"}
                      </button>
                    )}
                  </div>
                  <p className="mt-2 leading-7 text-[#d7f4ff]">
                    {showEnglish && assessment.translation
                      ? assessment.translation.summary
                      : assessment.summary}
                  </p>
                  <p className="mt-5 text-sm font-bold text-[#72e2ff]">
                    Transcript
                  </p>
                  <p className="mt-2 leading-7 text-[#d7f4ff]">
                    {assessment.transcript}
                  </p>
                  {assessment.spokenFeedback || pronunciationFindings.length ? (
                    <>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-bold text-[#72e2ff]">
                          {showEnglish ? "Voice feedback (English)" : "Voice feedback"}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="flex flex-1 flex-col gap-2">
                            <select
                              className="w-full rounded-md border border-[#72e2ff]/30 bg-[#06162d] px-4 py-3 text-sm font-bold text-[#d7f4ff] outline-none transition focus:border-[#72e2ff]"
                              onChange={(event) => {
                                setSelectedVoiceName(event.target.value);
                                const targetLanguage = showEnglish ? "English" : onboarding.language;
                                window.localStorage.setItem(
                                  `vaani-coach-voice-${targetLanguage.toLowerCase()}`,
                                  event.target.value
                                );
                              }}
                              title="Language optimized voices"
                              value={selectedVoiceName}
                            >
                              <optgroup label="Google AI (Human-like Neural)">
                                {(() => {
                                  const targetLanguage = showEnglish ? "English" : onboarding.language;
                                  const speechLanguage = getSpeechLanguage(targetLanguage);
                                  const gVoice = googleCloudVoices[speechLanguage];
                                  if (gVoice) {
                                    return (
                                      <option value={`google-${gVoice}`}>
                                        Google {targetLanguage} (Neural)
                                      </option>
                                    );
                                  }
                                  return (
                                    <option value={`google-${speechLanguage}-Wavenet-A`}>
                                      Google {targetLanguage} (Wavenet)
                                    </option>
                                  );
                                })()}
                              </optgroup>
                              <optgroup label="OpenAI AI (Clear & Warm)">
                                <option value="ai-nova">Nova (Supportive)</option>
                                <option value="ai-shimmer">Shimmer (Warm)</option>
                                <option value="ai-onyx">Onyx (Steady)</option>
                              </optgroup>
                              <optgroup label="System Voices (Browser)">
                                <option value="">Auto-select best system voice</option>
                                {availableVoices
                                  .filter((voice) => {
                                    const targetLanguage = showEnglish ? "English" : onboarding.language;
                                    const speechLanguage = getSpeechLanguage(targetLanguage);
                                    return voice.lang.toLowerCase().startsWith(speechLanguage.split("-")[0].toLowerCase());
                                  })
                                  .sort((a, b) => {
                                    // Prioritize Google voices in the list
                                    const aIsGoogle = /google/i.test(a.name);
                                    const bIsGoogle = /google/i.test(b.name);
                                    if (aIsGoogle && !bIsGoogle) return -1;
                                    if (!aIsGoogle && bIsGoogle) return 1;
                                    return 0;
                                  })
                                  .map((voice) => (
                                    <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                                      {voice.name} {/google/i.test(voice.name) ? "✨" : ""}
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                            <select
                              className="w-full rounded-md border border-white/10 bg-[#040712] px-3 py-2 text-xs font-bold text-[#d7f4ff]/50 outline-none transition focus:border-[#72e2ff]"
                              onChange={(event) => {
                                setSelectedVoiceName(event.target.value);
                                const targetLanguage = showEnglish ? "English" : onboarding.language;
                                window.localStorage.setItem(
                                  `vaani-coach-voice-${targetLanguage.toLowerCase()}`,
                                  event.target.value
                                );
                              }}
                              title="All system voices (Advanced)"
                              value={selectedVoiceName}
                            >
                              <option value="">Advanced: All system voices</option>
                              {availableVoices.map((voice) => (
                                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            className="h-fit rounded-md bg-[#72e2ff] px-5 py-3 text-sm font-black text-[#04111c] transition hover:bg-[#a9f1ff]"
                            onClick={playVoiceFeedback}
                            type="button"
                          >
                            Play coach voice
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 leading-7 text-[#d7f4ff]">
                        {showEnglish && assessment.translation
                          ? assessment.translation.spokenFeedback
                          : assessment.spokenFeedback}
                      </p>
                    </>
                  ) : null}
                  <p className="mt-5 text-sm font-bold text-[#72e2ff]">
                    {showEnglish ? "Next drill (English)" : "Next drill"}
                  </p>
                  <p className="mt-2 leading-7 text-[#d7f4ff]">
                    {showEnglish && assessment.translation
                      ? assessment.translation.drill
                      : assessment.drill}
                  </p>
                  {assessment.translation && (
                    <div className="mt-6 flex justify-end border-t border-white/5 pt-4">
                      <button
                        className="text-xs font-bold uppercase tracking-wider text-[#72e2ff] hover:underline"
                        onClick={() => setShowEnglish(!showEnglish)}
                        type="button"
                      >
                        {showEnglish ? "Show Native Language" : "Read in English"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  <div className="rounded-md border border-[#72e2ff]/24 bg-[#06162d] p-4">
                    <p className="text-sm font-bold text-[#a9f1ff]">
                      Exact pronunciation
                    </p>
                    {pronunciationFindings.length ? (
                      <div className="mt-3 grid gap-3">
                        {pronunciationFindings.map((finding) => (
                          <div
                            className="rounded-md border border-white/10 bg-white/[0.04] p-3"
                            key={`${finding.word}-${finding.correctPronunciation}`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-lg font-black text-white">
                                  {finding.word}
                                </p>
                                {finding.heardAs ? (
                                  <p className="mt-1 text-sm text-[#d7f4ff]/70">
                                    Heard as: {finding.heardAs}
                                  </p>
                                ) : null}
                              </div>
                              <p className="rounded-md bg-[#72e2ff]/10 px-3 py-2 text-sm font-bold text-[#a9f1ff]">
                                {finding.correctPronunciation}
                              </p>
                            </div>
                            <p className="mt-3 text-sm font-bold text-[#72e2ff]">
                              {finding.phoneticHint}
                            </p>
                            <p className="mt-2 leading-7 text-[#d7f4ff]">
                              {finding.issue}
                            </p>
                            <p className="mt-2 leading-7 text-[#d7f4ff]/80">
                              Practice: {finding.practiceLine}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 leading-7 text-[#d7f4ff]/72">
                        No exact word-level pronunciation issue was audible in
                        this clip. Record a clearer or longer take for targeted
                        word corrections.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-4">
                    <div className="rounded-md border border-white/10 bg-[#06162d] p-4">
                      <p className="text-sm font-bold text-[#a9f1ff] uppercase tracking-wider">Strengths</p>
                      <ul className="mt-3 list-disc pl-5 space-y-2 text-[#d7f4ff]">
                        {(showEnglish && assessment.translation ? assessment.translation.strengths : assessment.strengths).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-md border border-white/10 bg-[#06162d] p-4">
                      <p className="text-sm font-bold text-[#ffb8b8] uppercase tracking-wider">Areas of Improvement</p>
                      <ul className="mt-3 list-disc pl-5 space-y-2 text-[#d7f4ff]">
                        {(showEnglish && assessment.translation ? assessment.translation.areasOfImprovement : assessment.areasOfImprovement).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-md border border-[#72e2ff]/24 bg-[#72e2ff]/10 p-4">
                      <p className="text-sm font-bold text-[#a9f1ff] uppercase tracking-wider">Actionable Feedback</p>
                      <ul className="mt-3 list-disc pl-5 space-y-2 text-[#d7f4ff]">
                        {(showEnglish && assessment.translation ? assessment.translation.actionableFeedback : assessment.actionableFeedback).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {assessment.nativityLevel && (
                      <div className="rounded-md border border-[#72e2ff]/30 bg-[#06162d] p-5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <span className="text-6xl font-black italic">{assessment.nativityLevel}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="grid place-items-center h-16 w-16 rounded-full border-2 border-[#72e2ff] bg-[#72e2ff]/10 text-2xl font-black text-[#72e2ff]">
                            {assessment.nativityLevel}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#a9f1ff] uppercase tracking-wider">Speaker Nativity Guess</p>
                            <p className="mt-1 text-xs text-[#d7f4ff]/60 font-bold uppercase tracking-tight">CEFR Proficiency Level</p>
                          </div>
                        </div>
                        <p className="mt-4 leading-7 text-[#d7f4ff] relative z-10">
                          {showEnglish && assessment.translation
                            ? assessment.translation.nativityExplanation
                            : assessment.nativityExplanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-md border border-white/10 bg-[#06162d] p-4 leading-7 text-[#d7f4ff]/64">
                Record a short clip. Vaani will generate a first-pass report
                using your selected language, proficiency, and speaking goal.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
