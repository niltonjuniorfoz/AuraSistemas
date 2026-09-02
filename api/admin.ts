import dashboardRouter from "../src/server/dashboard";
import notificationsRouter from "../src/server/notifications";
import analyticsRouter from "../src/server/analytics";
import transfersRouter from "../src/server/transfers";
import aiReportsRouter from "../src/server/aiReports";
import masterRouter from "../src/server/master";
import lotsRouter from "../src/server/lots";
import receivablesRouter from "../src/server/receivables";
import payablesRouter from "../src/server/payables";
import { createVercelApiApp, createVercelHandler } from "../src/server/vercelAdapter";

const app = createVercelApiApp((api) => {
  api.use("/api/dashboard", dashboardRouter);
  api.use("/api/notifications", notificationsRouter);
  api.use("/api/analytics", analyticsRouter);
  api.use("/api/transfers", transfersRouter);
  api.use("/api/ai-reports", aiReportsRouter);
  api.use("/api/master", masterRouter);
  api.use("/api/lots", lotsRouter);
  api.use("/api/receivables", receivablesRouter);
  api.use("/api/payables", payablesRouter);
});

export default createVercelHandler(app);
