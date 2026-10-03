"use client";

import type { ChatSummary } from "@/lib/supabase";

interface Props {
  chats: ChatSummary[];
  activeChatId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({ chats, activeChatId, onSelect, onNewChat }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-panel sm:flex">
      <div className="flex items-center gap-2 border-b border-line px-4 py-4">
        <span className="h-2 w-2 rounded-full bg-signal pulse-dot" />
        <span className="font-mono text-[11px] tracking-wide text-muted">
          ai-chat-ui
        </span>
      </div>

      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full rounded border border-line bg-panel-raised px-3 py-2 text-left text-sm text-ink transition-colors hover:border-signal"
        >
          + New chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 && (
          <p className="px-2 py-4 text-xs text-muted">
            Your conversations will show up here.
          </p>
        )}
        {chats.map((chat) => {
          const active = chat.id === activeChatId;
          return (
            <button
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className={[
                "mb-1 block w-full truncate border-l-2 px-3 py-2 text-left text-sm transition-colors",
                active
                  ? "border-signal bg-panel-raised text-ink"
                  : "border-transparent text-muted hover:border-line hover:text-ink",
              ].join(" ")}
              title={chat.title}
            >
              {chat.title || "New chat"}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
