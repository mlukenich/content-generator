import { GlobalRegistrator } from 'happy-dom';

/**
 * ==================================================================================
 * TEST SETUP (Happy DOM)
 * ==================================================================================
 * This setup file is preloaded by the 'bun test' command, as configured
 * in 'bunfig.toml'.
 *
 * It initializes a 'happy-dom' environment, which provides a simulated
 * DOM (Document Object Model) in a Node.js context. This is essential for
 * testing React components, like those from Remotion, without needing a
 * full browser environment. It allows us to render components, query them,
 * and assert their output as if they were in a real browser.
 * ==================================================================================
 */

GlobalRegistrator.register();
console.log('Happy DOM environment initialized for testing.');
