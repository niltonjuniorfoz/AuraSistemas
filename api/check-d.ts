import financeRouter from "../src/server/finance";
import fxRouter from "../src/server/fx";
import costLayersRouter from "../src/server/costLayers";
import personalRouter from "../src/server/personal";
import storeRouter from "../src/server/store";
import customerAuthRouter from "../src/server/customerAuth";
import intelligenceRouter from "../src/server/intelligence";
import statementsRouter from "../src/server/statements";
import { router as maintenanceRouter } from "../src/server/maintenance";
import { apiPerformanceLogger, markResponseStart } from "../src/server/performance";

const loaded = [financeRouter, fxRouter, costLayersRouter, personalRouter, storeRouter, customerAuthRouter, intelligenceRouter, statementsRouter, maintenanceRouter, apiPerformanceLogger, markResponseStart];
export default function handler(_req: any, res: any) {
  return res.status(200).json({ status: "ok", group: "d", count: loaded.length });
}
