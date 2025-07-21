// vite.config.ts
import { defineConfig } from 'vitest/config';  // ← vitest 内蔵の defineConfig
// もし React/Vue などを使う場合はここでプラグインを追加
// import react from '@vitejs/plugin-react';
// import vue from '@vitejs/plugin-vue';

import { resolve } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

// Vite と Vitest の両方の設定をこの 1 ファイルで完結させる
export default defineConfig({
  // plugins: [react(), tsconfigPaths()], // React の場合
  plugins: [tsconfigPaths()],            // TS のパスエイリアスだけ使う例

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),    // import '@/foo' で src/foo を参照
    },
  },

  // ★ Vitest 用セクション
  test: {
    globals: true,               // describe, it, expect を import 不要で使う
    environment: 'node',         // 'jsdom' も可（ブラウザ API が必要なら）
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',            // Node.js 組み込み v8 カバレッジ
      reporter: ['text', 'html'],// 端末 & HTML レポート
    },
    setupFiles: './tests/setup.ts', // 必要ならテスト前に実行するスクリプト
    // alias や external など、Vitest 固有の追加設定もここに書ける
  },
});
