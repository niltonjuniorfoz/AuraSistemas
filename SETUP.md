# Setup rápido — trabalho em dupla

## 1. Clonar e entrar na branch

```bash
git clone https://github.com/niltonjuniorfoz/AuraSistemas.git
cd AuraSistemas
```

## 2. Instalar e rodar

Segue o `README.md` do zero (instalação, banco local, seed, login). Resumo:

```bash
npm install
npm run db:local      # deixa esse terminal aberto
npm run db:push        # em outro terminal
npm run db:seed
npm run dev             # http://localhost:3000
```

Login: `master` / `master123`.

## 3. Variáveis de ambiente

Copia `.env.example` para `.env`. Os valores padrão já funcionam pra rodar
local (`DATABASE_URL` aponta pro Postgres local que o `db:local` sobe).

`JWT_SECRET` — qualquer texto serve pra rodar local, não precisa ser o
mesmo da produção.

`GEMINI_API_KEY` — só necessário se for mexer no assistente da loja ou no
gerador de descrição por IA. Pede a chave pro Wender direto (não sobe pro
Git, nunca cola chave de API em arquivo versionado).

## 4. Regra de trabalho

- Essa branch (`colega-dev`) é sua pra mexer à vontade — **não dá push
  direto na `main`**.
- Commita e dá push na `colega-dev` sempre que quiser (`git push`).
- Quem revisa e leva pra produção (merge na `main`) é o Wender, de manhã.
- Se o trabalho for em áreas bem diferentes do app, vale abrir mais de uma
  branch a partir da `colega-dev` — evita os dois mexendo no mesmo arquivo
  ao mesmo tempo.
