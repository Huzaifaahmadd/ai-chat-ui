"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface Props {
  chatId: string;
  initialMessages: { id: string; role: "user" | "assistant"; content: string }[];
  onMessageSent: () => void;
}

export function ChatWindow({ chatId, initialMessages, onMessageSent }: Props) {
  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    id: chatId,
    initialMessages,
    body: { chatId },
    onFinish: onMessageSent,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Upload failed" }));
      alert(error ?? "Upload failed");
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-base">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-[11px] tracking-wide text-muted">
          intent router — RAG · tools · generative UI
        </span>
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            isLoading ? "bg-signal pulse-dot" : "bg-line",
          ].join(" ")}
          title={isLoading ? "routing…" : "idle"}
        />
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="grid-field flex h-full items-center justify-center rounded-md">
            <div className="max-w-sm rounded-md border border-line bg-panel px-6 py-5 text-center text-sm text-muted">
              Ask a question, upload a document to chat with it, or try{" "}
              <span className="text-ink">
                &ldquo;compare the iPhone 16 and Pixel 9&rdquo;
              </span>{" "}
              to see the router pick a tool.
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role as "user" | "assistant"}
            content={m.content}
            toolInvocations={(m as any).toolInvocations}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={() => handleSubmit()}
        onUpload={handleUpload}
        isLoading={isLoading}
      />
    </div>
  );
}
