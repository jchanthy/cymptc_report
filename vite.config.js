import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Using relative base paths makes the build output completely portable,
  // allowing it to run perfectly on GitHub Pages (even inside subfolders)
  // as well as any other static hosting platform without changing code.
  base: './',
});
