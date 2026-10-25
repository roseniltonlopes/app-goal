import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE_PATH || (mode === 'production' ? '/app-goal/' : '/');

  return {
    base,
    plugins: [
      react(),
      {
        name: 'copy-index-to-404-for-gh-pages',
        closeBundle() {
          const distDir = path.resolve(__dirname, 'dist');
          const indexFile = path.join(distDir, 'index.html');
          const notFoundFile = path.join(distDir, '404.html');
          const noJekyllFile = path.join(distDir, '.nojekyll');
          if (fs.existsSync(indexFile)) {
            fs.copyFileSync(indexFile, notFoundFile);
            fs.writeFileSync(noJekyllFile, '');
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
