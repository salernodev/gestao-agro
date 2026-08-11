// Deploy manual via painel do Supabase (Edge Functions → Functions →
// google-calendar-mirror → Code). Este arquivo é a cópia de referência
// versionada — editar aqui não redeploya sozinho.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tokenRow } = await supabaseAdmin
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow) {
    return new Response(JSON.stringify({ error: "not_connected" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return new Response(JSON.stringify({ error: "Falha ao renovar token do Google" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = tokenData.access_token;
  const body = await req.json();
  const { cliente_nome, data_hora, texto, google_event_id, deleted } = body;

  const calendarHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (deleted) {
    if (google_event_id) {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`, {
        method: "DELETE",
        headers: calendarHeaders,
      });
    }
    return new Response(JSON.stringify({ google_event_id: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const inicio = new Date(data_hora);
  const fim = new Date(inicio.getTime() + 30 * 60 * 1000);

  const evento = {
    summary: texto,
    description: cliente_nome ? `Cliente: ${cliente_nome}` : undefined,
    start: { dateTime: inicio.toISOString() },
    end: { dateTime: fim.toISOString() },
  };

  const calendarUrl = google_event_id
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`
    : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  const calendarResponse = await fetch(calendarUrl, {
    method: google_event_id ? "PATCH" : "POST",
    headers: calendarHeaders,
    body: JSON.stringify(evento),
  });

  const calendarData = await calendarResponse.json();

  if (!calendarResponse.ok) {
    return new Response(JSON.stringify({ error: calendarData }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ google_event_id: calendarData.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
