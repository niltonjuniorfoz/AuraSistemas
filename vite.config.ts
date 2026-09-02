import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type PluginOption} from 'vite';

function productionHardeningPlugin(): PluginOption {
  return {
    name: 'aura-sistemas-production-hardening',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (fileName.endsWith('.map')) {
          delete bundle[fileName];
          continue;
        }

        if (asset.type === 'chunk') {
          asset.code = asset.code
            .replace(/\/\*#\s*sourceMappingURL=.*?\*\//g, '')
            .replace(/\/\/#[\s]*sourceMappingURL=.*$/gm, '')
            .replace(/\/\*![\s\S]*?\*\//g, '')
            .replace(/debugger;?/g, '');
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react(), tailwindcss(), productionHardeningPlugin()],
    resolve: {
      alias: {
        // Padrão Shadcn/Apex: "@/components/ui/button" -> src/components/ui/button
        '@': path.resolve(__dirname, './src'),
      },
    },
    esbuild: isProduction
      ? {
          drop: ['console', 'debugger'],
          legalComments: 'none',
        }
      : undefined,
    build: {
      sourcemap: false,
      minify: 'esbuild',
      cssMinify: 'esbuild',
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app-[hash].js',
          chunkFileNames: 'assets/c-[hash].js',
          assetFileNames: (assetInfo) => {
            const originalName = assetInfo.names?.[0] || assetInfo.name || '';
            const extension = originalName.includes('.') ? originalName.split('.').pop() : 'asset';
            if (/css/i.test(extension || '')) return 'assets/s-[hash][extname]';
            return 'assets/a-[hash][extname]';
          },
          // Sem manualChunks: o split por substring ('react' pegava react-dom mas não o
          // scheduler) criava ciclo entre chunks e o React chegava undefined em produção
          // (tela azul, "reading 'useLayoutEffect'"). Rollup decide o split sozinho.
          compact: true,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
