/**
 * Mission Control Theme Toggle
 * Handles dark/light mode switching with localStorage persistence
 */

// Theme configuration
const THEME_KEY = 'mission-control-theme';
const THEMES = {
    DARK: 'dark',
    LIGHT: 'light'
};

// Theme definitions
const THEME_COLORS = {
    dark: {
        '--bg-primary': '#0d1117',
        '--bg-secondary': '#161b22',
        '--bg-tertiary': '#21262d',
        '--text-primary': '#e6edf3',
        '--text-secondary': '#8b949e',
        '--border': '#30363d',
        '--accent-orange': '#ff6b00',
        '--accent-orange-hover': '#ff8533',
        '--success': '#238636',
        '--warning': '#d29922',
        '--danger': '#da3633',
        '--info': '#58a6ff',
        '--card-bg': '#161b22',
        '--today-gradient-start': '#1a1a2e',
        '--today-gradient-end': '#16213e',
        '--assignment-done-bg': 'rgba(34,197,94,0.1)',
        '--assignment-in-progress-bg': 'rgba(59,130,246,0.1)',
        '--assignment-default-bg': 'rgba(255,0,0,0.1)'
    },
    light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f6f8fa',
        '--bg-tertiary': '#e1e4e8',
        '--text-primary': '#1f2328',
        '--text-secondary': '#656d76',
        '--border': '#d0d7de',
        '--accent-orange': '#ff6b00',
        '--accent-orange-hover': '#e55a00',
        '--success': '#2ea043',
        '--warning': '#9e8c4c',
        '--danger': '#cf222e',
        '--info': '#4493d6',
        '--card-bg': '#ffffff',
        '--today-gradient-start': '#fff5eb',
        '--today-gradient-end': '#ffecd9',
        '--assignment-done-bg': 'rgba(34,197,94,0.15)',
        '--assignment-in-progress-bg': 'rgba(59,130,246,0.15)',
        '--assignment-default-bg': 'rgba(239,68,68,0.1)'
    }
};

/**
 * Apply theme colors to document root
 */
function applyTheme(theme) {
    const root = document.documentElement;
    const colors = THEME_COLORS[theme];
    
    Object.entries(colors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
    
    // Set data attribute for CSS targeting
    root.setAttribute('data-theme', theme);
}

/**
 * Toggle between dark and light themes
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem(THEME_KEY) || THEMES.DARK;
    const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    
    // Apply new theme
    applyTheme(newTheme);
    
    // Save preference
    localStorage.setItem(THEME_KEY, newTheme);
    
    // Update toggle button icon
    updateThemeIcon(newTheme);
    
    console.log(`🎨 Theme switched to: ${newTheme}`);
}

/**
 * Load saved theme preference from localStorage
 */
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const themeToApply = savedTheme || THEMES.DARK;
    
    applyTheme(themeToApply);
    updateThemeIcon(themeToApply);
    
    console.log(`🎨 Theme loaded: ${themeToApply}`);
}

/**
 * Update the theme toggle button icon based on current theme
 */
function updateThemeIcon(theme) {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.innerHTML = theme === THEMES.DARK ? '☀️' : '🌙';
        themeBtn.title = theme === THEMES.DARK ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
}

/**
 * Initialize theme on page load
 */
function initTheme() {
    // Load saved theme or default to dark
    loadTheme();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

// Export for use in other scripts
window.toggleTheme = toggleTheme;
window.loadTheme = loadTheme;
window.initTheme = initTheme;
