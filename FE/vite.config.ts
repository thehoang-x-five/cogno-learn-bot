import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * EduAssist API runs on :8000 in Docker. Port :8080 is another local project.
 * Some machines have FE/.env.local with https://localhost:8080 → CORS + wrong service.
 */
function resolveViteApiUrl(mode: string): string {
  const fromOs = process.env.VITE_API_URL?.trim();
  const fromFiles = loadEnv(mode, process.cwd(), "VITE_").VITE_API_URL?.trim();
  let url = fromOs || fromFiles || "http://localhost:8000";
  try {
    const u = new URL(url);
    if (u.port === "8080") {
      return "http://localhost:8000";
    }
    if (
      u.protocol === "https:" &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    ) {
      const port = u.port ? `:${u.port}` : "";
      return `http://${u.hostname}${port}`;
    }
  } catch {
    /* keep url */
  }
  return url;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const viteApiUrl = resolveViteApiUrl(mode);
  return {
    server: {
      host: "0.0.0.0",
      port: 3000,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(viteApiUrl),
    },
  };
});
