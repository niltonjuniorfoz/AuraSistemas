import { db } from "./index";
import { roles, permissions, rolePermissions, users, productGroups, shelves, productSubgroups, expenseCategories } from "./schema";
import bcrypt from "bcryptjs";
import { sql, eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function main() {
  console.log("Seeding database...");

  try {
    await db.execute(sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS notes text;`);
    console.log("Added notes column to stock_movements");
  } catch(e) {
    console.log("Notes column already exists or error:", e);
  }

  try {
    const alters = [
      `ALTER TABLE product_groups ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;`,
      `ALTER TABLE product_groups ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();`,
      `ALTER TABLE product_groups ADD COLUMN IF NOT EXISTS deleted_at timestamp;`,
      
      `ALTER TABLE product_subgroups ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;`,
      `ALTER TABLE product_subgroups ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();`,
      `ALTER TABLE product_subgroups ADD COLUMN IF NOT EXISTS deleted_at timestamp;`,
      
      `ALTER TABLE shelves ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;`,
      `ALTER TABLE shelves ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();`,
      `ALTER TABLE shelves ADD COLUMN IF NOT EXISTS deleted_at timestamp;`,
      `ALTER TABLE sales ALTER COLUMN number SET NOT NULL;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;`,
      `UPDATE users SET username = 'admin' WHERE email = 'admin@origin.local' AND username IS NULL;`,
      `UPDATE users SET username = split_part(email, '@', 1) || '_' || substr(id::text, 1, 4) WHERE username IS NULL;`,
      `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_username_unique'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
  END IF;
END
$$;`
    ];
    for (const statement of alters) {
       await db.execute(sql.raw(statement));
    }
    console.log("Added is_active, updated_at, deleted_at, username columns where missing");
  } catch(e) {
    console.log("Aviso ao preparar colunas/constraints iniciais:", e);
  }

  const permsToSeed = [
    { module: "admin", action: "manage", description: "Admin full access" },
    { module: "product", action: "manage", description: "Manage products" },
    { module: "customer", action: "manage", description: "Manage customers" },
    { module: "user", action: "manage", description: "Manage users" },
    { module: "settings", action: "manage", description: "Manage settings" },
    { module: "sales", action: "view", description: "View sales" },
    { module: "sales", action: "create", description: "Create sales" },
    { module: "sales", action: "cancel", description: "Cancel sales" },
    { module: "sales", action: "discount", description: "Apply discounts" },
    { module: "sales", action: "change_price", description: "Override prices" },
    { module: "cash", action: "view", description: "View cash register" },
    { module: "cash", action: "open", description: "Open cash register" },
    { module: "cash", action: "close", description: "Close cash register" },
    { module: "cash", action: "receive_payment", description: "Receive sale payments" },
    { module: "cash", action: "withdrawal", description: "Cash withdrawal (Sangria)" },
    { module: "cash", action: "supply", description: "Cash supply (Suprimento)" },
    { module: "cash", action: "refund", description: "Process refunds" },
    { module: "cash", action: "manage_accounts", description: "Manage financial accounts (create/edit/transfer/settle/method map)" },
    { module: "separation", action: "view", description: "View separation queue" },
    { module: "separation", action: "process", description: "Process separation tasks" },
    { module: "separation", action: "skip", description: "Skip separation phase" },
    { module: "delivery", action: "view", description: "View delivery queue" },
    { module: "delivery", action: "process", description: "Process delivery tasks" },
    { module: "delivery", action: "scan_serial", description: "Scan serial numbers" },
    { module: "delivery", action: "complete", description: "Complete delivery tasks" },
    { module: "reports", action: "view", description: "View reports module" },
    { module: "reports", action: "sales", description: "View sales reports" },
    { module: "reports", action: "products_pdf", description: "Generate products PDF catalog" },
    { module: "reports", action: "stock", description: "View stock reports" },
    { module: "reports", action: "financial", description: "View financial reports" },
    { module: "receipt", action: "view", description: "View internal receipt" },
    { module: "receipt", action: "print", description: "Print internal receipt" },
    { module: "receipt", action: "download", description: "Download receipt PDF" },
    { module: "receipt", action: "email", description: "Send receipt by email" },
    { module: "purchase", action: "view", description: "View purchases" },
    { module: "purchase", action: "create", description: "Create purchases" },
    { module: "purchase", action: "edit", description: "Edit purchases" },
    { module: "purchase", action: "approve", description: "Approve purchases" },
    { module: "purchase", action: "cancel", description: "Cancel purchases" },
    { module: "purchase", action: "import", description: "Import purchases via spreadsheet" },
    { module: "purchase", action: "ocr", description: "Import purchases via OCR" },
    { module: "supplier", action: "view", description: "View suppliers" },
    { module: "supplier", action: "create", description: "Create suppliers" },
    { module: "supplier", action: "edit", description: "Edit suppliers" },
    { module: "supplier", action: "archive", description: "Archive suppliers" },
    { module: "supplier", action: "delete", description: "Delete suppliers" },
    { module: "supplier", action: "manage", description: "Manage suppliers" },
    { module: "reports", action: "profit", description: "View profit reports" },
    { module: "expenses", action: "view", description: "View expenses" },
    { module: "expenses", action: "manage", description: "Manage expenses" },
  ];

  const dbPerms = [];
  for (const p of permsToSeed) {
    let existing = await db.select().from(permissions).where(and(eq(permissions.module, p.module), eq(permissions.action, p.action))).limit(1);
    let permId = existing.length > 0 ? existing[0].id : uuidv4();
    if (existing.length === 0) {
      await db.insert(permissions).values({ id: permId, ...p });
    }
    dbPerms.push({ id: permId, ...p });
  }

  const roleConfigs = [
    { name: "Master", description: "Usuário técnico invisível para manutenção crítica" },
    { name: "Admin", description: "Administrador Geral" },
    { name: "Vendedor", description: "Time de Vendas PDV" },
    { name: "Separação", description: "Equipe de Depósito / Separação" },
    { name: "Entrega", description: "Equipe de Despacho e Entrega" },
    { name: "Caixa", description: "Time de Pagamentos / Recebimento" },
  ];

  let adminRoleId = "";

  for (const rc of roleConfigs) {
    let existingRole = await db.select().from(roles).where(eq(roles.name, rc.name)).limit(1);
    let roleId = existingRole.length > 0 ? existingRole[0].id : uuidv4();
    
    if (existingRole.length === 0) {
      await db.insert(roles).values({ id: roleId, name: rc.name, description: rc.description });
    }
    
    if (rc.name === "Admin" || rc.name === "Master") {
      if (rc.name === "Admin") adminRoleId = roleId;
      for (const p of dbPerms) {
        let existingRel = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, p.id))).limit(1);
        if (existingRel.length === 0) {
           await db.insert(rolePermissions).values({ roleId, permissionId: p.id });
        }
      }
    }

    if (rc.name === "Vendedor") {
      for (const p of dbPerms) {
        if ((p.module === "sales" && ["view", "create"].includes(p.action)) || (p.module === "reports" && ["view", "sales", "products_pdf"].includes(p.action)) || (p.module === "receipt" && ["view", "download", "print", "email"].includes(p.action))) {
          let existingRel = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, p.id))).limit(1);
          if (existingRel.length === 0) {
             await db.insert(rolePermissions).values({ roleId, permissionId: p.id });
          }
        }
      }
    }
    
    if (rc.name === "Caixa") {
      for (const p of dbPerms) {
        if ((p.module === "cash" && ["view", "open", "close", "receive_payment", "withdrawal", "supply"].includes(p.action)) || (p.module === "receipt" && ["view", "print", "download", "email"].includes(p.action))) {
          let existingRel = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, p.id))).limit(1);
          if (existingRel.length === 0) {
             await db.insert(rolePermissions).values({ roleId, permissionId: p.id });
          }
        }
      }
    }
    
    if (rc.name === "Separação") {
      for (const p of dbPerms) {
        if (p.module === "separation" && ["view", "process"].includes(p.action)) {
          let existingRel = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, p.id))).limit(1);
          if (existingRel.length === 0) {
             await db.insert(rolePermissions).values({ roleId, permissionId: p.id });
          }
        }
      }
    }
    
    if (rc.name === "Entrega") {
      for (const p of dbPerms) {
        if (p.module === "delivery" && ["view", "process", "scan_serial", "complete"].includes(p.action)) {
          let existingRel = await db.select().from(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, p.id))).limit(1);
          if (existingRel.length === 0) {
             await db.insert(rolePermissions).values({ roleId, permissionId: p.id });
          }
        }
      }
    }
  }

  const masterRole = await db.select().from(roles).where(eq(roles.name, "Master")).limit(1);
  const masterRoleId = masterRole[0]?.id;
  if (masterRoleId) {
    const existingMaster = await db.select().from(users).where(eq(users.username, "master")).limit(1);
    if (existingMaster.length === 0) {
      const masterHash = await bcrypt.hash("master123", 10);
      await db.insert(users).values({
        id: uuidv4(),
        username: "master",
        name: "Master",
        email: "master@aura.local",
        passwordHash: masterHash,
        roleId: masterRoleId,
        isActive: true,
      });
      console.log("Master user created. Username: master / Password: master123");
    } else {
      await db.update(users).set({ roleId: masterRoleId, isActive: true, deletedAt: null, updatedAt: new Date() }).where(eq(users.username, "master"));
      console.log("Master user already exists, ensured role and active status. Password was not changed.");
    }
  }

  const adminEmail = "admin@aura.local";
  const existingUsers = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  
  if (existingUsers.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      id: uuidv4(),
      username: "admin",
      name: "Admin",
      email: adminEmail,
      passwordHash,
      roleId: adminRoleId,
    });
    console.log("Admin user created.");
  } else {
    // ensure admin has admin role
    await db.update(users).set({ roleId: adminRoleId }).where(eq(users.username, "admin"));
    console.log("Admin user already exists, ensured role.");
  }

  // Categorias iniciais da vitrine de cosméticos. Elas são os mesmos grupos
  // escolhidos no cadastro do produto; por isso o produto já nasce na seção
  // correta do site, sem uma segunda classificação manual.
  const storefrontGroups = [
    { name: "Maquiagem", icon: "makeup", sortOrder: 10 },
    { name: "Skincare", icon: "skincare", sortOrder: 20 },
    { name: "Cabelos", icon: "hair", sortOrder: 30 },
    { name: "Corpo e Banho", icon: "bath", sortOrder: 40 },
    { name: "Perfumes", icon: "perfume", sortOrder: 50 },
    { name: "Kits e Presentes", icon: "gift", sortOrder: 60 },
    { name: "Acessórios", icon: "accessories", sortOrder: 70 },
    { name: "Lançamentos", icon: "launch", sortOrder: 80 },
  ];
  for (const group of storefrontGroups) {
    const existing = await db.select().from(productGroups).where(eq(productGroups.name, group.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(productGroups).values({ id: uuidv4(), ...group, storeVisible: true, isActive: true });
    } else {
      await db.update(productGroups).set({
        icon: group.icon,
        sortOrder: group.sortOrder,
        storeVisible: true,
        isActive: true,
        deletedAt: null,
        updatedAt: new Date(),
      }).where(eq(productGroups.id, existing[0].id));
    }
  }
  console.log("Storefront cosmetic categories ensured.");

  // Seed expense categories
  const categories = ["ALUGUEL", "INTERNET", "LUZ", "ÁGUA", "SALÁRIOS", "TRANSPORTE", "MARKETING", "IMPOSTOS", "OUTROS"];
  for (const catName of categories) {
    const existing = await db.select().from(expenseCategories).where(eq(expenseCategories.name, catName));
    if (existing.length === 0) {
      await db.insert(expenseCategories).values({
        id: uuidv4(),
        name: catName,
        type: ["ALUGUEL", "INTERNET", "SALÁRIOS"].includes(catName) ? "FIXED" : "VARIABLE"
      });
    }
  }

  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed", err);
  process.exit(1);
});
