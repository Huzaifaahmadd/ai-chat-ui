# AI Chat UI — RAG + Tools + Generative UI

A chat interface built to be more than another ChatGPT clone: an intent
router decides whether a message needs document retrieval (RAG), a live
tool call (web search / calculator), or plain chat — and the model can
stream back a real UI component (a chart, a comparison table, a quiz
card) instead of a wall of text. Built entirely on free tiers.

See `SETUP.md` for install steps and the two SQL scripts to run in
Supabase before starting.

## What makes this different
- **Generative UI** — the model can call `renderChart`,
  `renderComparisonTable`, or `renderQuizCard` instead of writing prose;
  the frontend renders these as real React components inline in the chat.
- **RAG over your own documents** — upload a PDF or `.txt` file and the
  bot answers grounded in that content, citing which chunk it used.
- **Tool calling** — the bot can search the live web or run a
  calculation mid-conversation.
- **Persistent history** — every chat and message is saved to Postgres,
  with a sidebar to switch between past conversations.

## Stack
| Layer | Tool |
|---|---|
| Frontend | Next.js 14 + Tailwind |
| Streaming + tools | Vercel AI SDK |
| LLM | Gemini 2.0 Flash (free tier) |
| Embeddings | Gemini `text-embedding-004` (free tier) |
| Vector store + chat history | Supabase (Postgres + pgvector), free tier |
| Web search tool | Tavily (free tier, 1,000 searches/month) |
| Hosting | Vercel (hobby, free) |

## Project structure
```
app/
├── page.tsx                    # sidebar + active chat
├── api/chat/route.ts           # intent router: RAG context + tools + streaming + history save
├── api/upload/route.ts         # document upload → chunk → embed
└── api/chats/                  # chat list + per-chat message history
components/
├── ToolRenderer.tsx            # chart / table / quiz card renderers
└── chat/                       # message list, input, sidebar, markdown
lib/
├── rag.ts                      # chunk, embed, store, retrieve
├── tools.ts                    # webSearch, calculate, render* tool defs
└── supabase.ts                 # chat history CRUD
```

## Deploying
Push to GitHub, import into Vercel, add the four env vars from
`.env.example` in the Vercel project settings, and deploy. No paid tier
required anywhere in this stack.
