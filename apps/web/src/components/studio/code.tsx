"use client";

import { useMemo } from "react";

// Tiny, dependency-free highlighter for TS/JSON/HTML/Markdown blocks.
const KW = /\b(import|from|export|default|const|let|var|function|return|if|else|for|while|of|in|new|type|interface|extends|as|async|await|true|false|null|undefined|void|typeof|switch|case|break|continue)\b/g;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlight(code: string, lang: "ts" | "json" | "md" | "html") {
  if (lang === "md") {
    return esc(code)
      .split("\n")
      .map((l) => {
        if (/^#{1,6} /.test(l)) return `<span style="color:#FFFFEB;font-weight:700">${l}</span>`;
        if (/^```/.test(l)) return `<span style="color:#8C8C83">${l}</span>`;
        if (/^\|/.test(l)) return `<span style="color:#CFCFB8">${l}</span>`;
        return l.replace(/`([^`]+)`/g, '<span style="color:#F0D7FF">`$1`</span>').replace(/\*\*([^*]+)\*\*/g, '<span style="color:#FFFFEB;font-weight:700">**$1**</span>');
      })
      .join("\n");
  }
  const tokens: string[] = [];
  const stash = (html: string) => `\u0000${tokens.push(html) - 1}\u0000`;
  let s = esc(code);
  s = s.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|&lt;!--[\s\S]*?--&gt;)/g, (m) => stash(`<span style="color:#7A7A70;font-style:italic">${m}</span>`));
  s = s.replace(/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, (m) => stash(`<span style="color:#D9C7A8">${m}</span>`));
  if (lang === "ts") s = s.replace(KW, (m) => stash(`<span style="color:#F0D7FF">${m}</span>`));
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, (m) => stash(`<span style="color:#FFD9A8">${m}</span>`));
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
}

export function CodeBlock({ code, lang, className = "", maxH = "60vh" }: { code: string; lang: "ts" | "json" | "md" | "html"; className?: string; maxH?: string }) {
  const html = useMemo(() => highlight(code, lang), [code, lang]);
  return (
    <pre className={`code thin-scroll overflow-auto p-4 ${className}`} style={{ maxHeight: maxH }} data-lenis-prevent>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
