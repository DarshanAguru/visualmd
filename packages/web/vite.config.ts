import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5665,
    strictPort: false, // If port 5665 is occupied, automatically try next available empty port
    proxy: {
      '/api': {
        target: process.env.VMD_SERVER_URL || 'http://localhost:9669',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-marked': ['marked'],
        },
      },
    },
  },
});
