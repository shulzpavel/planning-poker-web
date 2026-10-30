import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { analyzeIntake } from "./intakeAnalysis.ts";

/** Loopback-only, explicitly enabled development preview. Never a production API. */
export function intakePreview(): Plugin {
  return {
    name: "intake-local-preview", apply: "serve",
    configureServer(server) {
      if (process.env.VITE_DH_INTAKE_PREVIEW !== "1") return;
      server.middlewares.use("/__prototype/intake", async (req, res) => {
        const host = (req.headers.host || "").split(":")[0];
        const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress || "");
        if (!local || !["127.0.0.1", "localhost"].includes(host) || req.method !== "GET") {
          res.statusCode = 403; res.end("Forbidden"); return;
        }
        const requestUrl = new URL(req.url || "/", "http://localhost");
        const discovery = requestUrl.pathname.endsWith("/discovery");
        const days = requestUrl.searchParams.get("days") || "30";
        if (!["7", "30", "90"].includes(days)) { res.statusCode = 400; res.end("Invalid period"); return; }
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        try {
          const raw = await readFile(resolve(server.config.root, `data/${discovery ? "discovery" : "intake"}-${days}.json`), "utf8");
          if (!discovery && requestUrl.searchParams.get("analysis") === "1") {
            res.end(JSON.stringify(await analyzeIntake(server.config.root, JSON.parse(raw))));
          } else res.end(raw);
        }
        catch { res.statusCode = 503; res.end(JSON.stringify({ error: "Snapshot or analysis unavailable" })); }
      });
    },
  };
}
