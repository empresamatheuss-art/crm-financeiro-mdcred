import { corsHeaders } from "../_shared/cors.ts";

interface ExportPayload {
  title?: string;
  filename?: string;
  kind?: "csv" | "excel" | "json";
  columns?: string[];
  rows?: Array<Array<string | number>>;
}

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

  const payload = await req.json() as ExportPayload;
  const columns = payload.columns ?? [];
  const rows = payload.rows ?? [];
  const kind = payload.kind ?? "csv";

  if (kind === "json") {
    return new Response(JSON.stringify({ title: payload.title, filename: payload.filename, columns, rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const separator = kind === "excel" ? "\t" : ";";
  const content = [columns.join(separator), ...rows.map((row) => row.join(separator))].join("\n");

  return new Response(JSON.stringify({
    filename: `${payload.filename ?? "relatorio"}.${kind === "excel" ? "xls" : "csv"}`,
    content,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
