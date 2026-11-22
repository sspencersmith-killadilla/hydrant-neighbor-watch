import { createFileRoute } from "@tanstack/react-router";
import { DocPage } from "@/components/blockaid/DocPage";
import doc from "../../SELF_HOSTING.md?raw";

export const Route = createFileRoute("/self-host")({
  head: () => ({
    meta: [
      { title: "Self-hosting guide — BlockAid" },
      { name: "description", content: "Run BlockAid on your own Supabase and Cloudflare accounts, step by step." },
      { property: "og:title", content: "Self-hosting guide — BlockAid" },
      { property: "og:description", content: "Deploy your own copy of BlockAid with no vendor lock-in." },
    ],
  }),
  component: () => <DocPage markdown={doc} />,
});
