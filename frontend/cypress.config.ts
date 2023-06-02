import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'gpbyed',
  retries: {
    runMode: 5,
  },
  e2e: {
    baseUrl: 'http://local.moneeey.io',
    setupNodeEvents() {
      // Implement node event listeners here
    },
  },
});
