import { createFileRoute } from "@tanstack/react-router";
import { CopilotView } from "@/components/CopilotView";

export const Route = createFileRoute("/copilot")({
  head: () => ({
    meta: [
      { title: "Industrial Copilot — Operational Guidance" },
      {
        name: "description",
        content:
          "Operational guidance grounded in your knowledge base. Get recommended actions, safety checks, and relevant SOPs.",
      },
      { property: "og:title", content: "Industrial Copilot" },
      {
        property: "og:description",
        content: "Operational guidance grounded in your knowledge base.",
      },
    ],
  }),
  component: CopilotView,
});
