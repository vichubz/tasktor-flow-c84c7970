import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente que extrai dados estruturados de tasks a partir de linguagem natural.

REGRAS:
- Sempre responda chamando a tool "create_tasks" (plural!)
- O usuário pode solicitar UMA ou MÚLTIPLAS tasks de uma vez. Identifique todas.
- Extraia título, descrição, subtasks, dificuldade e nome do projeto para CADA task
- Se o usuário mencionar subtasks (ex: "com subtasks: X, Y, Z" ou listar itens), extraia-as
- Se o usuário não mencionar subtasks mas a task for complexa, sugira subtasks relevantes
- Dificuldade: 0 (sem nível), 1 (fácil), 2 (médio), 3 (difícil) — infira pelo contexto
- Para project_name: analise a lista de projetos disponíveis e escolha o mais adequado
- Se nenhum projeto combinar, retorne null para project_name
- IMPORTANTE: o nome do projeto pode estar escrito de forma diferente (abreviado, com erro de digitação). Faça fuzzy matching inteligente
- Título deve ser conciso e claro
- Descrição pode ser null se não houver detalhes extras
- Idioma: mantenha o mesmo idioma do input do usuário
- Se o usuário listar vários itens (ex: "criar task A, task B e task C"), crie uma task para CADA item`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { prompt, audio_base64, audio_media_type, projects } = await req.json();

    if ((!prompt || !prompt.trim()) && !audio_base64) {
      return new Response(
        JSON.stringify({ success: false, error: "Prompt vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectList = Array.isArray(projects) ? projects : [];
    const projectNames = projectList.map((p: { name: string }) => p.name).join(", ");

    // Build content blocks
    const contentBlocks: any[] = [];
    
    if (audio_base64) {
      contentBlocks.push({
        type: "input_audio",
        source: {
          type: "base64",
          media_type: audio_media_type || "audio/webm",
          data: audio_base64,
        },
      });
      contentBlocks.push({
        type: "text",
        text: `Projetos disponíveis: [${projectNames || "nenhum"}]\n\nO usuário enviou um áudio. Transcreva e interprete o que ele disse para criar as tasks.`,
      });
    } else {
      contentBlocks.push({
        type: "text",
        text: `Projetos disponíveis: [${projectNames || "nenhum"}]\n\nSolicitação do usuário:\n${prompt}`,
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: "create_tasks",
            description: "Cria uma ou mais tasks estruturadas a partir do input do usuário",
            input_schema: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Título conciso da task" },
                      description: { type: "string", description: "Descrição detalhada (opcional)" },
                      difficulty: { type: "integer", minimum: 0, maximum: 3, description: "0=sem nível, 1=fácil, 2=médio, 3=difícil" },
                      project_name: { type: "string", description: "Nome do projeto mais adequado da lista, ou null" },
                      subtasks: { type: "array", items: { type: "string" }, description: "Lista de subtasks" },
                    },
                    required: ["title"],
                  },
                  description: "Lista de tasks a serem criadas",
                },
              },
              required: ["tasks"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "create_tasks" },
        messages: [{ role: "user", content: contentBlocks }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const toolUse = data.content?.find((block: any) => block.type === "tool_use");
    if (!toolUse || !toolUse.input || !Array.isArray(toolUse.input.tasks)) {
      return new Response(
        JSON.stringify({ success: false, error: "IA não retornou dados estruturados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fuzzy match helper
    const fuzzyMatchProject = (projectName: string | null): string | null => {
      if (!projectName || projectList.length === 0) return null;
      const searchName = projectName.toLowerCase().trim();

      let match = projectList.find((p: any) => p.name.toLowerCase() === searchName);
      if (!match) {
        match = projectList.find((p: any) =>
          p.name.toLowerCase().includes(searchName) || searchName.includes(p.name.toLowerCase())
        );
      }
      if (!match) {
        let bestScore = 0;
        for (const p of projectList) {
          const pName = p.name.toLowerCase();
          let score = 0;
          const shorter = searchName.length < pName.length ? searchName : pName;
          const longer = searchName.length < pName.length ? pName : searchName;
          for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) score++;
          }
          const ratio = score / longer.length;
          if (ratio > 0.6 && ratio > bestScore) {
            bestScore = ratio;
            match = p;
          }
        }
      }
      return match ? match.id : null;
    };

    const tasks = toolUse.input.tasks.map((t: any) => ({
      title: t.title || "Nova Task",
      description: t.description || null,
      difficulty: typeof t.difficulty === "number" ? Math.min(3, Math.max(0, t.difficulty)) : 0,
      project_id: fuzzyMatchProject(t.project_name),
      project_name: t.project_name || null,
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    }));

    return new Response(
      JSON.stringify({ success: true, tasks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-task-creator error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
