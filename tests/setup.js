import { beforeEach, vi } from "vitest";

const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    key: vi.fn(() => null),
    get length() { return Object.keys(store).length; },
  };
};

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorageMock());
  vi.stubGlobal("sessionStorage", createStorageMock());
  delete window.__weddingConfig;
  global.fetch = vi.fn();
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});
