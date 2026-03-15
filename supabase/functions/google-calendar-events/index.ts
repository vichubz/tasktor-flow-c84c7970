import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshToken(supabase: any, userId: string, refreshTokenValue: string) {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshTokenValue,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase.from("google_tokens").update({
    access_token: data.access_token,
    expires_at: expiresAt,
  }).eq("user_id", userId);

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Parse optional body for timezone and date range
    let timeZone = "America/Sao_Paulo";
    let targetDate: string | null = null;
    let daysAhead = 0;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.timeZone) timeZone = body.timeZone;
        if (body.date) targetDate = body.date;
        if (body.daysAhead) daysAhead = body.daysAhead;
      } catch {}
    }

    // Get tokens
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: tokenRow, error: tokenError } = await adminClient
      .from("google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ connected: false, events: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if token expired, refresh if needed
    let accessToken = tokenRow.access_token;
    if (new Date(tokenRow.expires_at) <= new Date()) {
      accessToken = await refreshToken(adminClient, user.id, tokenRow.refresh_token);
    }

    // Calculate time range using timezone-aware approach
    let timeMin: string;
    let timeMax: string;

    // Get timezone offset string for RFC3339
    const getOffsetStr = (tz: string) => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now);
      const offsetPart = parts.find(p => p.type === "timeZoneName")?.value || "GMT";
      // offsetPart is like "GMT-3" or "GMT+5:30"
      const match = offsetPart.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
      if (!match) return "Z";
      const sign = match[1] || "+";
      const hours = match[2].padStart(2, "0");
      const minutes = match[3] || "00";
      return `${sign}${hours}:${minutes}`;
    };
    const offset = getOffsetStr(timeZone);

    if (targetDate) {
      timeMin = `${targetDate}T00:00:00${offset}`;
      timeMax = `${targetDate}T23:59:59${offset}`;
    } else {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
      const todayStr = formatter.format(now);
      timeMin = `${todayStr}T00:00:00${offset}`;

      if (daysAhead > 0) {
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        const futureStr = formatter.format(futureDate);
        timeMax = `${futureStr}T23:59:59${offset}`;
      } else {
        timeMax = `${todayStr}T23:59:59${offset}`;
      }
    }

    const calendarRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: timeMin,
        timeMax: timeMax,
        timeZone: timeZone,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
      }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calendarRes.ok) {
      const errorData = await calendarRes.json();
      throw new Error(`Calendar API error [${calendarRes.status}]: ${JSON.stringify(errorData)}`);
    }

    const calendarData = await calendarRes.json();
    const events = (calendarData.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || "Sem título",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
      location: event.location || null,
      description: event.description || null,
      allDay: !event.start?.dateTime,
    }));

    return new Response(JSON.stringify({ connected: true, events }), {
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
