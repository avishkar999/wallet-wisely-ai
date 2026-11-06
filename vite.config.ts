import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/pages/Index.tsx"],
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "date-fns",
      "framer-motion",
      "recharts",
      "clsx",
      "tailwind-merge",
      "lucide-react",
    ],
    exclude: ["@lovable.dev/mcp-js"],
  },
  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("d3") || id.includes("recharts")) return "vendor-charts";
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@google/genai")) return "vendor-genai";
            if (id.includes("papaparse")) return "vendor-csv";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("date-fns")) return "vendor-date";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
