// Banco Postgres local para desenvolvimento, SEM precisar instalar Postgres
// nem Docker na máquina. Dados ficam em .localdb/ (gitignored) e sobrevivem
// entre execuções — só somem se você apagar a pasta.
//
// Uso:
//   npm run db:local          — sobe o banco e fica rodando (Ctrl+C encerra)
//   npm run db:local -- --once — sobe, confirma que está pronto, e sai
//                                 (o processo do Postgres continua rodando
//                                 em segundo plano até o computador reiniciar
//                                 ou alguém matar o processo na porta 5432)
//
// Depois de rodar isto, em outro terminal: npm run db:push && npm run db:seed
// O .env.example já aponta pra este banco (postgres/postgres, porta 5432, db "origin").

import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", ".localdb");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

const isNew = !existsSync(path.join(dataDir, "PG_VERSION"));

try {
  if (isNew) {
    console.log("Primeira vez: baixando/inicializando o Postgres embutido (pode levar um minuto)...");
    await pg.initialise();
  }
  await pg.start();
  if (isNew) {
    try { await pg.createDatabase("origin"); }
    catch (e) { console.log("createDatabase:", e.message); }
  }
} catch (err) {
  if (String(err.message || "").includes("EADDRINUSE") || String(err.message || "").includes("already")) {
    console.log("Porta 5432 já está em uso — provavelmente este banco já está rodando em outro terminal. Nada a fazer.");
    process.exit(0);
  }
  throw err;
}

console.log("Postgres local pronto: postgresql://postgres:postgres@localhost:5432/origin");

if (process.argv.includes("--once")) {
  console.log("(--once: saindo do script, o Postgres continua rodando em segundo plano)");
  process.exit(0);
}

process.on("SIGINT", async () => { await pg.stop(); process.exit(0); });
process.on("SIGTERM", async () => { await pg.stop(); process.exit(0); });
