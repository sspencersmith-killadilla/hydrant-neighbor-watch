import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function DocPage({ markdown }: { markdown: string }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <article className="doc">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
