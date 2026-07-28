import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

// Load .env automatically if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const possiblePaths = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../../.env"),
      path.resolve(process.cwd(), "../.env"),
      path.resolve(__dirname, "../../.env"),
      path.resolve(__dirname, "../.env")
    ];
    let envPath = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        envPath = p;
        break;
      }
    }
    if (envPath) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...values] = trimmed.split("=");
          const value = values.join("=");
          if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^['"]|['"]$/g, "");
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to load .env file in drizzle config:", err);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
