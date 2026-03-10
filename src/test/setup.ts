import { Window } from 'happy-dom';

/**
 * Robust test setup for DOM environments in Bun.
 * Manually registers necessary globals from happy-dom.
 */
function setupDom() {
  const window = new Window();
  
  // Basic DOM globals
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLAnchorElement: window.HTMLBaseElement,
    HTMLCollection: window.HTMLCollection,
    DocumentFragment: window.DocumentFragment,
    CharacterData: window.CharacterData,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    MessageEvent: window.Event, // Shim if missing
    Request: window.Request,
    Response: window.Response,
    Headers: window.Headers,
    FormData: window.FormData,
    AbortController: window.AbortController,
    Storage: window.Storage,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });

  // Remotion/React often need these
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  };
  globalThis.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };

  console.log('Happy DOM environment manually initialized for testing.');
}

// Execute setup
try {
  setupDom();
} catch (error) {
  console.error('Failed to initialize Happy DOM:', error);
}
