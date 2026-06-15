import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, languageCode, voiceName } = await request.json();
    console.log(`[Google TTS] Request: lang=${languageCode}, voice=${voiceName}, textLength=${text?.length}`);
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY is not configured." },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "Text is required for TTS." },
        { status: 400 }
      );
    }

    let actualLanguageCode = languageCode || "en-IN";
    let actualVoiceName = voiceName;

    // Internal mapping for Cloud specific locales (only if not already mapped)
    if (actualLanguageCode === "ar-SA") actualLanguageCode = "ar-XA";
    if (actualLanguageCode === "ur-IN") actualLanguageCode = "ur-PK";

    // If voiceName was provided but doesn't match the language code, prioritize voiceName's prefix
    if (actualVoiceName && actualVoiceName.includes("-")) {
      const parts = actualVoiceName.split("-");
      if (parts.length >= 2) {
        const voiceLang = `${parts[0]}-${parts[1]}`;
        if (voiceLang !== actualLanguageCode) {
          console.warn(`[Google TTS] Overriding lang ${actualLanguageCode} with ${voiceLang} from voice ${actualVoiceName}`);
          actualLanguageCode = voiceLang;
        }
      }
    }

    // Google Cloud Text-to-Speech API
    let response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: actualLanguageCode,
            name: actualVoiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            pitch: 0,
            speakingRate: 1.1,
          },
        }),
      }
    );

    // If specific voice fails, retry with just language code
    if (!response.ok && actualVoiceName) {
      console.warn(`[Google TTS] Voice ${actualVoiceName} failed, retrying with just lang ${actualLanguageCode}`);
      response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: actualLanguageCode,
              ssmlGender: "FEMALE",
            },
            audioConfig: {
              audioEncoding: "MP3",
            },
          }),
        }
      );
    }

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || "Google TTS failed." },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      console.error("Google TTS response missing audioContent:", data);
      return NextResponse.json(
        { error: "Google TTS returned no audio content." },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(data.audioContent, "base64");

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error during Google TTS." },
      { status: 500 }
    );
  }
}
