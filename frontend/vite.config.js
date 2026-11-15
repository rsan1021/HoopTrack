import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Target for the FastAPI backend that /api requests get proxied to.
// - Inside Docker Compose, the frontend container reaches the backend
//   container by its service name ("backend"), so this defaults to
//   http://backend:8000 there.
// - For local (non-Docker) development, override with:
//     VITE_API_PROXY_TARGET=http://localhost:8000 npm run dev
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://backend:8000";

// Shared proxy config used by both the dev server and `vite preview`
// (a simple way to sanity-check the production build locally). Any
// device on the LAN can hit the frontend's own host/port and reach the
// API through this same proxy — no more hardcoded localhost API URLs.
const apiProxy = {
  "/api": {
    target: apiProxyTarget,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ""),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["hooptrack.stellarwind.org"],
    proxy: apiProxy,
  },
  preview: {
    port: 5173,
    proxy: apiProxy,
  },
});
