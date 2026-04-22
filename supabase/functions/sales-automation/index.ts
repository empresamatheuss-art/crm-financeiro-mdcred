import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));

  return new Response(JSON.stringify({
    status: "queued",
    message: "Fluxo de automação recebido com sucesso.",
    receivedAt: new Date().toISOString(),
    payload: body,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
