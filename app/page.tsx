"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import type { ChatSummary } from "@/lib/supabase";

const STORAGE_KEY = "ai-chat-ui:activeChatId";

export default function Page() {
  const [chatId, setChatId] = useState<string>("");
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [initialMessages, setInitialMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);

  const refreshChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      const data = await res.json();
      setChats(data.chats ?? []);
    } catch {
      // Sidebar history is a nice-to-have — a fetch failure shouldn't block chat.
    }
  }, []);

  // On first load: restore the last active chat, or start a new one.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    setChatId(stored ?? uuidv4());
    refreshChats();
  }, [refreshChats]);

  // Whenever the active chat changes, persist it and load its history.
  useEffect(() => {
    if (!chatId) return;
    localStorage.setItem(STORAGE_KEY, chatId);

    (async () => {
      try {
        const res = await fetch(`/api/chats/${chatId}`);
        const data = await res.json();
        const msgs = (data.messages ?? []).map((m: any, i: number) => ({
          id: `${chatId}-${i}`,
          role: m.role,
          content: m.content,
        }));
        setInitialMessages(msgs);
      } catch {
        setInitialMessages([]);
      }
    })();
  }, [chatId]);

  function handleNewChat() {
    setChatId(uuidv4());
  }

  return (
    <main className="flex h-screen bg-base">
      <Sidebar
        chats={chats}
        activeChatId={chatId}
        onSelect={setChatId}
        onNewChat={handleNewChat}
      />
      {chatId && (
        <ChatWindow
          key={chatId}
          chatId={chatId}
          initialMessages={initialMessages}
          onMessageSent={refreshChats}
        />
      )}
    </main>
  );
}
