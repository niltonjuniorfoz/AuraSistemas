import financeRouter from "../src/server/finance";
import fxRouter from "../src/server/fx";
import costLayersRouter from "../src/server/costLayers";
import personalRouter from "../src/server/personal";
import storeRouter from "../src/server/store";
import customerAuthRouter from "../src/server/customerAuth";
import intelligenceRouter from "../src/server/intelligence";
import statementsRouter from "../src/server/statements";
import { router as maintenanceRouter } from "../src/server/maintenance";
import { createVercelApiApp, createVercelHandler } from "../src/server/vercelAdapter";

const app = createVercelApiApp((api) => {
  api.use("/api/finance", financeRouter);
  api.use("/api/fx", fxRouter);
  api.use("/api/cost", costLayersRouter);
  api.use("/api/personal", personalRouter);
  api.use("/api/store", storeRouter);
  api.use("/api/store/account", customerAuthRouter);
  api.use("/api/intel", intelligenceRouter);
  api.use("/api/statements", statementsRouter);
  api.use("/api/maintenance", maintenanceRouter);
});

export default createVercelHandler(app);
