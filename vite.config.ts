import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production' 
          ? 'https://fishing-forecast-seven.vercel.app'
          : 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});