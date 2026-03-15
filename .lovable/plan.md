

# Fix: Login como Home + Eliminar Lag de Autenticação

## Problemas Identificados

1. **Rota "/" não é a página de login** — Vai para `AppLayout > Dashboard`, que mostra loading e depois redireciona para `/auth`. Isso causa delay desnecessário.
2. **useAuth tem race condition** — `onAuthStateChange` e `getSession` rodam em paralelo, ambos fazendo fetch de profile separadamente. O fetch de profile dentro do `onAuthStateChange` é async e bloqueia o estado de loading.
3. **Fetch de profile duplicado** — O profile é buscado duas vezes (uma em cada listener).

## Plano

### 1. Trocar rotas — Login vira "/"
**`src/App.tsx`:**
- AuthPage vai para `path="/"`  
- Dashboard vai para `path="/dashboard"`
- MetricsPage vai para `path="/dashboard/metrics"` (ou `/metrics`)
- Atualizar `AppLayout` redirect de `/auth` para `/`

**`src/pages/AuthPage.tsx`:**
- Adicionar redirect para `/dashboard` se já logado
- Trocar `navigate("/")` para `navigate("/dashboard")`

**`src/components/layout/AppLayout.tsx`:**
- Trocar `Navigate to="/auth"` para `Navigate to="/"`

**`src/components/layout/AppSidebar.tsx`:**
- Atualizar links de navegação para `/dashboard` e `/metrics`

### 2. Corrigir lag do useAuth
**`src/hooks/useAuth.tsx`:**
- Usar `setTimeout` com `getSession` para evitar conflito com `onAuthStateChange`
- Buscar profile apenas uma vez usando uma flag/ref
- Não fazer fetch de profile dentro do callback do `onAuthStateChange` — usar `setTimeout(fn, 0)` para desbloquear o callback (Supabase recomenda não fazer async work pesado dentro do listener)

### 3. Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Trocar rotas |
| `src/pages/AuthPage.tsx` | Redirect se logado, navegar para `/dashboard` |
| `src/hooks/useAuth.tsx` | Eliminar race condition e fetch duplicado |
| `src/components/layout/AppLayout.tsx` | Redirect para `/` |
| `src/components/layout/AppSidebar.tsx` | Atualizar links nav |

