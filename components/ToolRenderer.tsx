// components/ToolRenderer.tsx
// This is the piece that makes "generative UI" actually visible. The AI
// SDK's useChat() hook exposes each message's `toolInvocations` array.
// Instead of printing tool output as text, we match the tool name and
// render a real component with its validated arguments.
//
// Usage inside your message list:
//   {message.toolInvocations?.map((t) => (
//     <ToolRenderer key={t.toolCallId} invocation={t} />
//   ))}

"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ToolInvocation = {
  toolName: string;
  toolCallId: string;
  state: "call" | "result";
  args: any;
  result?: any;
};

const SERIES_COLORS = ["#f2a341", "#5fb8b8", "#8b96a8", "#c77dff"];

export function ToolRenderer({ invocation }: { invocation: ToolInvocation }) {
  const { toolName, args, state } = invocation;

  if (state !== "result") {
    return (
      <div className="mt-1 font-mono text-[11px] text-wire">
        {toolName === "webSearch" && "searching the web…"}
        {toolName === "calculate" && "calculating…"}
        {(toolName === "renderChart" ||
          toolName === "renderComparisonTable" ||
          toolName === "renderQuizCard") &&
          "building visualization…"}
      </div>
    );
  }

  if (toolName === "webSearch") {
    const { results, error } = invocation.result ?? {};
    if (error) {
      return <p className="mt-1 text-sm text-muted">Search failed: {error}</p>;
    }
    if (!results?.length) {
      return <p className="mt-1 text-sm text-muted">No results found.</p>;
    }
    return (
      <div className="my-2 flex flex-col gap-2">
        {results.map((r: { title: string; url: string; snippet?: string }) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-line bg-base p-3 text-sm transition-colors hover:border-signal"
          >
            <p className="text-ink underline underline-offset-2">{r.title}</p>
            {r.snippet && <p className="mt-1 text-xs text-muted">{r.snippet}</p>}
          </a>
        ))}
      </div>
    );
  }

  if (toolName === "calculate") {
    const { result: value, error } = invocation.result ?? {};
    if (error) {
      return <p className="mt-1 text-sm text-muted">{error}</p>;
    }
    return (
      <div className="my-2 inline-block rounded border border-line bg-base px-3 py-2 font-mono text-sm text-ink">
        = {value}
      </div>
    );
  }

  if (toolName === "renderChart") {
    const { title, type, labels, series } = args;
    const data = labels.map((label: string, i: number) => {
      const row: Record<string, any> = { label };
      series.forEach((s: { name: string; values: number[] }) => {
        row[s.name] = s.values[i];
      });
      return row;
    });

    const Chart = type === "line" ? LineChart : BarChart;
    // Cast to `any`: Line and Bar have incompatible prop types, so a
    // variable holding either loses its JSX call signature under strict
    // mode even though both accept the props passed below.
    const SeriesEl: any = type === "line" ? Line : Bar;

    return (
      <div className="my-3 rounded-md border border-line bg-base p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          {title}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <Chart data={data}>
            <CartesianGrid stroke="#1b2330" vertical={false} />
            <XAxis dataKey="label" stroke="#8b96a8" fontSize={12} />
            <YAxis stroke="#8b96a8" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "#141a24",
                border: "1px solid #252e3d",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            {series.map((s: { name: string }, i: number) => (
              <SeriesEl
                key={s.name}
                dataKey={s.name}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                radius={type === "line" ? undefined : [3, 3, 0, 0]}
              />
            ))}
          </Chart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (toolName === "renderComparisonTable") {
    const { items, rows } = args;
    return (
      <div className="my-3 overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-panel-raised">
              <th className="p-2 text-left"></th>
              {items.map((item: string) => (
                <th
                  key={item}
                  className="p-2 text-left font-mono text-[11px] uppercase tracking-wide text-muted"
                >
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: { label: string; values: string[] }) => (
              <tr key={row.label} className="border-b border-line last:border-0">
                <td className="p-2 font-medium text-muted">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="p-2 text-ink">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (toolName === "renderQuizCard") {
    return <QuizCard {...args} />;
  }

  // webSearch / calculate results are usually fine folded back into the
  // model's next text reply, so no dedicated UI needed for them.
  return null;
}

function QuizCard({
  question,
  options,
  correctIndex,
  explanation,
}: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="my-3 rounded-md border border-line bg-base p-4">
      <p className="mb-3 text-sm text-ink">{question}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === correctIndex;
          const showState = picked !== null;

          return (
            <button
              key={i}
              onClick={() => setPicked(i)}
              disabled={showState}
              className={[
                "rounded border px-3 py-2 text-left text-sm transition-colors",
                !showState && "border-line text-ink hover:border-signal",
                showState && isCorrect && "border-wire bg-wire/10 text-ink",
                showState && isPicked && !isCorrect && "border-[#d1495b] bg-[#d1495b]/10 text-ink",
                showState && !isPicked && !isCorrect && "border-line text-muted opacity-60",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className="mt-3 font-mono text-[11px] text-muted">{explanation}</p>
      )}
    </div>
  );
}