// app/api/upload/route.ts
// Handles document upload for RAG. Accepts a PDF or plain text file,
// extracts its text, and hands it to lib/rag.ts for chunking + embedding.

import { ingestDocument } from "@/lib/rag";
// pdf-parse is free and runs entirely server-side, no API key needed.
import pdfParse from "pdf-parse";

export const runtime = "nodejs"; // pdf-parse needs Node APIs, not edge

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const chatId = formData.get("chatId") as string | null;

  if (!file || !chatId) {
    return Response.json({ error: "file and chatId are required" }, { status: 400 });
  }

  // Guardrails: free-tier embedding calls aren't free of rate limits,
  // so cap file size to keep chunk counts sane for a portfolio demo.
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;

  try {
    if (file.type === "application/pdf") {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else {
      text = buffer.toString("utf-8");
    }
  } catch (err) {
    return Response.json({ error: "Could not read file" }, { status: 422 });
  }

  if (!text.trim()) {
    return Response.json({ error: "File contains no extractable text" }, { status: 422 });
  }

  const { chunksStored } = await ingestDocument(chatId, text);

  return Response.json({ ok: true, chunksStored });
}
