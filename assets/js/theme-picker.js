(function () {
  'use strict';

  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');
  const storageKey = 'notes-theme';
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  const lightIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
  const darkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 0 1 0 14z"/></svg>';

  if (!button) return;

  function storedTheme() {
    try {
      const theme = localStorage.getItem(storageKey);
      if (theme === 'mocha') return 'dark';
      return theme === 'light' || theme === 'dark' ? theme : null;
    } catch (e) {
      return null;
    }
  }

  function currentTheme() {
    const attr = root.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return lightQuery.matches ? 'light' : 'dark';
  }

  function render() {
    const theme = currentTheme();
    button.innerHTML = theme === 'light' ? lightIcon : darkIcon;
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    button.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {}
    render();
    window.dispatchEvent(new CustomEvent('notes-theme-change', { detail: { theme } }));
  }

  const saved = storedTheme();
  if (saved) {
    setTheme(saved);
  } else {
    render();
  }

  button.addEventListener('click', () => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  darkQuery.addEventListener('change', () => {
    if (!storedTheme()) render();
  });
})();
