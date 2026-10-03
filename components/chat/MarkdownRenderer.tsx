"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
