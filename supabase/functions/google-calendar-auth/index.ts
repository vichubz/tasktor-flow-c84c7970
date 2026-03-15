import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const url = new URL(req.url);
    const authHeader = req.headers.get("Authorization");

    // Handle callback (GET with code parameter)
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (code && state) {
      // Exchange code for tokens
      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
      }

      // Parse user_id and origin from state
      const stateData = JSON.parse(atob(state));
      const userId = stateData.user_id;
      const origin = stateData.origin || "";

      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      });

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Upsert token
      const { error } = await supabase.from("google_tokens").upsert(
        {
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || "",
          expires_at: expiresAt,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        throw new Error(`Failed to save tokens: ${error.message}`);
      }

      // Redirect back to the app
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${origin}/dashboard?calendar=connected`,
        },
      });
    }

    // Generate auth URL (POST request from frontend)
    if (req.method === "POST") {
      const body = await req.json();
      const { user_id, origin } = body;

      if (!user_id) {
        throw new Error("user_id is required");
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth`;
      const stateData = btoa(JSON.stringify({ user_id, origin }));

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", stateData);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
