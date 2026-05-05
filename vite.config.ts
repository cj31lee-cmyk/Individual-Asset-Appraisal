import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { fetchRealprice, lastNMonths } from "./api/lib/realprice.js";
import { generateInsight, type ClaudeInsightInput } from "./api/lib/claude.js";
import diagHandler from "./api/diag.js";
import complexReportHandler from "./api/complex-report.js";

// Dev 환경에서 /api/realprice를 처리. Vercel production에서는 api/realprice.ts가 같은 일을 함.
function realpriceDevMiddleware(): Plugin {
  return {
    name: "realprice-dev",
    configureServer(server) {
      // 종합 진단 — GET /api/diag
      server.middlewares.use("/api/diag", async (req, res) => {
        try {
          const fakeReq = new Request(`http://localhost${req.url ?? "/"}`, { method: req.method });
          const response = await diagHandler(fakeReq);
          res.statusCode = response.status;
          res.setHeader("content-type", response.headers.get("content-type") ?? "application/json");
          res.end(await response.text());
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });

      // 단지 종합 리포트 — POST /api/complex-report (Sonnet 4.6 streaming SSE)
      // Edge 핸들러를 그대로 호출하고 Anthropic SSE 스트림을 forward.
      server.middlewares.use("/api/complex-report", async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const fakeReq = new Request(`http://localhost${req.url ?? "/"}`, {
            method: req.method,
            headers: { "content-type": "application/json" },
            body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
          });
          const response = await complexReportHandler(fakeReq);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) {
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });

      // Claude 인사이트 — POST /api/insight
      server.middlewares.use("/api/insight", async (req, res) => {
        try {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "POST only" }));
            return;
          }
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set in .env.local" }));
            return;
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as ClaudeInsightInput;
          if (!body?.region) {
            res.statusCode = 400;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "region required" }));
            return;
          }
          const result = await generateInsight(body, apiKey);
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(result));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });

      server.middlewares.use("/api/realprice", async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const lawdCd = url.searchParams.get("lawdCd") ?? "";
          if (!/^\d{5}$/.test(lawdCd)) {
            res.statusCode = 400;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "lawdCd (5-digit) required" }));
            return;
          }
          const apiKey = process.env.MOLIT_API_KEY;
          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "MOLIT_API_KEY not set in .env.local" }));
            return;
          }
          const monthCount = Math.min(
            Math.max(parseInt(url.searchParams.get("months") ?? "6", 10) || 6, 1),
            24,
          );
          const aptName = url.searchParams.get("aptName")?.trim();
          const umdName = url.searchParams.get("umdName")?.trim();
          const areaMin = url.searchParams.has("areaMin")
            ? parseFloat(url.searchParams.get("areaMin")!)
            : undefined;
          const areaMax = url.searchParams.has("areaMax")
            ? parseFloat(url.searchParams.get("areaMax")!)
            : undefined;

          const result = await fetchRealprice(
            {
              lawdCd,
              months: lastNMonths(monthCount),
              aptName: aptName || undefined,
              umdName: umdName || undefined,
              areaMin,
              areaMax,
            },
            apiKey,
          );
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(result));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .env, .env.local 등을 process.env로 주입 → 미들웨어에서 사용 가능.
  const env = loadEnv(mode, process.cwd(), "");
  process.env = { ...process.env, ...env };

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      realpriceDevMiddleware(),
    ].filter(Boolean) as Plugin[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@radix-ui/react-tooltip",
        "@radix-ui/react-popover",
        "date-fns",
        "date-fns/locale",
      ],
    },
  };
});
