import healthRouter from "../src/server/health";
import archivedRouter from "../src/server/archived";
import cashRouter from "../src/server/cash";
import { separationRouter } from "../src/server/separation";
import { deliveryRouter } from "../src/server/delivery";
import { serialsRouter } from "../src/server/serials";
import settingsRouter from "../src/server/settings";
import suppliersRouter from "../src/server/suppliers";
import purchasesRouter from "../src/server/purchases";
import expensesRouter from "../src/server/expenses";
import { createVercelApiApp, createVercelHandler } from "../src/server/vercelAdapter";

const app = createVercelApiApp((api) => {
  api.use("/api/health", healthRouter);
  api.use("/api/archived", archivedRouter);
  api.use("/api/cash", cashRouter);
  api.use("/api/separation", separationRouter);
  api.use("/api/delivery", deliveryRouter);
  api.use("/api/serials", serialsRouter);
  api.use("/api/settings", settingsRouter);
  api.use("/api/suppliers", suppliersRouter);
  api.use("/api/purchases", purchasesRouter);
  api.use("/api/expenses", expensesRouter);
});

export default createVercelHandler(app);
