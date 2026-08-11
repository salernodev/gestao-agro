// Deploy manual via painel do Supabase (Edge Functions → Functions →
// google-oauth-callback → Code). Este arquivo é a cópia de referência
// versionada — editar aqui não redeploya sozinho.
//
// Chamada diretamente pelo Google (redirect do navegador, sem header de
// autenticação) — por isso a verificação de JWT precisa estar DESLIGADA
// nas configurações desta função no painel do Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const APP_URL = Deno.env.get("APP_URL")!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return Response.redirect(`${APP_URL}/#lembretes?google=erro`, 302);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: stateRow } = await supabaseAdmin
    .from("google_oauth_state")
    .select("user_id")
    .eq("state", state)
    .single();

  if (!stateRow) {
    return Response.redirect(`${APP_URL}/#lembretes?google=erro`, 302);
  }

  await supabaseAdmin.from("google_oauth_state").delete().eq("state", state);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || !tokenData.refresh_token) {
    console.error("Falha ao trocar código por token:", tokenData);
    return Response.redirect(`${APP_URL}/#lembretes?google=erro`, 302);
  }

  await supabaseAdmin.from("google_tokens").upsert({
    user_id: stateRow.user_id,
    refresh_token: tokenData.refresh_token,
    updated_at: new Date().toISOString(),
  });

  return Response.redirect(`${APP_URL}/#lembretes?google=conectado`, 302);
});
