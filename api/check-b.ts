import healthRouter from "../src/server/health";
import archivedRouter from "../src/server/archived";
import cashRouter from "../src/server/cash";
import { separationRouter } from "../src/server/separation";
import { deliveryRouter } from "../src/server/delivery";
import { serialsRouter } from "../src/server/serials";
import settingsRouter from "../src/server/settings";
import receiptsRouter from "../src/server/receipts";
import suppliersRouter from "../src/server/suppliers";
import purchasesRouter from "../src/server/purchases";
import expensesRouter from "../src/server/expenses";

const loaded = [healthRouter, archivedRouter, cashRouter, separationRouter, deliveryRouter, serialsRouter, settingsRouter, receiptsRouter, suppliersRouter, purchasesRouter, expensesRouter];
export default function handler(_req: any, res: any) {
  return res.status(200).json({ status: "ok", group: "b", count: loaded.length });
}
