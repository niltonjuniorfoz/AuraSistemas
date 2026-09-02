# OMEGA PY

ERP multimoeda (BRL/USD/PYG) com PDV, estoque, financeiro, DRE/Balanço e uma
loja online própria com checkout PIX. Node.js, Express, React, Vite,
Tailwind CSS e Drizzle ORM sobre PostgreSQL.

**Primeira vez no projeto? Leia [`HANDOFF.md`](HANDOFF.md) antes de mexer em
qualquer coisa** — tem contexto de negócio, decisões, armadilhas já
encontradas e uma regra que não pode ser quebrada. O roteiro completo do que
já foi feito está em [`PLANO.md`](PLANO.md); as regras de deploy em
[`REGRAS.md`](REGRAS.md).

## Tecnologias e Arquitetura

- **Frontend:** React 19, Vite, Tailwind CSS v4, Shadcn UI, TanStack Table v8, Recharts, Lucide Icons, Zustand.
- **Backend:** Node.js, Express, Drizzle ORM, API REST.
- **Banco de Dados:** PostgreSQL — [Supabase](https://supabase.com) em produção, local via Postgres embutido para desenvolvimento.

## Configuração do Ambiente (.env)

Copie `.env.example` para `.env` e preencha os valores reais. Pelo menos
estas duas são obrigatórias (lista completa de variáveis em `HANDOFF.md`,
seção 3):

```env
DATABASE_URL="postgresql://user:password@hostname/dbname"
JWT_SECRET="sua-chave-secreta-forte-aqui"
PORT=3000
NODE_ENV="development"
```

> **Nota crítica de segurança:** `JWT_SECRET` é obrigatório. Se não definida, o servidor impede a inicialização para proteger os tokens de sessão.

## Como Instalar e Rodar

1. **Instalar dependências**
   ```bash
   npm install
   ```

2. **Banco de dados local** (pule se já tiver um Postgres configurado em `DATABASE_URL`)
   ```bash
   npm run db:local
   ```
   Sobe um Postgres local sem precisar instalar nada à parte. **Deixe este
   terminal aberto** — no Windows o processo do banco morre se você fechar
   quem o iniciou (não é um daemon). Detalhes e solução de problemas em
   `HANDOFF.md`, seção 4.

3. **Sincronizar schema** (em outro terminal)
   ```bash
   npm run db:push
   ```

4. **Alimentar banco (seed)** — cria perfis, permissões e o usuário Master:
   ```bash
   npm run db:seed
   ```

5. **Iniciar o servidor**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`. Editou algo em `src/server/` ou
   `server.ts`? Reinicie este processo — o backend não tem hot-reload.

## Login Inicial Padrão

Login é por **usuário**, não e-mail.

- **Usuário:** `master`
- **Senha:** `master123`

*(Trocar a senha após o primeiro acesso — Cadastros > Usuários, logado como Master.)*

## Principais Comandos

- `npm run dev` — inicia em modo de desenvolvimento.
- `npm run build` — compila o backend e faz o bundle do frontend em `dist/`.
- `npm run start` — roda a versão de produção gerada em `dist/`.
- `npm run db:local` — sobe um Postgres local embutido (sem instalar nada) para desenvolvimento.
- `npm run db:push` — aplica o schema via Drizzle Kit no Postgres configurado.
- `npm run db:seed` — popula as tabelas essenciais.
- `npm run db:studio` — abre uma interface local para inspecionar os dados.
- `npm run lint` — typecheck (`tsc --noEmit`).
