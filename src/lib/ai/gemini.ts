import type { HeuristicResult } from "../engines/heuristic";
import type { InputMode } from "../types";
import { ExtractionSchema, MASTER_DIRECTIVE, emptyExtraction, jsonSchema, pieceFromExtraction } from "./schema";

// Google AI Studio's free tier (no billing account required): https://aistudio.google.com/apikey
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function geminiExtract(
  raw: string,
  context: string,
): Promise<{ result: HeuristicResult; used: boolean; error?: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { result: emptyExtraction(), used: false };
  }
  try {
    const prompt = [
      MASTER_DIRECTIVE,
      "",
      "Return ONLY a single JSON object (no markdown fences, no commentary) matching exactly this JSON Schema:",
      JSON.stringify(jsonSchema()),
      "",
      `CONTEXT (recent ledger, may be empty):\n${context}`,
      "",
      `RAW USER INPUT (preserve; do not rewrite history):\n${raw}`,
    ].join("\n");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("empty gemini content");
    const parsed = ExtractionSchema.parse(JSON.parse(text));
    return {
      used: true,
      result: {
        mode: parsed.mode as InputMode,
        needs_clarification: parsed.needs_clarification,
        clarification_question: parsed.clarification_question,
        pieces: parsed.events.map(pieceFromExtraction),
      },
    };
  } catch (err) {
    return {
      used: false,
      error: err instanceof Error ? err.message : String(err),
      result: emptyExtraction(),
    };
  }
}

export function geminiModelName() {
  return MODEL;
}
