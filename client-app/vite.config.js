import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5233',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../wwwroot',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-mui-core': ['@mui/material'],
          'vendor-mui-icons': ['@mui/icons-material'],
          'vendor-router': ['react-router-dom'],
        },
      },
    },
  },
});
