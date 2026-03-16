

# Visual Overhaul: Mais Vida, Contraste e Dinamismo

## Diagnostico

O app ja tem uma boa base de design system (gradientes, glassmorphism, neon effects) mas muitos textos estao com opacidade baixa (text-muted-foreground/60, /50, /30), cards sem bordas dinamicas consistentes, e os 3 metric cards do header nao tem tamanhos simetricos nem bordas brilhantes.

## Mudancas Planejadas

### 1. CSS Global (`src/index.css`)
- Subir `--muted-foreground` de 58% lightness para 65% para mais contraste geral
- Criar classe `.glow-card` com borda animada brilhante universal (conic-gradient rotating border similar ao top3-card mas mais sutil)
- Criar variantes `.glow-card-cyan`, `.glow-card-emerald`, `.glow-card-purple` com cores especificas
- Aumentar contraste dos stat-card: backgrounds mais visiveis, bordas mais brilhantes
- Subir opacidade geral de textos labels de /60 /50 para /80 /70

### 2. Dashboard Header (`DashboardHeader.tsx`)
- Cards metricos em grid simetrico com `h-full` forcado para altura igual
- Cada card envolvido em wrapper com classe `.glow-card-[cor]` para borda brilhante animada

### 3. Metric Cards (MeetingMetricsCard, GoogleCalendarCard, WorkTimerCard)
- Adicionar bordas brilhantes dinamicas com rotating gradient sutil
- Subir contraste dos textos: labels de `/70` para `/90`, valores em branco puro
- Garantir que todos tem o mesmo padding/height interno para simetria

### 4. Task Cards (`TaskCard.tsx`)
- Cards normais (nao top3): adicionar hover com borda que acende em cyan
- Subir contraste do titulo e description

### 5. Sidebar (`AppSidebar.tsx`)
- Subir opacidade dos textos inativos de `/60` para `/70`
- Project dots com glow mais forte

### 6. Digital Clock
- Manter como esta (ja tem bom contraste)

### 7. Paginas Metricas e Reunioes IA
- Subir contraste geral dos textos

## Abordagem Tecnica
- Maioria das mudancas via CSS (novas keyframes e classes em index.css)
- Ajustes pontuais de classNames nos componentes
- Usar CSS `@property` e `conic-gradient` para bordas brilhantes animadas (performatico, GPU-accelerated)
- Nenhuma mudanca de logica/funcionalidade

