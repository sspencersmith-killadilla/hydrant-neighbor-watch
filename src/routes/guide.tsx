import { createFileRoute } from "@tanstack/react-router";
import { DocPage } from "@/components/blockaid/DocPage";
import guide from "../../USER_GUIDE.md?raw";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "User guide — BlockAid" },
      { name: "description", content: "How residents adopt and report on city assets, and how Public Works runs storm mode and triage." },
      { property: "og:title", content: "User guide — BlockAid" },
      { property: "og:description", content: "Step-by-step help for residents and Public Works staff." },
    ],
  }),
  component: () => <DocPage markdown={guide} />,
});
