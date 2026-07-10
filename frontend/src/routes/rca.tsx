import { createFileRoute } from "@tanstack/react-router";
import { RcaView } from "@/components/RcaView";

export const Route = createFileRoute("/rca")({
  head: () => ({
    meta: [
      { title: "Root Cause Analysis AI" },
      {
        name: "description",
        content:
          "Structured failure analysis grounded in your industrial knowledge base — describe a symptom and get likelihood-rated root causes.",
      },
      { property: "og:title", content: "Root Cause Analysis AI" },
      {
        property: "og:description",
        content: "Structured failure analysis grounded in your industrial knowledge base.",
      },
    ],
  }),
  component: RcaView,
});
