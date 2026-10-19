import { API_URL, getToken } from "@/lib/api";

const API_BASE = API_URL;

export interface TranscribeResult {
  text: string;
  language: string;
  confidence: number | null;
  words: { word: string; start_sec: number; end_sec: number; probability?: number }[];
  segments: { start_sec: number; end_sec: number; text: string; language: string }[];
  metrics: {
    wpm: number;
    filler_rate: number | null;
    filler_count: number | null;
    pause_ratio: number;
    pitch_var: number | null;
    energy_var: number;
    primary_language: string;
    primary_ratio: number | null;
    code_switch_rate: number | null;
  };
}

export async function transcribeAudioBlob(
  audioBlob: Blob,
  languageHint?: string,
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("audio", audioBlob, "audio.webm");
  if (languageHint) {
    form.append("language_hint", languageHint);
  }

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/v1/stt/transcribe`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`STT failed (${res.status}): ${errText}`);
  }

  return res.json();
}
