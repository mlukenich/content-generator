/**
 * Test setup bootstrap.
 * Uses Happy DOM when available, but does not hard-fail if dependency is absent
 * in constrained environments.
 */

await import('happy-dom')
  .then((module) => {
    module.GlobalRegistrator.register();
    console.log('Happy DOM environment initialized for testing.');
  })
  .catch(() => {
    console.warn('Happy DOM not available; continuing without DOM preload.');
  });
