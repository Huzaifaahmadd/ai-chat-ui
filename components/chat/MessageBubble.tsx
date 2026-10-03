"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolRenderer } from "@/components/ToolRenderer";

interface Props {
  role: "user" | "assistant";
  content: string;
  toolInvocations?: any[];
}

// Maps each tool name to the label shown on the route tag — a small,
// honest readout of which path the intent router took for this reply.
const ROUTE_LABELS: Record<string, string> = {
  webSearch: "web search",
  calculate: "calculator",
  renderChart: "chart",
  renderComparisonTable: "comparison",
  renderQuizCard: "quiz",
};

function RouteTag({ toolInvocations }: { toolInvocations?: any[] }) {
  if (!toolInvocations?.length) return null;
  const names = Array.from(
    new Set(toolInvocations.map((t) => ROUTE_LABELS[t.toolName]).filter(Boolean))
  );
  if (names.length === 0) return null;

  return (
    <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-wire">
      <span className="h-1 w-1 rounded-full bg-wire" />
      {names.join(" · ")}
    </div>
  );
}

export function MessageBubble({ role, content, toolInvocations }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[80%] rounded-md border px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "border-signal-dim bg-signal-dim text-ink"
            : "border-line bg-panel-raised text-ink",
        ].join(" ")}
      >
        {!isUser && <RouteTag toolInvocations={toolInvocations} />}
        {content && <MarkdownRenderer content={content} />}
        {toolInvocations?.map((t) => (
          <ToolRenderer key={t.toolCallId} invocation={t} />
        ))}
      </div>
    </div>
  );
}
