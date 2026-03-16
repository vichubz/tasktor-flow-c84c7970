

## Plano de Correções e Melhorias

### Problemas Identificados

1. **Bug de exclusão**: O card inteiro está envolvido em `dragHandleProps` (linha 299 do Dashboard), fazendo com que qualquer clique no card ative o cursor de arrastar. O botão de excluir e outros botões ficam inacessíveis porque o drag intercepta o evento.

2. **Bug ao restaurar tarefa concluída**: A função `handleUncomplete` no `CompletedTasks` não notifica o Dashboard para re-fetch — a tarefa some da lista de concluídas mas não aparece na lista ativa sem refresh.

3. **Sidebar na Home**: O `HomeBackground` usa `position: fixed` que cobre a sidebar. O fundo precisa de ajuste para coexistir com o layout.

4. **Background da Home**: Precisa de mais movimento e efeito parallax.

5. **Sidebar mais suave**: Design atual é funcional mas pode ser mais refinado.

6. **Atalho Cmd+K → N**: Trocar para tecla N abrindo o inline creator (não o modal).

7. **Cifrões em vez de confetti**: Substituir partículas de confetti por cifrões ($) aparecendo na tela toda.

---

### Alterações Planejadas

#### 1. Corrigir Drag vs Click (Dashboard.tsx + TaskCard.tsx)

- Mover `dragHandleProps` do wrapper do card para APENAS o ícone `GripVertical` dentro do TaskCard
- Passar `dragHandleProps` como prop para o TaskCard
- Isso libera cliques em botões (excluir, completar, expandir) sem conflito com drag

```text
Antes:  <div {...provided.dragHandleProps}> ← card inteiro é drag handle
          <TaskCard ... />
        </div>

Depois: <div>
          <TaskCard dragHandleProps={provided.dragHandleProps} ... />
            └─ GripVertical recebe dragHandleProps ← só o ícone é drag handle
        </div>
```

#### 2. Corrigir Restauração de Tarefas (CompletedTasks.tsx)

- Adicionar prop `onTaskRestored` que chama `fetchData` no Dashboard
- Quando `handleUncomplete` for bem-sucedido, chamar essa callback para atualizar a lista ativa

#### 3. Ajustar Background da Home (HomeBackground.tsx)

- Mudar de `position: fixed` para `position: absolute` dentro do container da HomePage
- Adicionar efeito parallax sutil nos orbs: usar `onMouseMove` para deslocar camadas com velocidades diferentes
- Aumentar velocidades de animação das auroras e adicionar mais drift nos orbs

#### 4. Sidebar mais suave (AppSidebar.tsx)

- Reduzir opacidade dos elementos
- Suavizar bordas e transições
- Tipografia mais leve
- Hover states mais sutis

#### 5. Atalho N → Inline Creator (Dashboard.tsx + InlineTaskCreator.tsx)

- Remover handler de Cmd+K
- Tecla N (quando não em input) abre o inline creator em vez do modal
- Remover badge `⌘K` do placeholder, mostrar `N` no lugar
- Remover a tecla N do modal

#### 6. Cifrões em vez de Confetti (ConfettiExplosion.tsx)

- Substituir partículas coloridas por caracteres "$" renderizados como texto
- Tamanhos variados (16px–40px)
- Cores: dourado (#FFD700), verde (#10b981), cyan, branco
- Mesma física de explosão mas com cifrões girando e caindo
- Fullscreen via portal como já está

#### 7. Dashboard.tsx — Integração

- Passar `dragHandleProps` para TaskCard
- Conectar `CompletedTasks` com callback de refresh
- Atualizar atalhos de teclado

---

### Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard.tsx` | Separar dragHandleProps, atalho N→inline, callback para CompletedTasks |
| `src/components/dashboard/TaskCard.tsx` | Receber dragHandleProps, aplicar só no GripVertical |
| `src/components/dashboard/CompletedTasks.tsx` | Prop onTaskRestored, chamar ao desconcluir |
| `src/components/dashboard/ConfettiExplosion.tsx` | Cifrões ($) em vez de partículas coloridas |
| `src/components/dashboard/InlineTaskCreator.tsx` | Badge N em vez de ⌘K |
| `src/components/home/HomeBackground.tsx` | position absolute, parallax mouse, mais movimento |
| `src/components/layout/AppSidebar.tsx` | Design mais suave e refinado |

