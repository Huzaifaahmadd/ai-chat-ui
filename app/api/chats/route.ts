// app/api/chats/route.ts
// GET: list every chat, newest first, for the sidebar.

import { listChats } from "@/lib/supabase";

export const runtime = "nodejs";
// Always reflects live DB state — never statically prerendered.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store"; // belt-and-suspenders alongside the fetch override in lib/supabase.ts

export async function GET() {
  try {
    const chats = await listChats();
    return Response.json({ chats });
  } catch (err) {
    console.error(err);
    return Response.json({ chats: [] }, { status: 200 }); // fail soft — sidebar just shows empty
  }
}