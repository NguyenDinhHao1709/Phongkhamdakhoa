import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      // Toàn bộ biến toàn cục chuẩn của trình duyệt (alert, URLSearchParams, Blob, RTCPeerConnection...)
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Bắt biến / hàm dùng mà chưa khai báo hoặc chưa import (vd. filteredList, apiGet) ngay lúc lint,
      // thay vì để lỗi ReferenceError xảy ra khi người dùng bấm nút.
      'no-undef': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // File cấu hình chạy bằng Node (Vite, ESLint...), không chạy trên trình duyệt
    files: ['*.config.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
