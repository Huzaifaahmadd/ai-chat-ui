# Setup

## 1. Install dependencies
```bash
npm install
```

## 2. Environment variables
Copy `.env.example` to `.env.local` and fill in:
```
GOOGLE_GENERATIVE_AI_API_KEY=   # free, from aistudio.google.com
SUPABASE_URL=                  # free project at supabase.com
SUPABASE_SERVICE_ROLE_KEY=     # from Supabase project settings > API
TAVILY_API_KEY=                # free tier at tavily.com
```

## 3. Supabase setup
Run this once in the Supabase SQL editor.

Chat history (Phase 2):
```sql
create table chats (
  id text primary key,
  title text not null default 'New chat',
  created_at timestamptz default now()
);

create table messages (
  id bigint generated always as identity primary key,
  chat_id text not null references chats(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);
```

Document RAG (Phase 4):
```sql
create extension if not exists vector;

create table document_chunks (
  id bigint generated always as identity primary key,
  chat_id text not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

create index on document_chunks using ivfflat (embedding vector_cosine_ops);

create or replace function match_chunks(
  query_embedding vector(768),
  match_chat_id text,
  match_count int default 5
) returns table (id bigint, content text, similarity float)
language sql stable as $$
  select id, content, 1 - (embedding <=> query_embedding) as similarity
  from document_chunks
  where chat_id = match_chat_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

## 4. Run it
```bash
npm run dev
```
Open http://localhost:3000. Everything — chat, history sidebar, document
upload, web search, and generative UI (charts, comparison tables, quiz
cards) — works out of the box once the env vars above are set.

## Things to try
- "Compare the iPhone 16 and Pixel 9 on price and camera" → comparison table
- "Chart quarterly revenue: Q1 120, Q2 150, Q3 90, Q4 200" → bar chart
- "Quiz me on the water cycle" → interactive quiz card
- "What's the latest news on the Fed rate decision?" → web search tool
- Upload a PDF, then ask a question about its contents → RAG with citations

## Free-tier limits to keep in mind
- Gemini free tier: per-minute request limits — add basic retry/backoff for demos.
- Tavily free tier: 1,000 searches/month.
- Vercel hobby plan: 10s function timeout on serverless — this project uses
  `edge` runtime for chat (no hard timeout) but `nodejs` runtime for upload
  (needed for `pdf-parse`), so keep uploaded files small (capped at 5MB here).
- Supabase free tier pauses the database after a week of no activity —
  fine for a portfolio demo, just note it in your README.
