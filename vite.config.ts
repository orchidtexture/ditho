import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command, mode }) => {
  // Playground dev server
  if (command === 'serve' || mode === 'demo') {
    return {
      server: {
        port: 3000,
        open: true,
      },
      build: {
        outDir: 'dist-demo',
      },
    };
  }

  // Library packaging build
  return {
    plugins: [
      dts({
        insertTypesEntry: true,
        include: ['src'],
        exclude: ['src/main.ts'],
      }),
    ],
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.ts'),
          react: resolve(__dirname, 'src/react/index.ts'),
        },
        formats: ['es'],
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime'],
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'style.css';
            }
            return '[name][extname]';
          },
        },
      },
    },
  };
});
