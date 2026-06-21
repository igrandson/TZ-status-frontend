const THEME_KEY = "tz-status-theme";

export function getStoredDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function setStoredDarkMode(dark: boolean): void {
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", dark);
}

export function applyStoredTheme(): void {
  document.documentElement.classList.toggle("dark", getStoredDarkMode());
}
