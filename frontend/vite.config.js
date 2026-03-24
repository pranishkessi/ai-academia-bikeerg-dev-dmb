import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Force Vite to use port 5173 and fail if occupied
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
});
