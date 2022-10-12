import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://local.moneeey.io",
    setupNodeEvents() {
      // Implement node event listeners here
    },
  },
});
