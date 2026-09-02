import authRouter from "../src/server/auth";
import usersRouter from "../src/server/users";
import productsRouter from "../src/server/products";
import customersRouter from "../src/server/customers";
import groupsRouter from "../src/server/groups";
import shelvesRouter from "../src/server/shelves";
import auditRouter from "../src/server/auditRouter";
import salesRouter from "../src/server/sales";
import reportsRouter from "../src/server/reports";

const loaded = [authRouter, usersRouter, productsRouter, customersRouter, groupsRouter, shelvesRouter, auditRouter, salesRouter, reportsRouter];
export default function handler(_req: any, res: any) {
  return res.status(200).json({ status: "ok", group: "a", count: loaded.length });
}
