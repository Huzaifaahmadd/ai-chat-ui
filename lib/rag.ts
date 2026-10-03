// lib/rag.ts
// Handles: chunking uploaded documents, embedding chunks, storing them in
// Supabase (pgvector), and retrieving the most relevant chunks for a query.
//
// FREE TOOLS USED:
// - Embeddings: Google Gemini "gemini-embedding-001" (free tier), pinned to
//   768 output dimensions to match the Supabase column below. Google
//   retired the older "text-embedding-004"/"embedding-001" models on
//   2026-01-14 — this project was updated to the replacement.
// - Vector store: Supabase Postgres + pgvector extension (free tier)
//
// Supabase setup (run once in the SQL editor):
//   create extension if not exists vector;
//   create table document_chunks (
//     id bigint generated always as identity primary key,
//     chat_id text not null,
//     content text not null,
//     embedding vector(768),
//     created_at timestamptz default now()
//   );
//   create index on document_chunks using ivfflat (embedding vector_cosine_ops);
//
//   create or replace function match_chunks(
//     query_embedding vector(768),
//     match_chat_id text,
//     match_count int default 5
//   ) returns table (id bigint, content text, similarity float)
//   language sql stable as $$
//     select id, content, 1 - (embedding <=> query_embedding) as similarity
//     from document_chunks
//     where chat_id = match_chat_id
//     order by embedding <=> query_embedding
//     limit match_count;
//   $$;

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily constructed so `next build` can statically analyze this module
// without the env vars being set — they're only required at request time.
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIMENSIONS = 768; // must match the `vector(768)` column above

export interface Chunk {
  content: string;
  index: number;
}

/**
 * Splits raw text into overlapping chunks so context isn't lost at chunk
 * boundaries. ~500 tokens per chunk (~2000 chars) with ~15% overlap is a
 * reasonable default for prose/PDF content.
 */
export function chunkText(
  text: string,
  chunkSize = 2000,
  overlap = 300
): Chunk[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push({ content: clean.slice(start, end), index });
    index += 1;
    if (end === clean.length) break;
    start = end - overlap; // step back to create overlap
  }

  return chunks;
}

/**
 * Embeds a single piece of text. Returns a 768-dim vector.
 *
 * Called directly via REST rather than the @google/generative-ai SDK:
 * that SDK's embedContent() doesn't expose `outputDimensionality`, and we
 * need it pinned to 768 to match the Supabase column.
 */
async function embed(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBED_DIMENSIONS,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.embedding.values as number[];
}

/**
 * Embeds every chunk and stores it in Supabase, tagged with chatId so
 * retrieval only ever searches documents uploaded in that conversation.
 * Runs embeddings in small batches to stay under free-tier rate limits.
 */
export async function ingestDocument(chatId: string, text: string) {
  const chunks = chunkText(text);
  const BATCH = 5;

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await Promise.all(batch.map((c) => embed(c.content)));

    const rows = batch.map((c, j) => ({
      chat_id: chatId,
      content: c.content,
      embedding: embeddings[j],
    }));

    const { error } = await getSupabase().from("document_chunks").insert(rows);
    if (error) throw new Error(`Failed to store chunks: ${error.message}`);

    // Small delay to respect free-tier requests-per-minute limits.
    if (i + BATCH < chunks.length) await new Promise((r) => setTimeout(r, 300));
  }

  return { chunksStored: chunks.length };
}

export interface RetrievedChunk {
  content: string;
  similarity: number;
}

/**
 * Embeds the user's query and retrieves the top-K most similar chunks
 * for this chat. Returns [] if no documents were ever uploaded for this
 * chat (so plain-chat conversations pay zero RAG cost).
 */
export async function retrieveContext(
  chatId: string,
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embed(query);

  const { data, error } = await getSupabase().rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_chat_id: chatId,
    match_count: topK,
  });

  if (error) {
    console.error("retrieveContext error:", error.message);
    return [];
  }

  // Filter out weak matches — better to answer with no context than
  // with irrelevant context that confuses the model.
  return (data ?? []).filter((r: RetrievedChunk) => r.similarity > 0.7);
}

/** Formats retrieved chunks into a context block for the system prompt. */
export function formatContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  const numbered = chunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join("\n\n");

  return `Relevant excerpts from the user's uploaded document. Cite them as [1], [2], etc. when you use them. If they don't answer the question, say so instead of guessing:\n\n${numbered}`;
}