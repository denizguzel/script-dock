import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: 'dist/webviews',
    rollupOptions: {
      input: {
        'script-chain-editor': 'webviews/script-chain-editor/main.tsx',
      },
      output: {
        assetFileNames: '[name][extname]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js',
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
