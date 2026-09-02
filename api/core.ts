import authRouter from "../src/server/auth";
import usersRouter from "../src/server/users";
import productsRouter from "../src/server/products";
import customersRouter from "../src/server/customers";
import groupsRouter from "../src/server/groups";
import shelvesRouter from "../src/server/shelves";
import auditRouter from "../src/server/auditRouter";
import salesRouter from "../src/server/sales";
import receiptsRouter from "../src/server/receipts";
import reportsRouter from "../src/server/reports";
import { createVercelApiApp, createVercelHandler } from "../src/server/vercelAdapter";

const app = createVercelApiApp((api) => {
  api.use("/api/auth", authRouter);
  api.use("/api/users", usersRouter);
  api.use("/api/products", productsRouter);
  api.use("/api/customers", customersRouter);
  api.use("/api/groups", groupsRouter);
  api.use("/api/shelves", shelvesRouter);
  api.use("/api/audit", auditRouter);
  api.use("/api/sales", receiptsRouter);
  api.use("/api/sales", salesRouter);
  api.use("/api/reports", reportsRouter);
});

export default createVercelHandler(app);
