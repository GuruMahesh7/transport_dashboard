import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import hubsRouter from "./hubs";
import staffRouter from "./staff";
import parcelsRouter from "./parcels";
import { itemsRouter } from "./items";

import dashboardRouter from "./dashboard";
import complaintsRouter from "./complaints";
import reportsRouter from "./reports";
import searchRouter from "./search";
import auditRouter from "./audit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(hubsRouter);
router.use(staffRouter);
router.use("/parcels", parcelsRouter);
router.use("/items", itemsRouter);
router.use(dashboardRouter);
router.use(complaintsRouter);
router.use(reportsRouter);
router.use(searchRouter);
router.use(auditRouter);

export default router;
