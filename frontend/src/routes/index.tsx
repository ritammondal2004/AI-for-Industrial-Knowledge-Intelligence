import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/ChatView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Industrial Knowledge Copilot" },
      {
        name: "description",
        content:
          "Hybrid GraphRAG assistant for industrial manuals, standards, and operating procedures.",
      },
      { property: "og:title", content: "Industrial Knowledge Copilot" },
      {
        property: "og:description",
        content:
          "Hybrid GraphRAG assistant for industrial manuals, standards, and operating procedures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <ChatView />;
}
