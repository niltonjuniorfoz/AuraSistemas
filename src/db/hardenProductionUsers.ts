import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

const MIN_PASSWORD_LENGTH = 12;

function requiredPassword(name: string) {
  const value = String(process.env[name] || "").trim();
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`${name} deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  return value;
}

async function updatePassword(username: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await db
    .update(users)
    .set({ passwordHash, isActive: true, deletedAt: null, updatedAt: new Date() })
    .where(eq(users.username, username))
    .returning({ id: users.id });

  if (!updated.length) {
    throw new Error(`Usuario ${username} nao encontrado. Execute npm run db:seed antes.`);
  }
}

async function main() {
  const masterPassword = requiredPassword("AURA_MASTER_PASSWORD");
  const adminPassword = requiredPassword("AURA_ADMIN_PASSWORD");

  await updatePassword("master", masterPassword);
  await updatePassword("admin", adminPassword);

  console.log("Credenciais iniciais de producao atualizadas com sucesso.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao proteger credenciais iniciais:", error);
    process.exit(1);
  });
