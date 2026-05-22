import { defineConfig } from 'vite';
import { execSync } from 'child_process';

let commitHash = 'dev';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  // Safe fallback if git is not installed or repo is not initialized yet
}

const buildNumber = process.env.GITHUB_RUN_NUMBER || 'local';

// https://vitejs.dev/config/
export default defineConfig({
  // Using relative base paths makes the build output completely portable,
  // allowing it to run perfectly on GitHub Pages (even inside subfolders)
  // as well as any other static hosting platform without changing code.
  base: './',
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
  }
});

