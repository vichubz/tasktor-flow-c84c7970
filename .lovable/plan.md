

# Auditoria Completa e Otimização do Tasktor

## Bugs e Problemas Encontrados

### 1. Erro de Ref no Console (2 warnings)
- **MobileBottomNav** e **HomeBackground** estão gerando warnings: "Function components cannot be given refs". `MobileBottomNav` precisa ser wrapped com `forwardRef` ou o componente pai precisa parar de passar ref. No `HomeBackground`, os hooks `useTransform` estão sendo chamados dentro de loops (`.map()`), violando as regras dos hooks do React --- isso pode causar comportamento imprevisível.

### 2. HomeBackground: Hooks dentro de loops (BUG CRÍTICO)
- Linhas 69-70 e 106-107: `useTransform` é chamado dentro de `AURORAS.map()` e `ORBS.map()`. Isso viola as regras dos React Hooks. A solução é extrair componentes separados (`AuroraOrb`, `PulsingOrb`) que encapsulam os hooks individualmente.

### 3. HomePage: Tagline vazia
- Linhas 147-156: `motion.div` do "Tagline" renderiza um container vazio (`mb-8 sm:mb-12`) sem conteúdo, causando espaçamento desnecessário.

### 4. TaskCard: Arquivo de 1054 linhas
- Componente monolítico extremamente grande. Embora funcional, dificulta manutenção e impacta performance por re-renders desnecessários. Recomendo extrair sub-componentes: `SubtaskList`, `TaskExpandedPanel`, `TaskMetadataRow`.

### 5. Subtask cache global com memory leak
- Linha 56: `subtaskCache` é um `Map` global sem limite de tamanho ou mecanismo de invalidação. Acumula dados indefinidamente conforme o usuário navega.

### 6. Textos ainda em inglês
- KanbanBoard linha 68: "Add task" no `ColumnTaskCreator`
- TaskCard linha 938: Label "Subtasks" no painel expandido
- Dashboard linha 261: Título "Tasks" no header
- Palavras "task" usadas em toasts (ex: "Task excluída", "Task criada!") --- consistência com "Tarefa"

### 7. Bottom chevron na HomePage sem função
- O `ChevronDown` animado no fundo da HomePage (linhas 207-220) sugere scroll, mas a página não tem scroll --- elemento confuso para o usuário.

## Otimizações de Performance

### 8. HomeBackground: 40 partículas CSS + 4 auroras + 4 orbs com Framer Motion
- Excesso de animações simultâneas. Reduzir partículas para ~20, usar `will-change` com moderação (já está em uso mas em muitos elementos), e considerar `transform: translateZ(0)` para promover layers GPU apenas nos elementos que realmente precisam.

### 9. Dashboard: 3 orbs animados com Framer Motion
- Os orbs de background (linhas 228-246) rodam animações infinitas via Framer Motion, que é mais pesado que CSS puro. Migrar para animações CSS (`@keyframes`).

### 10. DashboardHeader: Scanning light infinita
- Animação de luz linear rodando constantemente (linha 37-41). Pode ser migrada para CSS puro.

### 11. Lazy loading inconsistente
- `Dashboard` e `AuthPage` são importados diretamente (não lazy), enquanto outras páginas usam `lazy()`. Dashboard é a página mais pesada e deveria ser lazy loaded também.

### 12. TaskCard: debounce timers sem cleanup
- Os `titleDebounceRef` e `descDebounceRef` (linhas 130-131) não são limpos no unmount do componente, podendo causar state updates em componentes desmontados.

### 13. Framer Motion `layout` em cada TaskCard
- A prop `layout` em cada TaskCard (linha 308) força recalculos de layout em toda mudança. Isso é pesado com muitas tasks.

## Plano de Implementação

### Tarefa 1: Corrigir bugs de hooks e refs
- Extrair `AuroraOrb` e `PulsingOrb` como componentes individuais no HomeBackground para respeitar regras de hooks
- Remover a div vazia do Tagline no HomePage
- Remover o ChevronDown sem função no bottom da HomePage

### Tarefa 2: Traduzir textos restantes para pt-BR
- "Add task" -> "Adicionar tarefa" no KanbanBoard
- "Subtasks" -> "Subtarefas" no TaskCard expandido
- "Tasks" -> "Tarefas" no Dashboard header
- Revisar toasts e labels menores

### Tarefa 3: Otimizar animações e performance
- Migrar orbs do Dashboard de Framer Motion para CSS `@keyframes`
- Migrar scanning light do DashboardHeader para CSS puro
- Reduzir partículas no HomeBackground de 40 para 20
- Remover `layout` prop desnecessária do TaskCard (manter apenas `layoutId` nos indicadores de navegação)
- Limpar debounce timers no unmount do TaskCard

### Tarefa 4: Lazy load do Dashboard e limpeza do subtask cache
- Tornar Dashboard lazy loaded como as demais páginas
- Adicionar limite ao subtaskCache (máx 50 entries, LRU simples)

### Tarefa 5: Melhorias mobile
- Verificar que MobileBottomNav não recebe refs indevidamente no AppLayout (corrigir o warning do console)

---

**Impacto estimado**: Correção de 2 bugs críticos (hooks em loops, ref warnings), tradução completa para pt-BR, redução significativa de animações Framer Motion desnecessárias (melhor FPS especialmente em mobile), e cleanup de memory leaks menores.

