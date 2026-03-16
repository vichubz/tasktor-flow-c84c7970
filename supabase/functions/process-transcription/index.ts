import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente executivo especializado em processar transcrições de reuniões e gerar resumos executivos objetivos e profissionais.

REGRAS:
- Idioma: Português (Brasil)
- Sem emojis, sem links, sem timestamps
- Estilo: objetivo, profissional e limpo
- Formatação Markdown com hierarquia clara
- Identificar temas, projetos e responsáveis com base no conteúdo
- Converter prazos relativos ("sexta", "semana que vem") para datas quando possível
- Sempre atribuir responsáveis e prazos quando identificáveis. Se não for possível, marcar como "A definir"

ESTRUTURA OBRIGATÓRIA DO RESULTADO:

Gere EXATAMENTE estas duas seções, nada mais:

---

# RESUMO EXECUTIVO DA REUNIÃO

---

## Informações Gerais

**Reunião:** [Título inferido do conteúdo ou informado pelo contexto]
**Data:** [Data se informada, senão "Não informada"]
**Participantes:** [Nomes identificados na transcrição]

---

## Sumário

[Parágrafo curto e direto — máximo 4 linhas — com o contexto geral, as decisões centrais e o direcionamento definido na reunião.]

---

## Projetos e Decisões

Separar por projeto quando houver mais de um.

### Projeto: [Nome]

- **Pontos principais:** [Resumo dos temas discutidos]
- **Decisões:** [O que foi decidido]
- **Prazos imediatos:** [Entregas e datas]

---

## Próximos Passos

| Tarefa | Responsável | Prazo |
|---|---|---|
| [Descrição da tarefa] | [Nome] | [Data ou "A definir"] |

---

## Pendências e Alertas

- [Pendência, risco ou alerta relevante]
- [Pendência, risco ou alerta relevante]

---
---

# MENSAGEM DE FOLLOW-UP PARA A EQUIPE

[Texto pronto, objetivo e profissional que o usuário pode copiar e enviar diretamente aos participantes via WhatsApp, Slack ou email. O texto deve resumir as decisões tomadas, os próximos passos combinados e qualquer alerta importante. Tom: direto, cordial e profissional. Não usar saudação genérica tipo "Prezados" — começar direto com "Pessoal," ou "Time,". Manter curto — máximo 15 linhas.]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transcription, context } = await req.json();

    if (!transcription || !transcription.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Transcrição vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user message
    let userMessage = "";
    if (context?.client) userMessage += `Cliente/Projeto: ${context.client}\n`;
    if (context?.date) userMessage += `Data da reunião: ${context.date}\n`;
    if (context?.participants) userMessage += `Participantes: ${context.participants}\n`;
    if (context?.objective) userMessage += `Objetivo: ${context.objective}\n`;
    if (userMessage) userMessage += "\n---\n\n";
    userMessage += `TRANSCRIÇÃO DA REUNIÃO:\n\n${transcription}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao processar transcrição" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || "";

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-transcription error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
