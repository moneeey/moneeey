import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "gpbyed",
  e2e: {
    baseUrl: "http://local.moneeey.io",
    setupNodeEvents() {
      // Implement node event listeners here
    },
  },
});
