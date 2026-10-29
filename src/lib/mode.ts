// Page mode (Lead / Build), shared by the nav toggle, the hero divider and the console.
// The initial mode is set before first paint by the inline script in Base.astro.
export type Mode = "lead" | "build";
export type ModeSource = "toggle" | "drag" | "keyboard" | "console";

const STORAGE_KEY = "lt-mode";

export function getMode(): Mode {
  return document.documentElement.dataset.mode === "build" ? "build" : "lead";
}

export function setMode(mode: Mode, source: ModeSource): void {
  if (mode === getMode()) return;
  document.documentElement.dataset.mode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be unavailable (private mode); the mode still applies to this page.
  }
  document.dispatchEvent(new CustomEvent("modechange", { detail: { mode, source } }));
}

export function onModeChange(listener: (mode: Mode, source: ModeSource) => void): void {
  document.addEventListener("modechange", (event) => {
    const { mode, source } = (event as CustomEvent<{ mode: Mode; source: ModeSource }>).detail;
    listener(mode, source);
  });
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
