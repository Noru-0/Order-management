import { bootstrap } from './bootstrap/Application';

/**
 * Application entry point using Clean Architecture
 */
async function main() {
  const port = parseInt(process.env.PORT || '3000');
  await bootstrap(port);
}

// Start the application
main().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
