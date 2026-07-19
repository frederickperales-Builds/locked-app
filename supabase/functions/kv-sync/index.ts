
// Locked (workout app) — kv-sync Edge Function
//
// This is the ONLY thing allowed to read/write the kv_store table.
// It checks the PIN on every request before touching the database, using
// the service_role key which never leaves the server. The browser never
// talks to Supabase directly.
//
// Deploy with: supabase functions deploy kv-sync
// Set secrets with:
//   supabase secrets set APP_PIN=your-pin-here
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase)
 
import { createClient } from "npm:@supabase/supabase-js@2";
 
const APP_PIN = Deno.env.get("APP_PIN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
 
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
 
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
 
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
 
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
 
  const { pin, action, key, value } = body ?? {};
 
  if (!APP_PIN || pin !== APP_PIN) {
    // Deliberately vague error -- don't reveal whether the PIN was close.
    return json({ error: "Unauthorized" }, 401);
  }
 
  try {
    if (action === "get-all") {
      const { data, error } = await supabase.from("kv_store").select("key, value");
      if (error) throw error;
      const result: Record<string, unknown> = {};
      for (const row of data ?? []) result[row.key] = row.value;
      return json({ data: result });
    }
 
    if (action === "set") {
      if (typeof key !== "string" || !key) return json({ error: "Missing key" }, 400);
      const { error } = await supabase
        .from("kv_store")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
      return json({ ok: true });
    }
 
    if (action === "get") {
      if (typeof key !== "string" || !key) return json({ error: "Missing key" }, 400);
      const { data, error } = await supabase
        .from("kv_store")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return json({ data: data?.value ?? null });
    }
 
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
});
 