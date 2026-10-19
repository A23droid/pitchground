import { authFetch } from "@/lib/api";

export type SpeechCallbacks = { onStart: () => void; onEnd: () => void; onError: (message: string) => void; onCancel?: () => void };
let activeVoice: (() => void) | null = null;
export function stopSpeechPlayback() { activeVoice?.(); activeVoice = null; }
// Session-local audio cache makes replay immediate without another paid synthesis call.
const cache = new Map<string, Blob>();

export function speakOpponent(text: string, language: string, callbacks: SpeechCallbacks): { cancel: () => void } {
  stopSpeechPlayback();
  const controller = new AbortController();
  let cancelled = false;
  let audio: HTMLAudioElement | null = null;
  let url: string | null = null;
  const cleanup = () => {
    if (activeVoice === cancel) activeVoice = null;
    if (audio) { audio.onplaying = null; audio.onended = null; audio.onerror = null; audio.pause(); audio.removeAttribute("src"); audio.load(); }
    if (url) { URL.revokeObjectURL(url); url = null; }
  };
  function cancel() { if (cancelled) return; cancelled = true; controller.abort(); cleanup(); callbacks.onCancel?.(); }
  activeVoice = cancel;
  const fail = (message: string) => {
    if (cancelled) return;
    cancelled = true; cleanup(); callbacks.onError(message);
  };
  void (async () => {
    try {
      const key = JSON.stringify([language, text]);
      let blob = cache.get(key);
      if (!blob) {
        const response = await authFetch("/v1/debate/speech", { method: "POST", body: JSON.stringify({text, language}), signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(typeof body.detail === "string" ? body.detail : "Opponent voice is unavailable. Press Play voice to retry.");
        }
        blob = await response.blob();
        if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("The voice service returned unusable audio.");
        if (cancelled) return;
        if (cache.size >= 8) cache.delete(cache.keys().next().value!);
        cache.set(key, blob);
      }
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      audio = new Audio(url);
      audio.onplaying = () => { if (!cancelled) callbacks.onStart(); };
      audio.onended = () => { if (!cancelled) { cancelled = true; cleanup(); callbacks.onEnd(); } };
      audio.onerror = () => fail("Voice playback failed. Press Play voice to retry.");
      try { await audio.play(); }
      catch { fail("Your browser paused voice playback. Press Play voice to hear the opponent."); }
    } catch (error) {
      fail(error instanceof Error ? error.message : "Opponent voice could not be generated. Please retry.");
    }
  })();
  return { cancel };
}
