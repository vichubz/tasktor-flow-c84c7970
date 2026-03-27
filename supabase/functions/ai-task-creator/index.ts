import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente que extrai dados estruturados de tasks a partir de linguagem natural.

REGRAS:
- Sempre responda chamando a tool "create_task"
- Extraia título, descrição, subtasks, dificuldade e nome do projeto
- Se o usuário mencionar subtasks (ex: "com subtasks: X, Y, Z" ou listar itens), extraia-as
- Se o usuário não mencionar subtasks mas a task for complexa, sugira subtasks relevantes
- Dificuldade: 0 (sem nível), 1 (fácil), 2 (médio), 3 (difícil) — infira pelo contexto
- Para project_name: analise a lista de projetos disponíveis e escolha o mais adequado
- Se nenhum projeto combinar, retorne null para project_name
- IMPORTANTE: o nome do projeto pode estar escrito de forma diferente (abreviado, com erro de digitação). Faça fuzzy matching inteligente
- Título deve ser conciso e claro
- Descrição pode ser null se não houver detalhes extras
- Idioma: mantenha o mesmo idioma do input do usuário`;

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

    const { prompt, projects } = await req.json();

    if (!prompt || !prompt.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Prompt vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectList = Array.isArray(projects) ? projects : [];
    const projectNames = projectList.map((p: { name: string }) => p.name).join(", ");

    const userMessage = `Projetos disponíveis: [${projectNames || "nenhum"}]\n\nSolicitação do usuário:\n${prompt}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [
          {
            name: "create_task",
            description: "Cria uma task estruturada a partir do input do usuário",
            input_schema: {
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
          },
        ],
        tool_choice: { type: "tool", name: "create_task" },
        messages: [{ role: "user", content: userMessage }],
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

    // Extract tool use result
    const toolUse = data.content?.find((block: any) => block.type === "tool_use");
    if (!toolUse || !toolUse.input) {
      return new Response(
        JSON.stringify({ success: false, error: "IA não retornou dados estruturados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = toolUse.input;

    // Fuzzy match project_name to actual project
    let project_id: string | null = null;
    if (result.project_name && projectList.length > 0) {
      const searchName = result.project_name.toLowerCase().trim();

      // Exact match first
      let match = projectList.find((p: any) => p.name.toLowerCase() === searchName);

      // Contains match
      if (!match) {
        match = projectList.find((p: any) =>
          p.name.toLowerCase().includes(searchName) || searchName.includes(p.name.toLowerCase())
        );
      }

      // Similarity match (simple character overlap)
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

      if (match) project_id = match.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        title: result.title || "Nova Task",
        description: result.description || null,
        difficulty: typeof result.difficulty === "number" ? Math.min(3, Math.max(0, result.difficulty)) : 0,
        project_id,
        project_name: result.project_name || null,
        subtasks: Array.isArray(result.subtasks) ? result.subtasks : [],
      }),
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
