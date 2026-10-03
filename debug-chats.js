// One-off diagnostic script — not part of the app.
// Run with: node debug-chats.js
// Reads .env.local manually and queries the chats table the same way
// lib/supabase.ts does, printing everything so nothing is hidden.

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, ".env.local");
console.log("Looking for env file at:", envPath);
console.log("File exists:", fs.existsSync(envPath));

const raw = fs.readFileSync(envPath, "utf8");
console.log("\n--- RAW FILE CONTENT (JSON-escaped, so hidden characters show up) ---");
console.log(JSON.stringify(raw));
console.log("--- END RAW CONTENT ---\n");

const env = {};
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] = match[2].trim();
}

console.log("Parsed keys found:", Object.keys(env));
console.log("SUPABASE_URL:", env.SUPABASE_URL);
console.log(
  "SUPABASE_SERVICE_ROLE_KEY (first 20 chars):",
  env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)
);

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("\nStopping here — one or both values are missing above.");
  process.exit(1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

supabase
  .from("chats")
  .select("id, title, created_at")
  .order("created_at", { ascending: false })
  .then(({ data, error, status, statusText }) => {
    console.log("\n--- QUERY RESULT ---");
    console.log("status:", status, statusText);
    console.log("error:", JSON.stringify(error, null, 2));
    console.log("data:", JSON.stringify(data, null, 2));
  });
