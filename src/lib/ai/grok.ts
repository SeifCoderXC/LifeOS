import OpenAI from "openai";
import type { HeuristicResult } from "../engines/heuristic";
import type { InputMode } from "../types";
import { ExtractionSchema, MASTER_DIRECTIVE, emptyExtraction, jsonSchema, pieceFromExtraction } from "./schema";

const MODEL = process.env.XAI_MODEL || "grok-4.6";

export function grokConfigured() {
  return Boolean(process.env.XAI_API_KEY);
}

function client() {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
}

export async function grokExtract(
  raw: string,
  context: string,
): Promise<{ result: HeuristicResult; used: boolean; error?: string }> {
  const c = client();
  if (!c) {
    return { result: emptyExtraction(), used: false };
  }
  try {
    const completion = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: MASTER_DIRECTIVE },
        {
          role: "user",
          content: `CONTEXT (recent ledger, may be empty):\n${context}\n\nRAW USER INPUT (preserve; do not rewrite history):\n${raw}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lifeos_extraction",
          schema: jsonSchema(),
          strict: true,
        },
      },
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("empty grok content");
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

export interface WorldResearchResult {
  performed: boolean;
  claims: Array<{
    claim: string;
    topic: string;
    source_urls: string[];
    confidence: number;
  }>;
  error?: string;
}

export async function grokWorldResearch(query: string): Promise<WorldResearchResult> {
  const c = client();
  if (!c) return { performed: false, claims: [], error: "XAI_API_KEY not set — research skipped." };
  try {
    const response = await c.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You research current external facts for a personal LifeOS. Prefer official/primary sources for laws, visas, jobs, tuition, salaries. Record retrieval-grade claims with URLs. Never invent citations. If you cannot verify, say so. Return JSON only.",
        },
        { role: "user", content: query },
      ],
      tools: [{ type: "web_search" }],
      text: {
        format: {
          type: "json_schema",
          name: "world_research",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["claims"],
            properties: {
              claims: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["claim", "topic", "source_urls", "confidence"],
                  properties: {
                    claim: { type: "string" },
                    topic: { type: "string" },
                    source_urls: { type: "array", items: { type: "string" } },
                    confidence: { type: "number" },
                  },
                },
              },
            },
          },
          strict: true,
        },
      },
    });

    const message = response.output?.find((item) => item.type === "message");
    const textPart = message && "content" in message
      ? (message.content as Array<{ type: string; text?: string }>).find((p) => p.type === "output_text")
      : null;
    const rawText =
      textPart?.text ||
      (typeof (response as { output_text?: string }).output_text === "string"
        ? (response as { output_text?: string }).output_text
        : null);
    if (!rawText) return { performed: true, claims: [] };
    const parsed = JSON.parse(rawText) as WorldResearchResult;
    return { performed: true, claims: parsed.claims ?? [] };
  } catch (err) {
    return {
      performed: false,
      claims: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function modelName() {
  return MODEL;
}
