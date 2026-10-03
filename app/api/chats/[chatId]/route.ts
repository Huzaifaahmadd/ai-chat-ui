// app/api/chats/[chatId]/route.ts
// GET: return every message for one chat, oldest first — used to hydrate
// useChat's initialMessages when the sidebar switches to an older chat.

import { getMessages } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  _req: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const messages = await getMessages(params.chatId);
    return Response.json({ messages });
  } catch (err) {
    console.error(err);
    return Response.json({ messages: [] }, { status: 200 });
  }
}