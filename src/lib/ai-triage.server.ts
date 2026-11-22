import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { CREW_REASONS } from "./blockaid";

const RUN_ID = "X-Lovable-AIG-Run-ID";
function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export const triageSchema = z.object({
  category: z.enum(CREW_REASONS),
  urgent: z.boolean(),
  summary: z.string(),
  suggestedDetails: z.array(z.string()),
  safetyNote: z.string().nullable(),
});
export type Triage = z.infer<typeof triageSchema>;

const INSTRUCTIONS = `You help residents report problems with city storm drains and fire hydrants to Public Works.
Given the resident's description, pick the single best category:
- "Clogged Grate": debris, leaves, trash or ice blocking a drain.
- "Standing Water": pooling or flooding water.
- "Damaged Infrastructure": broken, missing, cracked or leaking grates, covers, hydrants or caps.
- "Downed Wire/Hazard": downed power lines, open holes, gas smell, or anything dangerous to people.
Set urgent=true only for immediate danger to people or property.
summary: one plain sentence (max 25 words) a crew can read at a glance.
suggestedDetails: 2-4 short questions or prompts for details the resident has NOT already given that would help the crew (e.g. water depth, size of the damage, whether a lane is blocked, whether it's getting worse). Never ask for personal info.
safetyNote: a short safety reminder if relevant (never tell residents to touch wires, enter water or open hydrants), otherwise null.`;

export async function triageIssue(input: { description: string; assetType: string }): Promise<Triage> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI help isn't set up yet.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: INSTRUCTIONS,
      messages: [{ role: "user", content: `Asset type: ${input.assetType}\nResident's description: ${input.description}` }],
      output: Output.object({ schema: triageSchema }),
      maxRetries: 0,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    return triageSchema.parse(await result.output);
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    console.error("AI triage failed", status, (e as Error).message);
    if (status === 429) throw new Error("AI help is busy right now. Try again in a minute, or pick a reason yourself.");
    if (status === 402 || status === 403) throw new Error("AI help is unavailable right now. Please pick a reason yourself.");
    throw new Error("AI help couldn't read that description. Please pick a reason yourself.");
  }
}
