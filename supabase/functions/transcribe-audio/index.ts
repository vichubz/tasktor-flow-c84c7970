import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { audio_base64, media_type } = await req.json();

    if (!audio_base64) {
      return new Response(
        JSON.stringify({ success: false, error: "Áudio não enviado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um transcritor de áudio. Sua única função é transcrever o áudio do usuário em texto limpo e bem formatado.

REGRAS:
- Transcreva exatamente o que o usuário disse
- Corrija erros gramaticais óbvios e pontuação
- Mantenha o idioma original do áudio
- NÃO adicione interpretações, comentários ou formatação extra
- NÃO diga coisas como "O usuário disse:" — retorne APENAS o texto transcrito
- Se o áudio mencionar tasks, projetos, subtasks etc., mantenha tudo exatamente como dito`
          },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: audio_base64,
                  format: (media_type || "audio/webm").includes("wav") ? "wav" : "mp3",
                },
              },
              {
                type: "text",
                text: "Transcreva este áudio em texto limpo.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Limite de requisições excedido, tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Transcription API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao transcrever áudio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: "Não foi possível transcrever o áudio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
