const THEME_STORAGE_KEY = 'postboy_theme';
const LIGHT_THEME_QUERY = '(prefers-color-scheme: light)';

function getStoredTheme() {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    return theme === 'light' || theme === 'dark' ? theme : null;
}

function getPreferredTheme() {
    const storedTheme = getStoredTheme();
    if (storedTheme) return storedTheme;

    return window.matchMedia && window.matchMedia(LIGHT_THEME_QUERY).matches ? 'light' : 'dark';
}

function updateThemeToggle(themeToggleBtn, theme) {
    if (!themeToggleBtn) return;

    const isLight = theme === 'light';
    themeToggleBtn.textContent = isLight ? '☀️ Light' : '🌙 Dark';
    themeToggleBtn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    themeToggleBtn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    themeToggleBtn.title = isLight ? 'Switch to dark theme' : 'Switch to light theme';
}

function applyTheme(theme, themeToggleBtn) {
    document.documentElement.dataset.theme = theme;
    updateThemeToggle(themeToggleBtn, theme);
}

export function initTheme(themeToggleBtn) {
    applyTheme(getPreferredTheme(), themeToggleBtn);

    if (!themeToggleBtn) return;

    themeToggleBtn.addEventListener('click', function() {
        const currentTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        applyTheme(nextTheme, themeToggleBtn);
    });
}
