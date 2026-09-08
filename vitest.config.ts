import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@report/schema': path.resolve(__dirname, './packages/report-schema/src/index.ts'),
      '@report/expression': path.resolve(__dirname, './packages/report-expression/src/index.ts'),
      '@report/data': path.resolve(__dirname, './packages/report-data/src/index.ts'),
      '@report/layout': path.resolve(__dirname, './packages/report-layout/src/index.ts'),
      '@report/pagination': path.resolve(__dirname, './packages/report-pagination/src/index.ts'),
      '@report/core': path.resolve(__dirname, './packages/report-core/src/index.ts'),
      '@report/exporter': path.resolve(__dirname, './packages/report-exporter/src/index.ts'),
      '@report/exporter-pdf': path.resolve(__dirname, './packages/report-exporter-pdf/src/index.ts'),
      '@report/exporter-docx': path.resolve(__dirname, './packages/report-exporter-docx/src/index.ts'),
      '@report/exporter-xlsx': path.resolve(__dirname, './packages/report-exporter-xlsx/src/index.ts'),
      '@report/exporter-html': path.resolve(__dirname, './packages/report-exporter-html/src/index.ts'),
      '@report/engine': path.resolve(__dirname, './packages/report-engine/src/index.ts'),
      '@report/react': path.resolve(__dirname, './packages/report-react/src/index.ts')
    }
  }
});
