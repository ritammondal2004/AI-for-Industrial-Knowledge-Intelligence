import { createFileRoute } from "@tanstack/react-router";
import {
  getCurrentKey,
  switchApiKey,
  keyCount,
} from "@/lib/gemini-keys.server";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

const SYSTEM_PROMPT = `You are a senior refinery / industrial engineer producing a concise but technically rich description of an image so a downstream Q&A system can reason about it.

Describe (only what you can see; do not invent) from engineering point of view:
- Equipment type(s) and orientation (pump, vessel, heat exchanger, valve, P&ID, gauge, nameplate, sketch, etc.)
- Any visible tags, IDs, labels, pipe markings, or nameplate data (verbatim)
- Gauge / instrument readings with units
- Process connections, flow direction if indicated, piping arrangement
- Visible defects: leaks, corrosion, fouling, cracks, misalignment, insulation damage
- Safety-relevant observations: exposed rotating parts, missing PPE, hot surfaces, spillage
- Materials of construction and condition if inferable

Output plain text, no markdown headings, ≤ 400 words. If the image contains text (schematic notes, procedures, tables), transcribe the important parts verbatim.`;

interface CaptionBody {
  imageBase64?: string;
  mime?: string;
  hint?: string;  
}
   
async function callGemini(
  key: string,
  imageBase64: string,
  mime: string,
  hint: string | undefined,
): Promise<Response> {
  const userText = hint
    ? `Context hint: ${hint}\n\nDescribe the image per the system instructions.`
    : "Describe the image per the system instructions.";

  return fetch(ENDPOINT(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userText },
            { inlineData: { mimeType: mime, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    }),
  });
}

export const Route = createFileRoute("/api/caption")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: CaptionBody;
        try {
          body = (await request.json()) as CaptionBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const { imageBase64, mime, hint } = body;
        if (!imageBase64 || !mime) {
          return new Response("imageBase64 and mime are required", {
            status: 400,
          });
        }
        if (!mime.startsWith("image/")) {
          return new Response("mime must be image/*", { status: 400 });
        }

        const total = keyCount();
        let lastStatus = 0;
        let lastText = "";

        for (let attempt = 0; attempt < total; attempt++) {
          const key = getCurrentKey();
          let resp: Response;
          try {
            resp = await callGemini(key, imageBase64, mime, hint);
          } catch (e) {
            console.error("Gemini network error:", e);
            switchApiKey();
            continue;
          }

          if (resp.ok) {
            const json = (await resp.json()) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
              }>;
            };
            const text =
              json.candidates?.[0]?.content?.parts
                ?.map((p) => p.text ?? "")
                .join("")
                .trim() ?? "";
            if (!text) {
              return Response.json(
                { caption: "", warning: "Empty response from model" },
                { status: 200 },
              );
            }
            return Response.json({ caption: text });
          }

          lastStatus = resp.status;
          lastText = await resp.text().catch(() => "");
          const retryable =
            resp.status === 429 ||
            resp.status === 401 ||
            resp.status === 403 ||
            resp.status >= 500;
          console.warn(
            `Gemini key #${attempt + 1} failed [${resp.status}]: ${lastText.slice(0, 200)}`,
          );
          if (!retryable) break;
          switchApiKey();
        }

        return new Response(
          `Gemini request failed [${lastStatus}]: ${lastText.slice(0, 500)}`,
          { status: 502 },
        );
      },
    },
  },
});
