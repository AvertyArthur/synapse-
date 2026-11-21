import { Fragment } from "react";

/** Rendu Markdown minimal et sûr (titres, listes, gras, italique), sans HTML injecté. */
function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={`${keyBase}-${i}`}>{p.slice(1, -1)}</em>;
    return <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>;
  });
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const k = `p${blocks.length}`;
      blocks.push(<p key={k} className="my-2 leading-relaxed">{inline(para.join(" "), k)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = `l${blocks.length}`;
      const items = list.items.map((it, i) => <li key={`${k}-${i}`} className="my-1">{inline(it, `${k}-${i}`)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={k} className="my-2 list-decimal pl-6">{items}</ol>
        ) : (
          <ul key={k} className="my-2 list-disc pl-6">{items}</ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const k = `h${blocks.length}`;
      const level = h[1].length;
      blocks.push(
        level <= 2 ? (
          <h3 key={k} className="mt-5 mb-2 font-display text-xl font-bold">{inline(h[2], k)}</h3>
        ) : (
          <h4 key={k} className="mt-4 mb-1 font-display text-lg font-semibold text-teal">{inline(h[2], k)}</h4>
        ),
      );
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return <div className="text-[15px]">{blocks}</div>;
}
