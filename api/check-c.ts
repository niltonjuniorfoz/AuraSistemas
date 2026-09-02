import dashboardRouter from "../src/server/dashboard";
import notificationsRouter from "../src/server/notifications";
import analyticsRouter from "../src/server/analytics";
import transfersRouter from "../src/server/transfers";
import aiReportsRouter from "../src/server/aiReports";
import masterRouter from "../src/server/master";
import lotsRouter from "../src/server/lots";
import receivablesRouter from "../src/server/receivables";
import payablesRouter from "../src/server/payables";

const loaded = [dashboardRouter, notificationsRouter, analyticsRouter, transfersRouter, aiReportsRouter, masterRouter, lotsRouter, receivablesRouter, payablesRouter];
export default function handler(_req: any, res: any) {
  return res.status(200).json({ status: "ok", group: "c", count: loaded.length });
}
