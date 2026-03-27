

## AI Smart Task Creator — Plano Completo Revisado

### Resumo

Dialog premium com input de texto e audio. O audio é gravado no browser via MediaRecorder (formato webm/opus), enviado como base64 para a edge function, que usa a **API do Claude** (que aceita audio nativo) para transcrever E interpretar tudo de uma vez. Claude recebe o audio ou texto + lista de projetos e retorna titulo, descricao, subtasks, dificuldade e projeto sugerido com fuzzy matching. Preview editavel antes de confirmar.

### Fluxo

```text
[Botao 🔥 animado] ou [Ctrl+I]
  → Dialog abre (scale+fade)

MODO TEXTO:
  → Digita prompt → Ctrl+Enter ou clica "Gerar"

MODO AUDIO:
  → Clica microfone (pulsa vermelho enquanto grava)
  → Fala naturalmente
  → Clica para parar → audio base64 enviado ao Claude
  → Claude transcreve + interpreta de uma vez

PROCESSAMENTO:
  → Skeleton shimmer animado
  → Claude extrai: titulo, descricao, subtasks[], difficulty, project_name
  → Edge function faz fuzzy match do project_name com projetos existentes
  → Se nenhum match forte → project_id: null (sem projeto)

PREVIEW EDITAVEL (stagger animation):
  → Titulo (input)
  → Descricao (textarea)
  → Projeto (select, pre-selecionado)
  → Dificuldade (select 0-3)
  → Subtasks (lista editavel, +/- botoes)
  → "Voltar" ou "Criar Task"
  → Confirma → insere task + subtasks → toast sucesso
```

### Arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/ai-task-creator/index.ts` | **Criar** — edge function com Claude API (texto e audio) |
| `src/components/dashboard/SmartTaskDialog.tsx` | **Criar** — dialog com input texto/audio + preview editavel |
| `src/pages/Dashboard.tsx` | **Editar** — botao Flame animado + atalho Ctrl+I |

### Detalhes tecnicos

**Edge Function `ai-task-creator`**
- Usa `ANTHROPIC_API_KEY` ja existente, modelo `claude-sonnet-4-20250514`
- CORS e JWT identicos ao `process-transcription`
- Recebe: `{ prompt?: string, audio_base64?: string, audio_media_type?: string, projects: {id, name}[] }`
- Se `audio_base64` presente, envia como content block `type: "audio"` na API do Claude (suporte nativo a audio), que transcreve e interpreta num unico request
- Se `prompt` presente, envia como texto normal
- Tool calling com schema:
  ```json
  {
    "name": "create_task",
    "input_schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "description": { "type": "string" },
        "difficulty": { "type": "integer", "minimum": 0, "maximum": 3 },
        "project_name": { "type": "string", "description": "Nome do projeto mais adequado ou null" },
        "subtasks": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["title"]
    }
  }
  ```
- Fuzzy matching no edge function: compara `project_name` com lista usando `toLowerCase().includes()` + similaridade basica. Se nenhum match, retorna `project_id: null`
- System prompt instrui Claude a: analisar projetos disponiveis, identificar subtasks, inferir dificuldade, sempre responder em PT-BR

**SmartTaskDialog**
- **Textarea**: placeholder inspiracional, Ctrl+Enter envia
- **Botao microfone**: usa `MediaRecorder` API para gravar audio em webm/opus. Ao parar, converte blob para base64 e envia direto para a edge function (sem Web Speech API)
- **Animacao mic**: pulso vermelho + icone Mic/Square alternando, waveform visual simples
- **Loading**: skeleton shimmer nos campos do preview
- **Preview**: campos com framer-motion stagger (`initial={{ opacity: 0, y: 10 }}`)
- **Subtasks**: lista com botao + para adicionar, X para remover, inputs editaveis
- **Criar task**: calcula position (max+1), insere task via supabase, depois insere subtasks em batch
- **Icone**: `Flame` do lucide com glow pulsante CSS
- **Fallback**: se MediaRecorder nao disponivel, esconde botao mic
- **Erros**: toast amigavel se IA falha, volta ao textarea

**Dashboard**
- Botao Flame ao lado de "Nova Task" com animacao de glow
- Atalho `Ctrl+I` / `Cmd+I` no mesmo useEffect de keyboard existente
- Passa `projects` e `fetchData` como props

### Pontos de atencao
- Claude suporta audio nativo (webm, mp3, wav, etc) — sem necessidade de servico de transcricao separado
- Audio max ~25MB por request no Claude — suficiente para prompts de voz curtos
- JWT validado antes de qualquer processamento
- Input validation: pelo menos `prompt` ou `audio_base64` deve estar presente

