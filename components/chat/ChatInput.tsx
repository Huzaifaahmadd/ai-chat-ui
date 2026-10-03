"use client";

import { useRef, useState } from "react";

interface Props {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

export function ChatInput({ input, onInputChange, onSubmit, onUpload, isLoading }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) onSubmit();
    }
  }

  return (
    <div className="border-t border-line bg-panel p-3">
      {uploading && (
        <p className="mb-2 font-mono text-[11px] text-wire">
          reading document…
        </p>
      )}
      <div className="flex items-end gap-2 rounded-md border border-line bg-base px-3 py-2 focus-within:border-signal">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Upload a PDF or text file for this chat"
          className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-panel-raised hover:text-ink"
        >
          +
        </button>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, or upload a document to chat with it…"
          rows={1}
          className="max-h-32 flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !input.trim()}
          className="shrink-0 rounded bg-signal px-3 py-1.5 text-sm font-medium text-base transition-opacity disabled:opacity-30"
        >
          Send
        </button>
      </div>
    </div>
  );
}
