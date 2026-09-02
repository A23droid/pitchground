import { NextResponse } from "next/server";

export const maxDuration = 60;

function sarvamUploadFile(file: File): File {
  const type = file.type.toLowerCase();
  if (type.includes("wav") || type.includes("wave") || type.includes("pcm")) {
    return new File([file], "speech.wav", { type: "audio/wav" });
  }
  if (type.includes("mpeg") || type.includes("mp3")) {
    return new File([file], "speech.mp3", { type: "audio/mpeg" });
  }
  if (type.includes("mp4") || type.includes("m4a")) {
    return new File([file], "speech.m4a", { type: "audio/mp4" });
  }
  if (type.includes("ogg")) {
    return new File([file], "speech.ogg", { type: "audio/ogg" });
  }
  return new File([file], "speech.webm", { type: "audio/webm" });
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as { error?: { message?: string } | string; message?: string };
  if (typeof data.error === "object" && data.error?.message) return data.error.message;
  if (typeof data.error === "string") return data.error;
  if (typeof data.message === "string") return data.message;
  return fallback;
}

export async function POST(request: Request) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sarvam API key is not configured." }, { status: 500 });
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }

  const file = incoming.get("file");
  if (!(file instanceof File) || file.size < 200) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }

  const languageCode = String(incoming.get("language_code") || "unknown");
  const upload = sarvamUploadFile(file);

  const body = new FormData();
  body.append("file", upload, upload.name);
  body.append("model", "saaras:v3");
  body.append("mode", "verbatim");
  body.append("language_code", languageCode);

  const sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body,
  });

  const payload: unknown = await sarvamRes.json().catch(() => null);

  if (!sarvamRes.ok) {
    return NextResponse.json(
      { error: errorMessage(payload, "Sarvam transcription failed.") },
      { status: sarvamRes.status },
    );
  }

  const transcript =
    payload && typeof payload === "object" && "transcript" in payload
      ? String((payload as { transcript?: string }).transcript ?? "").trim()
      : "";

  return NextResponse.json({ transcript });
}
