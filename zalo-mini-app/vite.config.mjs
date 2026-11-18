import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default () =>
  defineConfig({
    root: "./src",
    // File .env đặt ở thư mục gốc zalo-mini-app (không phải src/)
    envDir: "..",
    base: "",
    plugins: [zaloMiniApp(), react()],
    build: { assetsInlineLimit: 0 },
  });
