// lib/supabase.ts
// Chat history persistence. Two tables, created once in the Supabase SQL
// editor (see SETUP.md):
//
//   create table chats (
//     id text primary key,
//     title text not null default 'New chat',
//     created_at timestamptz default now()
//   );
//
//   create table messages (
//     id bigint generated always as identity primary key,
//     chat_id text not null references chats(id) on delete cascade,
//     role text not null,
//     content text not null,
//     created_at timestamptz default now()
//   );

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily constructed so `next build` can statically analyze this module
// (and any route that imports it) without SUPABASE_URL / KEY being set —
// they're only required once a request actually runs.
//
// IMPORTANT: Next.js's dev server (and some deployments) transparently
// caches fetch() calls to disk, including ones made internally by
// third-party libraries like this one — unless each request explicitly
// opts out. Without this, a cached empty/stale result can get "stuck"
// and keep being served across restarts even after the database changes.
// Passing a custom fetch here forces every Supabase request to bypass
// that cache.
let _supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (url, options) =>
            fetch(url, { ...options, cache: "no-store" }),
        },
      }
    );
  }
  return _supabase;
}

export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

/** Lists every chat, most recent first, for the sidebar. */
export async function listChats(): Promise<ChatSummary[]> {
  const { data, error } = await getSupabase()
    .from("chats")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listChats failed: ${error.message}`);
  return data ?? [];
}

/**
 * Ensures a chat row exists. Called the first time a message is saved for
 * a given chatId — title defaults to a trimmed slice of the first user
 * message so the sidebar has something readable.
 */
export async function ensureChat(chatId: string, firstMessage: string) {
  const title =
    firstMessage.length > 60 ? `${firstMessage.slice(0, 60)}…` : firstMessage;

  const { error } = await getSupabase()
    .from("chats")
    .upsert({ id: chatId, title }, { onConflict: "id", ignoreDuplicates: true });

  if (error) throw new Error(`ensureChat failed: ${error.message}`);
}

/** Returns every message for a chat, oldest first, to hydrate useChat. */
export async function getMessages(chatId: string): Promise<StoredMessage[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("id", { ascending: true });

  if (error) throw new Error(`getMessages failed: ${error.message}`);
  return (data ?? []) as StoredMessage[];
}

/** Appends one message to a chat's history. */
export async function saveMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string
) {
  if (!content.trim()) return; // nothing to persist (e.g. tool-only turn)
  const { error } = await getSupabase()
    .from("messages")
    .insert({ chat_id: chatId, role, content });

  if (error) throw new Error(`saveMessage failed: ${error.message}`);
}