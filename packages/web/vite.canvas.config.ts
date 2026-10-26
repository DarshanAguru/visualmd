import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/canvas',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/canvas/index.ts'),
      name: 'VisualMDCanvas',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-dom/client',
      ],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'canvas.css';
          }
          return assetInfo.name || 'asset-[hash][extname]';
        },
      },
    },
  },
});
