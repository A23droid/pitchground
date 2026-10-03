import type { Language } from "@/lib/types";

export function languageToSarvamCode(language?: Language): string {
  switch (language) {
    case "Hindi":
      return "hi-IN";
    case "Malayalam":
      return "ml-IN";
    case "English":
      return "en-IN";
    case "Mixed":
    default:
      return "unknown";
  }
}
