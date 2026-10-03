// lib/tools.ts
// Defines every tool the model can call. Two kinds:
// 1. "Action" tools (webSearch, calculate) — the model calls these to get
//    information, then keeps talking.
// 2. "Generative UI" tools (renderChart, renderComparisonTable,
//    renderQuizCard) — the model calls these INSTEAD of writing prose, and
//    the frontend renders the arguments as a real React component. This is
//    the differentiator.
//
// FREE TOOLS USED:
// - Web search: Tavily free tier (1,000 searches/month, no card required)

import { tool } from "ai";
import { z } from "zod";

export const webSearch = tool({
  description:
    "Search the live web for current information — news, prices, recent events, or anything that could have changed since the model's training cutoff.",
  parameters: z.object({
    query: z.string().describe("A short, specific search query"),
  }),
  execute: async ({ query }) => {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 5,
      }),
    });

    if (!res.ok) return { error: `Search failed: ${res.status}` };

    const data = await res.json();
    // Trim to just what the model needs — keeps token usage (and cost) down.
    return {
      results: (data.results ?? []).map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 300),
      })),
    };
  },
});

export const calculate = tool({
  description:
    "Evaluate a mathematical expression. Use this instead of doing arithmetic yourself — models are unreliable at exact math.",
  parameters: z.object({
    expression: z.string().describe("e.g. '(120 * 4) / 3'"),
  }),
  execute: async ({ expression }) => {
    // Only allow digits, operators, parentheses, decimals, spaces — never
    // eval() raw model output directly.
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      return { error: "Expression contains disallowed characters" };
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)();
      return { result };
    } catch {
      return { error: "Could not evaluate expression" };
    }
  },
});

// ---- Generative UI tools ----
// These don't "do" anything — calling one just returns its own validated
// arguments. The frontend watches for these specific tool calls in the
// stream and renders a matching component instead of plain text.

export const renderChart = tool({
  description:
    "Render a bar or line chart. Use this whenever the answer involves comparing numbers over categories or time — a chart communicates this better than a paragraph of numbers.",
  parameters: z.object({
    title: z.string(),
    type: z.enum(["bar", "line"]),
    labels: z.array(z.string()).describe("X-axis labels, e.g. months or names"),
    series: z.array(
      z.object({
        name: z.string(),
        values: z.array(z.number()),
      })
    ),
  }),
  execute: async (args) => args, // pass-through: the UI does the rendering
});

export const renderComparisonTable = tool({
  description:
    "Render a side-by-side comparison table. Use this when the user is weighing 2-4 named options against shared attributes (e.g. products, plans, tools).",
  parameters: z.object({
    items: z.array(z.string()).describe("Names of the things being compared"),
    rows: z.array(
      z.object({
        label: z.string().describe("Attribute name, e.g. 'Price'"),
        values: z.array(z.string()).describe("One value per item, same order as `items`"),
      })
    ),
  }),
  execute: async (args) => args,
});

export const renderQuizCard = tool({
  description:
    "Render an interactive multiple-choice question. Use this when the user asks to be quizzed or tested on something, instead of writing the question as plain text.",
  parameters: z.object({
    question: z.string(),
    options: z.array(z.string()).min(2).max(6),
    correctIndex: z.number().int().describe("Index into `options` of the correct answer"),
    explanation: z.string().describe("Why that answer is correct, shown after the user picks"),
  }),
  execute: async (args) => args,
});

export const tools = {
  webSearch,
  calculate,
  renderChart,
  renderComparisonTable,
  renderQuizCard,
};
