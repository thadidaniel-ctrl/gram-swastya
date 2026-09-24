import '@testing-library/jest-dom';

// Node 22+/26 exposes an experimental global `localStorage` that is `undefined`
// unless started with --localstorage-file. Inside vitest's jsdom environment that
// broken global shadows jsdom's working Storage implementation, so any test touching
// localStorage throws "Cannot read properties of undefined (reading 'getItem')".
// Restore a functional Storage when that happens.
function createMemoryStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
  };
}

function ensureLocalStorage() {
  const hasWorkingStorage = (() => {
    try {
      return typeof window.localStorage?.getItem === 'function';
    } catch {
      return false;
    }
  })();

  if (hasWorkingStorage) return;

  const storage = createMemoryStorage();
  const descriptor = {
    value: storage,
    writable: true,
    configurable: true,
    enumerable: true,
  };

  try {
    Object.defineProperty(window, 'localStorage', descriptor);
  } catch {
    // jsdom may expose a non-configurable accessor; fall back to globalThis
  }
  try {
    Object.defineProperty(globalThis, 'localStorage', descriptor);
  } catch {
    // ignore: not configurable in this environment
  }
}

ensureLocalStorage();