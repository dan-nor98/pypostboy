const THEME_STORAGE_KEY = 'postboy_theme';

function preferredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_error) {
    // The workspace remains usable when browser storage is unavailable.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme, button) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  button.textContent = isDark ? '☾' : '☀';
  button.setAttribute('aria-pressed', String(isDark));
  button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  button.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
}

export function initThemeToggle() {
  const button = document.getElementById('themeToggleBtn');
  if (!button) return;

  applyTheme(preferredTheme(), button);
  button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (_error) {
      // Applying the selected theme does not require persistence.
    }
    applyTheme(nextTheme, button);
  });
}
