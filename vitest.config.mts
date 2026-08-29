import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // The modules that read secrets are marked `import "server-only"`, which
      // is what makes an accidental import from a client component a build
      // error rather than a leaked key. Outside a React Server Components
      // build that package throws on import, so the test runner gets the same
      // empty module the server build does.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
});
