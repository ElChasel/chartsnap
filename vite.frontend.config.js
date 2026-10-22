import { defineConfig } from "vite";
export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      input:'standalone.html',
      output: {
        manualChunks(id) { if(id.includes('/node_modules/echarts/')||id.includes('/node_modules/zrender/'))return 'charts'; if(id.includes('/node_modules/react/')||id.includes('/node_modules/react-dom/'))return 'react'; },
      },
    },
  },
  test: { include: ["tests/**/*.test.js"], testTimeout: 30000 },
});
