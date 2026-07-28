import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import fs from "fs";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve static frontend assets in production if they exist
const candidatePaths = [
  process.env.STATIC_ASSETS_PATH,
  path.resolve(process.cwd(), "artifacts/tms/dist/public"),
  path.resolve(process.cwd(), "../tms/dist/public"),
  path.resolve(import.meta.dirname, "../../tms/dist/public"),
  path.resolve(import.meta.dirname, "../../../tms/dist/public"),
].filter(Boolean) as string[];

let staticPath = "";
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    staticPath = p;
    break;
  }
}

if (staticPath) {
  logger.info({ staticPath }, "Serving static frontend assets");
  app.use(express.static(staticPath));
  
  // Catch-all route to serve index.html for client-side routing (wouter SPA)
  app.get("*splat", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(staticPath, "index.html"));
  });
} else {
  logger.warn({ checkedPaths: candidatePaths }, "Static assets directory not found. Frontend not served from backend.");
}

export default app;
