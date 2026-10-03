// app/api/chat/route.ts
// The core of the app. Every message from the frontend lands here.
//
// Flow:
//   1. Pull the latest user message + chatId.
//   2. Retrieve RAG context IF this chat has uploaded documents
//      (retrieveContext returns [] instantly otherwise — zero cost).
//   3. Build a system prompt that includes that context, if any.
//   4. Call streamText with tools attached, so the model can call
//      webSearch / calculate / renderChart / renderComparisonTable /
//      renderQuizCard whenever it decides one fits better than plain prose.
//   5. Stream the result back — the AI SDK's useChat hook on the
//      frontend consumes this directly.
//   6. On finish, persist both the user turn and the assistant reply so
//      the sidebar history survives a refresh.
//
// IMPORTANT — Gemini 3 + maxSteps:1 (read before changing model names):
// Gemini 3 models require every tool call to carry a "thought signature"
// that gets echoed back on the *next* model call in the same request.
// The AI SDK version pinned in this project (ai@3.x / @ai-sdk/google@0.0.x)
// predates that requirement and doesn't preserve it, so any follow-up step
// after a tool call crashes with "Function call is missing a
// thought_signature". Some Google accounts can no longer use Gemini 2.5
// models at all ("no longer available to new users"), which forces Gemini
// 3 and makes that crash unavoidable with multi-step tool use.
//
// The fix here is `maxSteps: 1`: the model gets exactly one turn, so it
// either answers directly or makes tool calls, but is never asked to
// continue after seeing a tool's result — which is exactly the step that
// was crashing. The trade-off: the model can no longer write a sentence
// that incorporates a tool's result (e.g. "Based on that search, X is...").
// webSearch and calculate results are rendered directly in the UI instead
// (see components/ToolRenderer.tsx) so the feature still works, just
// without that wrap-up sentence. Properly restoring multi-step tool use
// requires upgrading to a current AI SDK major version (ai@7 +
// @ai-sdk/google@4), which is a significant, separate migration.

import { google } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import { retrieveContext, formatContextBlock } from "@/lib/rag";
import { tools } from "@/lib/tools";
import { ensureChat, saveMessage } from "@/lib/supabase";

export const runtime = "edge"; // fast cold starts, works on Vercel free tier
export const maxDuration = 30; // seconds — stay under hobby-plan limits

const SYSTEM_PROMPT = `You are a helpful assistant.

You have tools available:
- webSearch: use for anything current or time-sensitive. Its results are
  shown directly to the user below your message — you don't need to (and
  currently can't) summarize them afterward, so keep your own reply short.
- calculate: use for any arithmetic — never compute math yourself. The
  result is shown directly to the user.
- renderChart: use INSTEAD of prose when the answer compares numbers
  across categories or time.
- renderComparisonTable: use INSTEAD of prose when comparing 2-4 named
  options on shared attributes.
- renderQuizCard: use INSTEAD of prose when the user asks to be quizzed
  or tested on something.

Prefer a tool over prose whenever one clearly fits. Otherwise, answer
directly and concisely.`;

export async function POST(req: Request) {
  const { messages, chatId }: { messages: CoreMessage[]; chatId: string } =
    await req.json();

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const query =
    typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";

  // Cheap no-op when no documents were ever uploaded for this chat.
  const contextChunks = chatId ? await retrieveContext(chatId, query) : [];
  const contextBlock = formatContextBlock(contextChunks);

  const systemPrompt = contextBlock
    ? `${SYSTEM_PROMPT}\n\n${contextBlock}`
    : SYSTEM_PROMPT;

  // Persist the user's turn immediately so it survives even if the
  // stream is interrupted. Fire-and-forget: history is a nice-to-have,
  // never something that should block or break the chat response.
  if (chatId && query) {
    ensureChat(chatId, query)
      .then(() => saveMessage(chatId, "user", query))
      .catch((err) => console.error("history save (user) failed:", err));
  }

  // These are the exact replacement model names Google's own API error
  // messages named for this account (2.5-generation models are blocked
  // for it). If Google renames these again, the error message you get
  // back will name the new replacement the same way.
  const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

  let result;
  for (const modelName of MODELS) {
    try {
      result = await streamText({
        model: google(modelName),
        system: systemPrompt,
        messages,
        tools,
        maxSteps: 1, // see the note at the top of this file
        onFinish: ({ text }) => {
          if (chatId && text) {
            saveMessage(chatId, "assistant", text).catch((err) =>
              console.error("history save (assistant) failed:", err)
            );
          }
        },
      });
      break; // succeeded — stop trying further models
    } catch (err) {
      console.error(`Model ${modelName} failed, trying next:`, err);
    }
  }

  if (!result) {
    return Response.json(
      {
        error:
          "All models are currently unavailable or overloaded on Google's side. Please try again in a moment.",
      },
      { status: 503 }
    );
  }

  return result.toDataStreamResponse();
}